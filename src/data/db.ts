import Dexie, { type EntityTable, type Transaction } from 'dexie';
import type { Category, Material, Photo, ProgressLog, Project, Setting } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_MATERIAL_TYPES } from './meta';

// 브라우저(IndexedDB) 안의 저장소. 화면 코드는 여기를 직접 쓰지 말고 repo.ts를 거친다.
export const db = new Dexie('craftee') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  progressLogs: EntityTable<ProgressLog, 'id'>;
  materials: EntityTable<Material, 'id'>;
  photos: EntityTable<Photo, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  categories: EntityTable<Category, 'id'>;
  materialTypes: EntityTable<Category, 'id'>;
};

db.version(1).stores({
  projects: 'id, status, category, updatedAt, *tags',
  progressLogs: 'id, projectId, date, updatedAt',
  materials: 'id, type, updatedAt, *tags',
  photos: 'id',
  settings: 'key',
});

// v2: 작품 종류를 사용자가 추가할 수 있게 표로 옮겼다.
db.version(2)
  .stores({ categories: 'id, order' })
  .upgrade((tx) => seed(tx, 'categories', DEFAULT_CATEGORIES));

// v3: 재료 종류도 사용자가 추가할 수 있게 표로 옮겼다.
db.version(3)
  .stores({ materialTypes: 'id, order' })
  .upgrade((tx) => seed(tx, 'materialTypes', DEFAULT_MATERIAL_TYPES));

// 처음 설치할 때(업그레이드가 아니라 새로 만들 때)
db.on('populate', async (tx) => {
  await seed(tx, 'categories', DEFAULT_CATEGORIES);
  await seed(tx, 'materialTypes', DEFAULT_MATERIAL_TYPES);
});

async function seed(tx: Transaction, table: string, defaults: Pick<Category, 'id' | 'name' | 'emoji' | 'color' | 'order'>[]) {
  const now = Date.now();
  // updatedAt을 0으로 둬서, 다른 기기의 백업을 합칠 때 사용자가 고친 쪽이 항상 이기게 한다.
  await tx.table(table).bulkPut(defaults.map((c) => ({ ...c, createdAt: now, updatedAt: 0, deletedAt: null })));
}
