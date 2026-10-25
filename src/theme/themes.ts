/*
 * 테마 목록.
 * 테마를 추가하려면:
 *   1. src/styles/themes/에 CSS 파일을 만들고(pastel.css를 복사해서 색만 바꾸면 된다) global.css에서 import한다.
 *   2. 아래 THEMES에 한 줄 추가한다. 캐릭터 테마는 mascot(src/theme/mascots.tsx의 이름)도 적는다.
 *   배경 무늬는 CSS 파일에서 --bg-pattern / --bg-pattern-size 로 바꿀 수 있다.
 */

export type ThemeGroup = 'basic' | 'character';

export const THEME_GROUPS: { id: ThemeGroup; name: string; description: string }[] = [
  { id: 'basic', name: '기본 테마', description: '깔끔한 색 조합' },
  { id: 'character', name: '캐릭터 테마', description: '직접 만든 캐릭터와 함께' },
];

export interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  group: ThemeGroup;
  swatches: string[];
  /** 캐릭터 그림 이름(없으면 기본 털실 친구) */
  mascot?: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'pastel',
    name: '파스텔',
    description: '몽글몽글한 기본 테마',
    group: 'basic',
    swatches: ['#fbf6f1', '#f5afc2', '#ebe3fb', '#dbf2e8', '#fff0c4'],
  },
  {
    id: 'cream',
    name: '크림 라떼',
    description: '따뜻한 베이지와 우드톤',
    group: 'basic',
    swatches: ['#f7f1e6', '#e8cba3', '#f4dccb', '#dce6d2', '#e9dfd2'],
  },
  {
    id: 'night',
    name: '밤 파스텔',
    description: '눈이 편한 어두운 파스텔',
    group: 'basic',
    swatches: ['#24212b', '#f4abc3', '#3c3453', '#2c4640', '#4a4229'],
  },
];

export type ThemeId = string;

const STORAGE_KEY = 'craftee-theme';
const DEFAULT_THEME = 'pastel';

export const themeInfo = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export function getStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (THEMES.some((t) => t.id === value)) return value!;
  } catch {
    // 저장소를 못 쓰는 환경이면 기본 테마로 둔다.
  }
  return DEFAULT_THEME;
}

// ---------- 지금 테마를 화면에 알려주기 ----------

let current: ThemeId = DEFAULT_THEME;
const listeners = new Set<() => void>();

export const getCurrentTheme = () => current;
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyTheme(id: ThemeId) {
  current = themeInfo(id).id;
  document.documentElement.dataset.theme = current;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // 무시: 이번 방문 동안만 적용된다.
  }
  listeners.forEach((l) => l());
}
