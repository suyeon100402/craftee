import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';
import type { BaseRecord, Photo } from '../types';
import { settingsRepo } from '../repo';
import { SUPABASE_KEY, SUPABASE_URL, isCloudConfigured } from './config';

/*
 * 클라우드 동기화 (Supabase 무료 요금제)
 *
 * 기기 안의 저장소(IndexedDB)는 그대로 쓰고, 그 사본을 서버와 맞춘다. 인터넷이 없어도 앱은 평소처럼 동작한다.
 *   1. 지운 사진을 서버에서도 지운다
 *   2. 아직 안 올린 사진을 올린다(기록보다 먼저 올려야 다른 기기가 사진을 받을 수 있다)
 *   3. 지난번 이후 고친 기록을 올린다. 서버는 더 나중에 고친 쪽만 남긴다(push_records)
 *   4. 지난번 이후 서버에 새로 생긴 기록을 받는다. 여기서도 더 나중에 고친 쪽이 이긴다
 *   5. 받은 기록에 쓰인 사진 중 이 기기에 없는 것을 내려받고, 아무 데도 안 쓰이는 사진은 지운다
 */

const SYNC_TABLES = ['projects', 'progressLogs', 'materials', 'categories', 'materialTypes'] as const;
type SyncKind = (typeof SYNC_TABLES)[number];

const PUSHED_AT_KEY = 'sync:pushedAt';
const PULLED_AT_KEY = 'sync:pulledAt';
export const LAST_SYNC_KEY = 'sync:lastAt';
const PHOTO_DELETE_QUEUE_KEY = 'craftee-photo-deletes';
const BUCKET = 'photos';
const PAGE = 1000;

// ---------- 상태(화면에 보여줄 것) ----------

export type SyncStatus =
  | { state: 'off' } // Supabase 설정 전
  | { state: 'signedOut' }
  | { state: 'idle'; email: string; lastSyncedAt: number | null }
  | { state: 'syncing'; email: string; lastSyncedAt: number | null }
  | { state: 'error'; email: string; lastSyncedAt: number | null; message: string };

let status: SyncStatus = isCloudConfigured ? { state: 'signedOut' } : { state: 'off' };
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}
export const getSyncStatus = () => status;
export function subscribeSync(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------- Supabase 연결 ----------

let clientPromise: Promise<SupabaseClient> | null = null;

/** 동기화를 쓸 때만 라이브러리를 불러온다(첫 화면이 빨리 뜨도록). */
function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'craftee-auth' },
    }),
  );
  return clientPromise;
}

async function currentUser() {
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session?.user ?? null;
}

// ---------- 로그인 ----------

/** 이메일로 로그인 코드를 보낸다. 처음이면 계정이 만들어진다. */
export async function sendLoginCode(email: string) {
  const client = await getClient();
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(friendlyError(error.message));
}

export async function verifyLoginCode(email: string, code: string) {
  const client = await getClient();
  const { error } = await client.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error) throw new Error(friendlyError(error.message));
}

/** 로그아웃해도 이 기기의 기록은 그대로 남는다. 다음에 로그인하면 처음부터 다시 맞춘다. */
export async function signOut() {
  const client = await getClient();
  await client.auth.signOut();
  await Promise.all([
    db.settings.bulkDelete([PUSHED_AT_KEY, PULLED_AT_KEY, LAST_SYNC_KEY]),
    db.syncedPhotos.clear(),
  ]);
  setStatus({ state: 'signedOut' });
}

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes')) return '코드를 너무 자주 요청했어요. 잠시 뒤에 다시 해 주세요.';
  if (m.includes('expired') || m.includes('invalid')) return '코드가 맞지 않거나 시간이 지났어요. 새 코드를 받아 주세요.';
  if (m.includes('fetch') || m.includes('network')) return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
  if (m.includes('signups not allowed')) return '새 계정을 만들 수 없게 설정돼 있어요. Supabase 설정을 확인해 주세요.';
  return message;
}

// ---------- 지운 사진 기억하기 ----------

