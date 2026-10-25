import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { THEME_GROUPS, THEMES, applyTheme, type ThemeInfo } from '../../theme/themes';
import { ThemeMascot, useCurrentTheme } from '../../theme/mascots';
import { PageHeader } from '../../components/PageHeader';
import s from './themes.module.css';

/** 설정 → 테마: 묶음별로 테마를 보고 고르는 페이지 */
export function ThemePage() {
  const current = useCurrentTheme();

  return (
    <>
      <PageHeader title="테마" back="/settings" />
      <div className={s.page}>
        {THEME_GROUPS.map((group) => {
          const themes = THEMES.filter((t) => t.group === group.id);
          return (
            <section key={group.id} className={s.group}>
              <div className={s.groupHead}>
                <h2 className="section-title">{group.id === 'basic' ? '🎨' : '🐾'} {group.name}</h2>
                <span className="muted">{group.description}</span>
              </div>
              <div className={s.grid}>
                {themes.map((t) => (
                  <ThemeCard key={t.id} theme={t} selected={current.id === t.id} />
                ))}
                {group.id === 'character' && themes.length === 0 && (
                  <div className={s.comingSoon}>
                    <span>🐣</span>
                    <strong>첫 캐릭터 테마를 같이 만드는 중이에요</strong>
                    <small>직접 정한 캐릭터로 색, 그림, 배경 무늬까지 꾸며요.</small>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/** 테마 카드: 그 테마의 색으로 작은 앱 화면을 그려서 미리 보여준다. */
function ThemeCard({ theme, selected }: { theme: ThemeInfo; selected: boolean }) {
  return (
    <button type="button" className={s.card} aria-pressed={selected} onClick={() => applyTheme(theme.id)}>
      {/* data-theme을 붙이면 이 안에서만 그 테마의 색 변수가 적용된다 */}
      <div
        className={s.preview}
        data-theme={theme.id}
        style={
          theme.pattern
            ? ({ '--bg-pattern': `url("${theme.pattern.image}")`, '--bg-pattern-size': '210px 210px' } as CSSProperties)
            : undefined
        }
      >
        <div className={s.previewBar}>
          <span className={s.previewTitle} />
          <span className={s.previewDot} />
        </div>
        <div className={s.previewBody}>
          <div className={s.previewCard}>
            <span className={s.previewThumb} style={{ background: 'var(--cat-pink)' }} />
            <span className={s.previewLine} />
          </div>
          <div className={s.previewCard}>
            <span className={s.previewThumb} style={{ background: 'var(--cat-mint)' }} />
            <span className={s.previewLine} />
          </div>
        </div>
        <ThemeMascot themeId={theme.id} className={s.previewMascot} />
        <span className={s.previewFab}>+</span>
      </div>
      <div className={s.info}>
        <span className={s.name}>
          {theme.name}
          {selected && (
            <span className={s.check} aria-label="사용 중">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
        </span>
        <span className={s.desc}>{theme.description}</span>
      </div>
    </button>
  );
}
