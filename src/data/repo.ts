import type { EntityTable } from 'dexie';
import { db } from './db';
import type { BaseRecord, Category, Material, Photo, ProgressLog, Project } from './types';
import { FALLBACK_CATEGORY_ID } from './meta';
import { newId } from '../lib/id';

/*
 * 화면은 데이터를 이 파일의 함수로만 읽고 쓴다.
 * 지금은 기기 안(IndexedDB)에만 저장한다. 나중에 클라우드 동기화를 붙일 때는
 * 이 저장소를 로컬 사본으로 두고, updatedAt / deletedAt을 기준으로 서버와 맞추는 계층을 여기에 더한다.
 * 그래서 기록은 바로 지우지 않고 deletedAt을 찍어 둔다.
 * 작품·재료는 지우면 휴지통으로 가고(사진도 남겨 둠), 영구 삭제할 때 사진 파일을 지우고 purgedAt을 찍는다.
 */

export interface PhotoChanges {
  added: Photo[];
  removedIds: string[];
}

const alive = <T extends BaseRecord>(r: T | undefined): T | undefined =>
  r && !r.deletedAt ? r : undefined;

export function newBase(): BaseRecord {
  const now = Date.now();
  return { id: newId(), createdAt: now, updatedAt: now, deletedAt: null };
}

async function applyPhotoChanges(changes?: PhotoChanges) {
  if (!changes) return;
  if (changes.added.length) await db.photos.bulkPut(changes.added);
  if (changes.removedIds.length) await db.photos.bulkDelete(changes.removedIds);
}

export const projectsRepo = {
  async list(): Promise<Project[]> {
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    return all.filter((p) => !p.deletedAt);
  },

  async get(id: string) {
    return alive(await db.projects.get(id));
  },

  async save(project: Project, photos?: PhotoChanges) {
    await db.transaction('rw', db.projects, db.photos, async () => {
      await applyPhotoChanges(photos);
      await db.projects.put({ ...project, updatedAt: Date.now() });
    });
  },

  async update(id: string, patch: Partial<Project>) {
    await db.projects.update(id, { ...patch, updatedAt: Date.now() });
  },

  /** 휴지통으로 옮긴다. 진행 기록도 같은 시각으로 함께 옮겨서, 복구할 때 같이 돌아오게 한다. */
  async remove(id: string) {
    await db.transaction('rw', db.projects, db.progressLogs, async () => {
      const now = Date.now();
      await db.progressLogs
        .where('projectId')
        .equals(id)
        .filter((l) => !l.deletedAt)
        .modify({ deletedAt: now, updatedAt: now });
      await db.projects.update(id, { deletedAt: now, updatedAt: now });
    });
  },
};

export const progressLogsRepo = {
  async listByProject(projectId: string): Promise<ProgressLog[]> {
    const logs = await db.progressLogs.where('projectId').equals(projectId).toArray();
    return logs
      .filter((l) => !l.deletedAt)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  },

  async save(log: ProgressLog, photos?: PhotoChanges) {
    await db.transaction('rw', db.progressLogs, db.projects, db.photos, async () => {
      await applyPhotoChanges(photos);
      await db.progressLogs.put({ ...log, updatedAt: Date.now() });
      // 작품 목록에서 최근에 손댄 작품이 위로 오도록 작품의 수정 시각도 갱신한다.
      await db.projects.update(log.projectId, { updatedAt: Date.now() });
    });
  },

  async remove(id: string) {
    await db.transaction('rw', db.progressLogs, db.photos, async () => {
      const log = await db.progressLogs.get(id);
      if (!log) return;
      const now = Date.now();
      await db.photos.bulkDelete(log.photoIds);
      await db.progressLogs.put({ ...log, photoIds: [], deletedAt: now, updatedAt: now });
    });
  },
};

export const materialsRepo = {
  async list(): Promise<Material[]> {
    const all = await db.materials.orderBy('updatedAt').reverse().toArray();
    return all.filter((m) => !m.deletedAt);
  },

  async get(id: string) {
    return alive(await db.materials.get(id));
  },

  async save(material: Material, photos?: PhotoChanges) {
    await db.transaction('rw', db.materials, db.photos, async () => {
      await applyPhotoChanges(photos);
      await db.materials.put({ ...material, updatedAt: Date.now() });
    });
  },

  /** 휴지통으로 옮긴다. */
  async remove(id: string) {
    const now = Date.now();
    await db.materials.update(id, { deletedAt: now, updatedAt: now });
  },
};

/**
 * 작품 종류와 재료 종류는 생김새가 같아서 같은 코드로 다룬다.
 * usageTable/usageField: 이 종류를 쓰는 기록이 있는 표와 그 필드(지울 때 '기타'로 옮기는 대상)
 */
