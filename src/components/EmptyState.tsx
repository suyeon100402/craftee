import type { ReactNode } from 'react';
import s from './components.module.css';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={s.empty}>
      <YarnBuddy />
      <p className={s.emptyTitle}>{title}</p>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}

/** 빈 화면에 나오는 털실 친구 */
function YarnBuddy() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
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
