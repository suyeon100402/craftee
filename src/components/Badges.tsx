import type { ProjectStatus } from '../data/types';
import { statusMeta } from '../data/meta';
import { useCategories, useMaterialTypes } from '../data/categories';

/** category: 작품 종류 id */
export function CategoryBadge({ category }: { category: string }) {
  const c = useCategories().get(category);
  return (
    <span className="badge" style={{ background: `var(--cat-${c.color})`, color: `var(--cat-${c.color}-ink)` }}>
      {c.emoji} {c.name}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const m = statusMeta(status);
  return (
    <span className="badge" style={{ background: `var(--status-${status})`, color: `var(--status-${status}-ink)` }}>
      {m.label}
    </span>
  );
}

/** type: 재료 종류 id */
export function MaterialTypeBadge({ type }: { type: string }) {
  const t = useMaterialTypes().get(type);
  return (
    <span className="badge" style={{ background: `var(--cat-${t.color})`, color: `var(--cat-${t.color}-ink)` }}>
      {t.emoji} {t.name}
    </span>
  );
}
