import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Category } from './types';
import { categoriesRepo, materialTypesRepo, type CategoryRepo } from './repo';
import { DEFAULT_CATEGORIES, DEFAULT_MATERIAL_TYPES, FALLBACK_CATEGORY_ID } from './meta';

/** project: 작품 종류, material: 재료 종류 */
export type CategoryKind = 'project' | 'material';

export const CATEGORY_REPOS: Record<CategoryKind, CategoryRepo> = {
  project: categoriesRepo,
  material: materialTypesRepo,
};

interface CategoriesValue {
  list: Category[];
  /** id로 종류를 찾는다. 없으면(지워졌거나 다른 기기 백업) '기타'를 돌려준다. */
  get: (id: string) => Category;
}

const CategoriesContext = createContext<Record<CategoryKind, CategoriesValue> | null>(null);

function fallbackOf(defaults: typeof DEFAULT_CATEGORIES): Category {
  return { ...defaults.find((c) => c.id === FALLBACK_CATEGORY_ID)!, createdAt: 0, updatedAt: 0, deletedAt: null };
}
const FALLBACKS: Record<CategoryKind, Category> = {
  project: fallbackOf(DEFAULT_CATEGORIES),
  material: fallbackOf(DEFAULT_MATERIAL_TYPES),
};

function toValue(list: Category[], kind: CategoryKind): CategoriesValue {
  const byId = new Map(list.map((c) => [c.id, c]));
  return { list, get: (id) => byId.get(id) ?? byId.get(FALLBACK_CATEGORY_ID) ?? FALLBACKS[kind] };
}

/** 작품·재료 종류를 한 번만 불러와서 앱 전체에 나눠준다(카드마다 따로 불러오지 않도록). */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const projectList = useLiveQuery(() => categoriesRepo.list(), []);
  const materialList = useLiveQuery(() => materialTypesRepo.list(), []);

  const value = useMemo(
    () =>
      projectList && materialList
        ? { project: toValue(projectList, 'project'), material: toValue(materialList, 'material') }
        : null,
    [projectList, materialList],
  );

  // 종류를 불러오기 전에는 화면을 그리지 않는다(잠깐 '기타'로 보였다가 바뀌는 걸 막음).
  if (!value) return null;
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(kind: CategoryKind = 'project'): CategoriesValue {
  const value = useContext(CategoriesContext);
  if (!value) throw new Error('CategoriesProvider 안에서만 쓸 수 있어요.');
  return value[kind];
}

export const useMaterialTypes = () => useCategories('material');