function readDeleteQueue(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_DELETE_QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function writeDeleteQueue(ids: string[]) {
  try {
    localStorage.setItem(PHOTO_DELETE_QUEUE_KEY, JSON.stringify(ids));
  } catch {
    // 저장소를 못 쓰면 서버에 사진이 남을 뿐, 기록이 망가지지는 않는다.
  }
}

// ---------- 동기화 ----------

let running = false;
let again = false;
let applyingRemote = false;

/** 지금 바로 동기화한다. 이미 하는 중이면 끝난 뒤 한 번 더 한다. */
export async function syncNow() {
  if (!isCloudConfigured) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  const user = await currentUser().catch(() => null);
  if (!user) {
    running = false;
    setStatus({ state: 'signedOut' });
    return;
  }
  const email = user.email ?? '';
  const lastSyncedAt = (await settingsRepo.get<number>(LAST_SYNC_KEY)) ?? null;
  setStatus({ state: 'syncing', email, lastSyncedAt });

  try {
    const client = await getClient();
    await deleteRemotePhotos(client, user.id);
    await uploadPhotos(client, user.id);
    await pushRecords(client);
    await pullRecords(client);
    await downloadPhotos(client, user.id);
    const now = Date.now();
    await settingsRepo.set(LAST_SYNC_KEY, now);
    setStatus({ state: 'idle', email, lastSyncedAt: now });
  } catch (e) {
    const message = friendlyError(e instanceof Error ? e.message : String(e));
    setStatus({ state: 'error', email, lastSyncedAt, message });
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

async function deleteRemotePhotos(client: SupabaseClient, uid: string) {
  const queue = readDeleteQueue();
  if (!queue.length) return;
  const paths = queue.flatMap((id) => [`${uid}/${id}.jpg`, `${uid}/${id}_t.jpg`]);
  const { error } = await client.storage.from(BUCKET).remove(paths);
  if (error) throw error;
  // 지우는 동안 새로 쌓인 것은 남겨 둔다.
  writeDeleteQueue(readDeleteQueue().filter((id) => !queue.includes(id)));
}

async function uploadPhotos(client: SupabaseClient, uid: string) {
  const [all, synced] = await Promise.all([
    db.photos.toCollection().primaryKeys(),
    db.syncedPhotos.toCollection().primaryKeys(),
  ]);
  const done = new Set(synced);
  for (const id of all.filter((id) => !done.has(id))) {
    const photo = await db.photos.get(id);
    if (!photo) continue;
    const bucket = client.storage.from(BUCKET);
    const options = { upsert: true, contentType: 'image/jpeg' };
    const full = await bucket.upload(`${uid}/${id}.jpg`, photo.blob, options);
    if (full.error) throw full.error;
    const thumb = await bucket.upload(`${uid}/${id}_t.jpg`, photo.thumb, options);
    if (thumb.error) throw thumb.error;
    await db.syncedPhotos.put({ id });
  }
}

async function pushRecords(client: SupabaseClient) {
  const startedAt = Date.now();
  const since = (await settingsRepo.get<number>(PUSHED_AT_KEY)) ?? 0;
  const rows: { kind: SyncKind; id: string; data: BaseRecord; updated_at: number }[] = [];
  for (const kind of SYNC_TABLES) {
    const changed = await db.table<BaseRecord, string>(kind).filter((r) => r.updatedAt >= since).toArray();
    rows.push(...changed.map((data) => ({ kind, id: data.id, data, updated_at: data.updatedAt })));
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client.rpc('push_records', { rows: rows.slice(i, i + 500) });
    if (error) throw error;
  }
  // 올리는 동안 고친 기록은 다음 번에 올라가도록, 시작한 시각을 기준으로 남긴다.
  await settingsRepo.set(PUSHED_AT_KEY, startedAt);
}

async function pullRecords(client: SupabaseClient) {
  let cursor = (await settingsRepo.get<string>(PULLED_AT_KEY)) ?? '1970-01-01T00:00:00Z';
  for (;;) {
    const { data, error } = await client
      .from('records')
      .select('kind, id, data, updated_at, server_updated_at')
      .gte('server_updated_at', cursor)
      .order('server_updated_at', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    if (!data.length) break;

    applyingRemote = true;
    try {
      await db.transaction('rw', SYNC_TABLES.map((k) => db.table(k)), async () => {
        for (const row of data) {
          if (!SYNC_TABLES.includes(row.kind)) continue;
          const table = db.table<BaseRecord, string>(row.kind);
          const local = await table.get(row.id);
          if (!local || Number(row.updated_at) > local.updatedAt) await table.put(row.data as BaseRecord);
        }
      });
    } finally {
      applyingRemote = false;
    }

    const last = data[data.length - 1].server_updated_at as string;
    await settingsRepo.set(PULLED_AT_KEY, last);
    if (data.length < PAGE || last === cursor) break;
    cursor = last;
  }
}

/** 기록에서 쓰고 있는 사진 id 전부(휴지통 안의 것 포함, 영구 삭제한 것 제외) */
async function referencedPhotoIds(): Promise<Set<string>> {
  const [projects, logs, materials] = await Promise.all([
    db.projects.toArray(),
    db.progressLogs.toArray(),
    db.materials.toArray(),
  ]);
  return new Set(
    [...projects, ...logs, ...materials].filter((r) => !r.purgedAt).flatMap((r) => r.photoIds),
  );
}

async function downloadPhotos(client: SupabaseClient, uid: string) {
  const referenced = await referencedPhotoIds();
  const local = new Set(await db.photos.toCollection().primaryKeys());
  const bucket = client.storage.from(BUCKET);

  for (const id of referenced) {
    if (local.has(id)) continue;
    const [full, thumb] = await Promise.all([bucket.download(`${uid}/${id}.jpg`), bucket.download(`${uid}/${id}_t.jpg`)]);
    // 아직 다른 기기에서 다 안 올라왔으면 다음 번에 다시 받는다.
    if (full.error || thumb.error || !full.data || !thumb.data) continue;
    const size = await imageSize(full.data);
    const photo: Photo = {
      id,
      blob: new Blob([full.data], { type: 'image/jpeg' }),
      thumb: new Blob([thumb.data], { type: 'image/jpeg' }),
      ...size,
      createdAt: Date.now(),
    };
    applyingRemote = true;
    try {
      await db.transaction('rw', db.photos, db.syncedPhotos, async () => {
        await db.photos.put(photo);
        await db.syncedPhotos.put({ id });
      });
    } finally {
      applyingRemote = false;
    }
  }

  // 다른 기기에서 지워서 이제 아무 기록에도 안 쓰이는 사진은 이 기기에서도 지운다.
  // 그사이에 새로 저장한 사진을 실수로 지우지 않게, 기록과 사진을 한 트랜잭션 안에서 다시 확인한다.
  applyingRemote = true;
  try {
    await db.transaction('rw', [db.photos, db.syncedPhotos, db.projects, db.progressLogs, db.materials], async () => {
      const stillUsed = await referencedPhotoIds();
      const orphans = (await db.photos.toCollection().primaryKeys()).filter((id) => !stillUsed.has(id));
      if (!orphans.length) return;
      await db.photos.bulkDelete(orphans);
      await db.syncedPhotos.bulkDelete(orphans);
    });
  } finally {
    applyingRemote = false;
  }
}

async function imageSize(blob: Blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

// ---------- 언제 동기화할지 ----------

let debounce: number | undefined;

/** 기록을 고치면 몇 초 뒤에 동기화한다(연달아 고치면 한 번만). */
function scheduleSync() {
  if (applyingRemote || status.state === 'signedOut' || status.state === 'off') return;
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => void syncNow(), 3000);
}

/** 앱을 켤 때 한 번 부른다. */
export async function initSync() {
  if (!isCloudConfigured) return;

  for (const kind of SYNC_TABLES) {
    const table = db.table(kind);
    table.hook('creating', scheduleSync);
    table.hook('updating', scheduleSync);
    table.hook('deleting', scheduleSync);
  }
  db.photos.hook('creating', scheduleSync);
  // 사진을 지우면 서버에서도 지우도록 기억해 둔다.
  db.photos.hook('deleting', (id) => {
    if (applyingRemote) return;
    writeDeleteQueue([...new Set([...readDeleteQueue(), id as string])]);
    scheduleSync();
  });

  const client = await getClient();
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') void syncNow();
    if (event === 'SIGNED_OUT') setStatus({ state: 'signedOut' });
  });

  // 앱으로 돌아왔을 때, 인터넷이 다시 연결됐을 때, 켜 둔 동안 3분마다
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  window.addEventListener('online', () => void syncNow());
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 3 * 60_000);

  await syncNow();
}
