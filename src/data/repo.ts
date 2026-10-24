import type { EntityTable } from 'dexie';
import { db } from './db';
import type { BaseRecord, Category, Material, Photo, ProgressLog, Project } from './types';
import { FALLBACK_CATEGORY_ID } from './meta';
import { newId } from '../lib/id';

/*
 * 화면은 데이터를 이 파일의 함수로만 읽고 쓴다.
 * 지금은 기기 안(IndexedDB)에만 저장한다. 나중에 클라우드 동기화를 붙일 때는
 * 이 저장소를 로컬 사본으로 두고, updatedAt / deletedAt을 기준으로 서버와 맞추는 계층을 여기에 더한다.
 * 그래서 기록은 바로 지우지 않고 deletedAt을 찍어 둔다(사진 파일은 용량 때문에 바로 지운다).
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

  async remove(id: string) {
    await db.transaction('rw', db.projects, db.progressLogs, db.photos, async () => {
      const project = await db.projects.get(id);
      if (!project) return;
      const now = Date.now();
      const logs = await db.progressLogs.where('projectId').equals(id).toArray();
      const photoIds = [...project.photoIds, ...logs.flatMap((l) => l.photoIds)];
      await db.photos.bulkDelete(photoIds);
      await db.progressLogs.bulkPut(logs.map((l) => ({ ...l, photoIds: [], deletedAt: now, updatedAt: now })));
      await db.projects.put({ ...project, photoIds: [], deletedAt: now, updatedAt: now });
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

  async remove(id: string) {
    await db.transaction('rw', db.materials, db.photos, async () => {
      const material = await db.materials.get(id);
      if (!material) return;
      const now = Date.now();
      await db.photos.bulkDelete(material.photoIds);
      await db.materials.put({ ...material, photoIds: [], deletedAt: now, updatedAt: now });
    });
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