function makeCategoryRepo(
  table: EntityTable<Category, 'id'>,
  usageTable: 'projects' | 'materials',
  usageField: 'category' | 'type',
) {
  const usage = () => db.table(usageTable);
  return {
    async list(): Promise<Category[]> {
      const all = await table.orderBy('order').toArray();
      return all.filter((c) => !c.deletedAt);
    },

    async save(category: Category) {
      await table.put({ ...category, updatedAt: Date.now() });
    },

    /** 순서를 바꿀 때: 넘겨받은 순서대로 order를 다시 매긴다. */
    async reorder(ids: string[]) {
      const now = Date.now();
      await db.transaction('rw', table, async () => {
        for (const [order, id] of ids.entries()) await table.update(id, { order, updatedAt: now });
      });
    },

    /** 종류를 지우면 그 종류였던 기록은 '기타'로 옮긴다. */
    async remove(id: string) {
      if (id === FALLBACK_CATEGORY_ID) return;
      await db.transaction('rw', table, usage(), async () => {
        const now = Date.now();
        await usage().where(usageField).equals(id).modify({ [usageField]: FALLBACK_CATEGORY_ID, updatedAt: now });
        await table.update(id, { deletedAt: now, updatedAt: now });
      });
    },

    /** 이 종류인 기록 수 */
    async countUsage(id: string) {
      return (await usage().where(usageField).equals(id).toArray()).filter((r: BaseRecord) => !r.deletedAt).length;
    },
  };
}

export type CategoryRepo = ReturnType<typeof makeCategoryRepo>;
export const categoriesRepo = makeCategoryRepo(db.categories, 'projects', 'category');
export const materialTypesRepo = makeCategoryRepo(db.materialTypes, 'materials', 'type');

export const TRASH_KEEP_DAYS = 30;

export type TrashItem = { kind: 'project'; record: Project } | { kind: 'material'; record: Material };

const inTrash = (r: BaseRecord) => !!r.deletedAt && !r.purgedAt;

export const trashRepo = {
  /** 휴지통에 있는 작품과 재료(최근에 지운 순) */
  async list(): Promise<TrashItem[]> {
    const [projects, materials] = await Promise.all([db.projects.toArray(), db.materials.toArray()]);
    const items: TrashItem[] = [
      ...projects.filter(inTrash).map((record) => ({ kind: 'project' as const, record })),
      ...materials.filter(inTrash).map((record) => ({ kind: 'material' as const, record })),
    ];
    return items.sort((a, b) => b.record.deletedAt! - a.record.deletedAt!);
  },

  async restore(item: TrashItem) {
    const now = Date.now();
    if (item.kind === 'material') {
      await db.materials.update(item.record.id, { deletedAt: null, updatedAt: now });
      return;
    }
    const { id, deletedAt } = item.record;
    await db.transaction('rw', db.projects, db.progressLogs, async () => {
      // 작품과 함께 휴지통에 들어간 진행 기록만 되살린다(그 전에 따로 지운 기록은 그대로).
      await db.progressLogs
        .where('projectId')
        .equals(id)
        .filter((l) => l.deletedAt === deletedAt && !l.purgedAt)
        .modify({ deletedAt: null, updatedAt: now });
      await db.projects.update(id, { deletedAt: null, updatedAt: now });
    });
  },

  /** 영구 삭제: 사진 파일까지 지운다. 기록 자체는 동기화·백업 병합을 위해 '지웠음' 표시로 남긴다. */
  async purge(item: TrashItem) {
    const now = Date.now();
    if (item.kind === 'material') {
      await db.transaction('rw', db.materials, db.photos, async () => {
        await db.photos.bulkDelete(item.record.photoIds);
        await db.materials.update(item.record.id, { photoIds: [], purgedAt: now, updatedAt: now });
      });
      return;
    }
    await db.transaction('rw', db.projects, db.progressLogs, db.photos, async () => {
      const logs = (await db.progressLogs.where('projectId').equals(item.record.id).toArray()).filter((l) => !l.purgedAt);
      await db.photos.bulkDelete([...item.record.photoIds, ...logs.flatMap((l) => l.photoIds)]);
      await db.progressLogs.bulkPut(
        logs.map((l) => ({ ...l, photoIds: [], deletedAt: l.deletedAt ?? now, purgedAt: now, updatedAt: now })),
      );
      await db.projects.update(item.record.id, { photoIds: [], purgedAt: now, updatedAt: now });
    });
  },

  async purgeAll() {
    for (const item of await this.list()) await this.purge(item);
  },

  /** 지운 지 TRASH_KEEP_DAYS일이 지난 것은 자동으로 영구 삭제한다(앱을 열 때 실행). */
  async purgeExpired() {
    const limit = Date.now() - TRASH_KEEP_DAYS * 86_400_000;
    for (const item of await this.list()) {
      if (item.record.deletedAt! < limit) await this.purge(item);
    }
  },
};

export const photosRepo = {
  get(id: string) {
    return db.photos.get(id);
  },
};

export const settingsRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await db.settings.get(key))?.value as T | undefined;
  },
  async set(key: string, value: unknown) {
    await db.settings.put({ key, value });
  },
};
