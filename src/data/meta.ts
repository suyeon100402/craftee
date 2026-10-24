import type { Category, CategoryColor, ProjectStatus } from './types';

/** 작품 종류에 고를 수 있는 색. 실제 색 값은 테마 파일(--cat-<색>)에 있다. */
export const CATEGORY_COLORS: CategoryColor[] = ['pink', 'peach', 'butter', 'lime', 'mint', 'sky', 'lavender', 'gray'];

/** 지울 수 없는 기본 종류('기타'). 종류를 지우면 그 기록들은 여기로 옮겨진다. 작품·재료 종류 모두 같은 id를 쓴다. */
export const FALLBACK_CATEGORY_ID = 'other';

/** 처음 설치할 때 만들어지는 종류. id가 고정이라 예전 기록과 백업도 그대로 연결된다. */
export const DEFAULT_CATEGORIES: Pick<Category, 'id' | 'name' | 'emoji' | 'color' | 'order'>[] = [
  { id: 'knitting', name: '뜨개질', emoji: '🧶', color: 'pink', order: 0 },
  { id: 'blocks', name: '블록', emoji: '🧱', color: 'butter', order: 1 },
  { id: 'doll', name: '인형', emoji: '🧸', color: 'lavender', order: 2 },
  { id: FALLBACK_CATEGORY_ID, name: '기타', emoji: '✨', color: 'mint', order: 99 },
];

/** 종류를 만들 때 눌러서 고를 수 있는 이모지 */
export const EMOJI_SUGGESTIONS = [
  '🧶', '🧵', '🪡', '🧸', '🧱', '🧩', '✂️', '🎀',
  '🪆', '🪵', '🎨', '🖌️', '🕯️', '💍', '📿', '🧺',
  '🌸', '🍰', '🪴', '🐰', '🐻', '🏠', '👗', '✨',
];

export const STATUSES: { value: ProjectStatus; label: string; emoji: string }[] = [
  { value: 'planned', label: '계획', emoji: '💭' },
  { value: 'in_progress', label: '진행 중', emoji: '🪡' },
  { value: 'done', label: '완성', emoji: '🎉' },
];

/** 처음 설치할 때 만들어지는 재료 종류. id가 고정이라 예전 기록과 백업도 그대로 연결된다. */
export const DEFAULT_MATERIAL_TYPES: Pick<Category, 'id' | 'name' | 'emoji' | 'color' | 'order'>[] = [
  { id: 'yarn', name: '실', emoji: '🧶', color: 'pink', order: 0 },
  { id: 'needle', name: '바늘', emoji: '🪡', color: 'lavender', order: 1 },
  { id: 'block', name: '블록', emoji: '🧱', color: 'butter', order: 2 },
  { id: 'fabric', name: '원단', emoji: '🧵', color: 'peach', order: 3 },
  { id: 'stuffing', name: '솜', emoji: '☁️', color: 'sky', order: 4 },
  { id: 'notion', name: '부자재', emoji: '🔘', color: 'gray', order: 5 },
  { id: 'tool', name: '도구', emoji: '✂️', color: 'mint', order: 6 },
  { id: FALLBACK_CATEGORY_ID, name: '기타', emoji: '📦', color: 'lime', order: 99 },
];

export const statusMeta = (value: ProjectStatus) =>
  STATUSES.find((s) => s.value === value) ?? STATUSES[0];
