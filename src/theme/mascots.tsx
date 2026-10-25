import { useSyncExternalStore, type ReactElement } from 'react';
import { getCurrentTheme, subscribeTheme, themeInfo } from './themes';

/*
 * 테마마다 나오는 캐릭터 그림.
 * 빈 화면, 홈 인사, 사이드바 로고 자리에 쓰인다. 색은 테마 변수(var(--…))를 써서 테마와 어울리게 한다.
 * 새 캐릭터를 추가하려면 아래 MASCOTS에 SVG를 하나 더 넣고, themes.ts의 테마에 mascot 이름을 적는다.
 */

/** 기본 테마의 털실 친구 */
function YarnBuddy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <clipPath id="yarn-buddy-clip">
          <circle cx="60" cy="64" r="38" />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="108" rx="34" ry="5" fill="var(--bg-deco)" />
      <circle cx="60" cy="64" r="38" fill="var(--cat-pink)" />
      <g clipPath="url(#yarn-buddy-clip)" fill="none" stroke="var(--surface)" strokeWidth="3.5" strokeLinecap="round">
        <path d="M20 48 C 40 58, 76 58, 102 44" />
        <path d="M20 62 C 42 72, 80 70, 104 58" />
        <path d="M24 78 C 44 86, 78 84, 100 74" />
        <path d="M44 24 C 34 50, 36 84, 52 106" />
        <path d="M68 24 C 60 52, 62 84, 78 106" />
      </g>
      <circle cx="48" cy="68" r="3.2" fill="var(--cat-pink-ink)" />
      <circle cx="72" cy="68" r="3.2" fill="var(--cat-pink-ink)" />
      <path d="M55 75 Q 60 79 65 75" fill="none" stroke="var(--cat-pink-ink)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M92 86 C 104 94, 108 104, 98 108" fill="none" stroke="var(--cat-pink)" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="74" y1="20" x2="104" y2="56" stroke="var(--cat-lavender-ink)" strokeWidth="3.5" strokeLinecap="round" opacity=".55" />
      <circle cx="74" cy="20" r="4.5" fill="var(--cat-lavender-ink)" opacity=".7" />
    </svg>
  );
}

export const MASCOTS: Record<string, (props: { className?: string }) => ReactElement> = {
  yarn: YarnBuddy,
};

/** 지금 테마의 이름(테마가 바뀌면 다시 그려진다) */
export function useCurrentTheme() {
  return themeInfo(useSyncExternalStore(subscribeTheme, getCurrentTheme));
}

/** 지금 테마의 캐릭터. themeId를 주면 그 테마의 캐릭터(미리보기용) */
export function ThemeMascot({ className, themeId }: { className?: string; themeId?: string }) {
  const current = useCurrentTheme();
  const theme = themeId ? themeInfo(themeId) : current;
  const Mascot = MASCOTS[theme.mascot ?? 'yarn'] ?? YarnBuddy;
  return <Mascot className={className} />;
}

/** 로고 자리: 캐릭터 테마면 캐릭터, 아니면 앱 로고 */
export function BrandMark({ className }: { className?: string }) {
  const theme = useCurrentTheme();
  if (theme.mascot && MASCOTS[theme.mascot]) {
    const Mascot = MASCOTS[theme.mascot];
    return (
      <span className={className} style={{ display: 'grid', placeItems: 'center', background: 'var(--primary-soft)' }}>
        <Mascot />
      </span>
    );
  }
  return <img src="./logo.svg" alt="" className={className} />;
}
