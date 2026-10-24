import type JSZip from 'jszip';
import { db } from './db';
import type { BaseRecord, Photo } from './types';
import { settingsRepo } from './repo';

/*
 * 백업 파일(.zip) 구조
 *   data.json            모든 기록(지운 기록 표시 포함)과 사진 정보
 *   photos/<id>.jpg      사진
 *   photos/<id>_t.jpg    썸네일
 * 불러올 때는 덮어쓰지 않고 합친다. 같은 기록이 양쪽에 있으면 더 나중에 고친 쪽을 남긴다.
 * 그래서 폰 → PC, PC → 폰으로 번갈아 옮겨도 데이터가 사라지지 않는다.
 */

const BACKUP_VERSION = 1;
export const LAST_BACKUP_KEY = 'lastBackupAt';

// 백업할 때만 필요한 라이브러리라 그때 불러온다(첫 화면이 빨리 뜨도록).
const loadJSZip = async () => (await import('jszip')).default;

type PhotoMeta = Omit<Photo, 'blob' | 'thumb'>;

interface BackupData {
  app: 'craftee';
  version: number;
  exportedAt: number;
  projects: BaseRecord[];
  progressLogs: BaseRecord[];
  materials: BaseRecord[];
  /** 작품 종류를 추가할 수 있게 된 뒤의 백업에만 있다. */
  categories?: BaseRecord[];
  materialTypes?: BaseRecord[];
  photos: PhotoMeta[];
}

export async function exportBackup(): Promise<Blob> {
  const [projects, progressLogs, materials, categories, materialTypes, photos] = await Promise.all([
    db.projects.toArray(),
    db.progressLogs.toArray(),
    db.materials.toArray(),
    db.categories.toArray(),
    db.materialTypes.toArray(),
    db.photos.toArray(),
  ]);

  const data: BackupData = {
    app: 'craftee',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    projects,
    progressLogs,
    materials,
    categories,
    materialTypes,
    photos: photos.map(({ blob: _blob, thumb: _thumb, ...meta }) => meta),
  };

  const zip = new (await loadJSZip())();
  zip.file('data.json', JSON.stringify(data));
  const folder = zip.folder('photos')!;
  for (const p of photos) {
    folder.file(`${p.id}.jpg`, p.blob);
    folder.file(`${p.id}_t.jpg`, p.thumb);
  }
  // 사진은 이미 압축돼 있어서 다시 압축하지 않는다(더 빠름).
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  await settingsRepo.set(LAST_BACKUP_KEY, Date.now());
  return blob;
}

export interface ImportResult {
  records: number;
  photos: number;
}

export async function importBackup(file: Blob): Promise<ImportResult> {
  let zip: JSZip;
  try {
    zip = await (await loadJSZip()).loadAsync(file);
  } catch {
    throw new Error('zip 파일을 열 수 없어요. Craftee에서 만든 백업 파일인지 확인해 주세요.');
  }
  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('Craftee 백업 파일이 아니에요.');
  const data = JSON.parse(await dataFile.async('string')) as BackupData;
  if (data.app !== 'craftee') throw new Error('Craftee 백업 파일이 아니에요.');
  if (data.version > BACKUP_VERSION) {
    throw new Error('더 새로운 버전의 앱에서 만든 백업이에요. 앱을 새로고침한 뒤 다시 시도해 주세요.');
  }

  // 사진 파일은 트랜잭션 밖에서 먼저 읽어 둔다(트랜잭션 안에서 오래 기다리면 끊긴다).
  const existingPhotoIds = new Set(await db.photos.toCollection().primaryKeys());
  const newPhotos: Photo[] = [];
  for (const meta of data.photos) {
    if (existingPhotoIds.has(meta.id)) continue;
    const full = zip.file(`photos/${meta.id}.jpg`);
    const thumb = zip.file(`photos/${meta.id}_t.jpg`);
    if (!full || !thumb) continue;
    const [fullBuf, thumbBuf] = await Promise.all([full.async('arraybuffer'), thumb.async('arraybuffer')]);
    newPhotos.push({
      ...meta,
      blob: new Blob([fullBuf], { type: 'image/jpeg' }),
      thumb: new Blob([thumbBuf], { type: 'image/jpeg' }),
    });
  }

  let records = 0;
  await db.transaction('rw', [db.projects, db.progressLogs, db.materials, db.categories, db.materialTypes, db.photos], async () => {
    await db.photos.bulkPut(newPhotos);
    const tables = [
      [db.projects, data.projects],
      [db.progressLogs, data.progressLogs],
      [db.materials, data.materials],
      [db.categories, data.categories ?? []],
      [db.materialTypes, data.materialTypes ?? []],
    ] as const;
    for (const [table, incoming] of tables) {
      const current = await table.bulkGet(incoming.map((r) => r.id));
      // 테이블마다 기록 타입이 달라서 공통 필드(BaseRecord)만 보고 비교한다.
      const newer = incoming.filter((r, i) => !current[i] || r.updatedAt > current[i]!.updatedAt);
      await (table as unknown as { bulkPut(items: BaseRecord[]): Promise<unknown> }).bulkPut(newer);
      records += newer.length;
    }
  });

  return { records, photos: newPhotos.length };
}
