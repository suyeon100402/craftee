import { useLiveQuery } from 'dexie-react-hooks';
import { materialsRepo, photosRepo, progressLogsRepo, projectsRepo, settingsRepo, trashRepo } from './repo';

// 데이터가 바뀌면 화면이 자동으로 다시 그려지는 훅들.
// 반환값이 undefined면 아직 불러오는 중, null이면 해당 기록이 없다는 뜻이다.

export const useProjects = () => useLiveQuery(() => projectsRepo.list(), []);

export const useProject = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await projectsRepo.get(id)) ?? null) : null), [id]);

export const useProgressLogs = (projectId: string) =>
  useLiveQuery(() => progressLogsRepo.listByProject(projectId), [projectId]);

export const useMaterials = () => useLiveQuery(() => materialsRepo.list(), []);

export const useMaterial = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await materialsRepo.get(id)) ?? null) : null), [id]);

export const usePhoto = (id: string) => useLiveQuery(() => photosRepo.get(id), [id]);

export const useSetting = <T>(key: string) =>
  useLiveQuery(async () => (await settingsRepo.get<T>(key)) ?? null, [key]);

/** 작품과 재료에 쓰인 모든 태그(가나다순) */
export function useAllTags() {
  return useLiveQuery(async () => {
    const [projects, materials] = await Promise.all([projectsRepo.list(), materialsRepo.list()]);
    const tags = new Set([...projects, ...materials].flatMap((r) => r.tags));
    return [...tags].sort((a, b) => a.localeCompare(b, 'ko'));
  }, []);
}

export const useTrash = () => useLiveQuery(() => trashRepo.list(), []);
