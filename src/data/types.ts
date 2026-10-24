export type ProjectStatus = 'planned' | 'in_progress' | 'done';
/**
 * 모든 기록이 공통으로 갖는 필드.
 * updatedAt / deletedAt은 나중에 클라우드 동기화나 백업 병합에서 어느 쪽이 최신인지 가리는 데 쓴다.
 * 날짜(YYYY-MM-DD)가 아닌 시각은 모두 밀리초 타임스탬프다.
 */
export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  /** 휴지통에서 영구 삭제한 시각. deletedAt만 있고 이게 없으면 휴지통에 있는 상태다. */
  purgedAt?: number | null;
}

export interface Project extends BaseRecord {
  title: string;
  /** Category의 id */
  category: string;
  status: ProjectStatus;
  description: string;
  tags: string[];
  /** 첫 번째 사진이 대표 사진이다. */
  photoIds: string[];
  materialIds: string[];
  links: string[];
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ProgressLog extends BaseRecord {
  projectId: string;
  date: string;
  text: string;
  photoIds: string[];
}

export interface Material extends BaseRecord {
  /** 재료 종류(Category)의 id */
  type: string;
  name: string;
  brand: string;
  color: string;
  colorHex: string | null;
  quantity: string;
  note: string;
  tags: string[];
  photoIds: string[];
}

/** 테마 파일의 --cat-<색> 변수 이름 */
export type CategoryColor = 'pink' | 'peach' | 'butter' | 'lime' | 'mint' | 'sky' | 'lavender' | 'gray';

/** 작품 종류와 재료 종류. 기본 종류도 사용자가 고치거나 지울 수 있다('기타'만 빼고). */
export interface Category extends BaseRecord {
  name: string;
  emoji: string;
  color: CategoryColor;
  /** 목록 순서(작을수록 앞) */
  order: number;
}

export interface Photo {
  id: string;
  /** 긴 변을 줄인 사진 */
  blob: Blob;
  /** 목록용 작은 사진 */
  thumb: Blob;
  width: number;
  height: number;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}
