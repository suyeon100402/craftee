import type { ReactNode } from 'react';
import { ThemeMascot } from '../theme/mascots';
import s from './components.module.css';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={s.empty}>
      <ThemeMascot />
      <p className={s.emptyTitle}>{title}</p>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
