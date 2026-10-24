import { RotateCcw, Trash2 } from 'lucide-react';
import { useTrash } from '../../data/hooks';
import { TRASH_KEEP_DAYS, trashRepo, type TrashItem } from '../../data/repo';
import { useMaterialTypes } from '../../data/categories';
import { daysSince } from '../../lib/date';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { CategoryBadge, MaterialTypeBadge } from '../../components/Badges';
import { PhotoImg } from '../../components/PhotoImg';
import { useConfirm } from '../../components/ConfirmDialog';
import { ProjectCover } from '../projects/ProjectCard';
import s from './trash.module.css';

export function TrashPage() {
  const items = useTrash();
  const confirm = useConfirm();

  const purgeAll = async () => {
    const ok = await confirm({
      title: '휴지통을 비울까요?',
      message: `${items?.length ?? 0}개가 사진까지 완전히 지워지고, 다시 되돌릴 수 없어요.`,
      confirmLabel: '모두 지우기',
      danger: true,
    });
    if (ok) await trashRepo.purgeAll();
  };

  return (
    <>
      <PageHeader
        title="휴지통"
        back="/settings"
        actions={
          items && items.length > 0 ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={purgeAll}>
              비우기
            </button>
          ) : undefined
        }
      />
      <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
        지운 작품과 재료는 {TRASH_KEEP_DAYS}일 동안 여기 있다가 자동으로 완전히 지워져요. 그 전에는 언제든 되살릴 수 있어요.
      </p>

      {items === undefined ? null : items.length === 0 ? (
        <EmptyState title="휴지통이 비어 있어요" />
      ) : (
        <ul className={s.list}>
          {items.map((item) => (
            <TrashRow key={`${item.kind}-${item.record.id}`} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}

function TrashRow({ item }: { item: TrashItem }) {
  const confirm = useConfirm();
  const materialTypes = useMaterialTypes();
  const name = item.kind === 'project' ? item.record.title || '이름 없는 작품' : item.record.name;
  const daysLeft = Math.max(0, TRASH_KEEP_DAYS - daysSince(item.record.deletedAt!));

  const purge = async () => {
    const ok = await confirm({
      title: `'${name}'을(를) 완전히 지울까요?`,
      message: '사진까지 지워지고, 다시 되돌릴 수 없어요.',
      confirmLabel: '완전히 지우기',
      danger: true,
    });
    if (ok) await trashRepo.purge(item);
  };

  return (
    <li className={`card ${s.row}`}>
      <span className={s.thumb}>
        {item.kind === 'project' ? (
          <ProjectCover project={item.record} />
        ) : item.record.photoIds[0] ? (
          <PhotoImg id={item.record.photoIds[0]} />
        ) : (
          <span
            className={s.emoji}
            style={{ background: item.record.colorHex ?? `var(--cat-${materialTypes.get(item.record.type).color})` }}
          >
            {materialTypes.get(item.record.type).emoji}
          </span>
        )}
      </span>
      <span className={s.info}>
        <strong className={s.name}>{name}</strong>
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {item.kind === 'project' ? (
            <CategoryBadge category={item.record.category} />
          ) : (
            <MaterialTypeBadge type={item.record.type} />
          )}
          <small className="muted">{daysLeft === 0 ? '곧 지워져요' : `${daysLeft}일 뒤 지워져요`}</small>
        </span>
      </span>
      <span className={s.actions}>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => trashRepo.restore(item)}>
          <RotateCcw size={15} /> 복구
        </button>
        <button type="button" className="icon-btn" onClick={purge} aria-label={`${name} 완전히 지우기`}>
          <Trash2 size={18} />
        </button>
      </span>
    </li>
  );
}
