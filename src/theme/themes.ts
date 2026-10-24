// 테마를 추가하려면: src/styles/themes/에 CSS 파일을 만들고, global.css에서 import한 뒤 여기에 한 줄 추가한다.
export const THEMES = [
  {
    id: 'pastel',
    name: '파스텔',
    description: '몽글몽글한 기본 테마',
    swatches: ['#fbf6f1', '#f5afc2', '#ebe3fb', '#dbf2e8', '#fff0c4'],
  },
  {
    id: 'cream',
    name: '크림 라떼',
    description: '따뜻한 베이지와 우드톤',
    swatches: ['#f7f1e6', '#e8cba3', '#f4dccb', '#dce6d2', '#e9dfd2'],
  },
  {
    id: 'night',
    name: '밤 파스텔',
    description: '눈이 편한 어두운 파스텔',
    swatches: ['#24212b', '#f4abc3', '#3c3453', '#2c4640', '#4a4229'],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const STORAGE_KEY = 'craftee-theme';

export function getStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (THEMES.some((t) => t.id === value)) return value as ThemeId;
  } catch {
    // 저장소를 못 쓰는 환경이면 기본 테마로 둔다.
  }
  return 'pastel';
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 무시: 이번 방문 동안만 적용된다.
  }
}
