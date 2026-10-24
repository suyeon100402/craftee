import { Link, useNavigate, useParams } from 'react-router';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import type { ProjectStatus } from '../../data/types';
import { STATUSES } from '../../data/meta';
import { useMaterialTypes } from '../../data/categories';
import { useMaterials, useProject } from '../../data/hooks';
import { projectsRepo } from '../../data/repo';
import { formatDate, todayStr } from '../../lib/date';
import { PageHeader } from '../../components/PageHeader';
import { PhotoGallery } from '../../components/PhotoGallery';
import { PhotoImg } from '../../components/PhotoImg';
import { CategoryBadge, StatusBadge } from '../../components/Badges';
import { NotFoundPage } from '../../app/NotFoundPage';
import { useConfirm } from '../../components/ConfirmDialog';
import { ProgressLogSection } from './ProgressLogSection';
import { ProjectCover } from './ProjectCard';
import s from './projects.module.css';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useProject(id);
  const materials = useMaterials();
  const confirm = useConfirm();
  const materialTypes = useMaterialTypes();

  if (project === undefined) return null;
  if (project === null) return <NotFoundPage message="작품을 찾을 수 없어요" />;

  const usedMaterials = (materials ?? []).filter((m) => project.materialIds.includes(m.id));
  const listPath = project.status === 'planned' ? '/plans' : '/works';

  const changeStatus = (status: ProjectStatus) => {
    if (status === project.status) return;
    // 계획 → 시작하거나 완성으로 바꾸는 순간에만 빈 날짜를 오늘로 채운다('모름'으로 둔 날짜는 건드리지 않음).
    const patch: Parameters<typeof projectsRepo.update>[1] = { status };
    if (project.status === 'planned' && status !== 'planned' && !project.startedAt) patch.startedAt = todayStr();
    if (project.status !== 'done' && status === 'done' && !project.finishedAt) patch.finishedAt = todayStr();
    void projectsRepo.update(project.id, patch);
  };

  const remove = async () => {
    const ok = await confirm({
      title: `'${project.title}'을(를) 휴지통으로 옮길까요?`,
      message: '진행 기록도 함께 옮겨져요. 30일 안에는 설정 → 휴지통에서 되살릴 수 있어요.',
      confirmLabel: '휴지통으로',
      danger: true,
    });
    if (!ok) return;
    await projectsRepo.remove(project.id);
    navigate(listPath, { replace: true });
  };

  return (
    <>
      <PageHeader
        title=""
        back={listPath}
        actions={
          <>
            <Link to={`/projects/${project.id}/edit`} className="icon-btn" aria-label="수정">
              <Pencil size={20} />
            </Link>
            <button type="button" className="icon-btn" onClick={remove} aria-label="삭제">
              <Trash2 size={20} />
            </button>
          </>
        }
      />

      <div className={s.detail}>
        <div>
          {project.photoIds.length ? (
            <PhotoGallery photoIds={project.photoIds} alt={project.title} />
          ) : (
            <ProjectCover project={project} className={s.noPhoto} />
          )}
        </div>

        <div className="stack">
          <div>
            <div className="row">
              <CategoryBadge category={project.category} />
              <StatusBadge status={project.status} />
            </div>
            <h2 className={s.detailTitle}>{project.title || '이름 없는 작품'}</h2>
          </div>

          <div className={s.statusSteps} role="group" aria-label="진행 상태 바꾸기">
            {STATUSES.map((st) => (
              <button
                key={st.value}
                type="button"
                className={s.statusStep}
                aria-pressed={project.status === st.value}
                onClick={() => changeStatus(st.value)}
              >
                {st.emoji} {st.label}
              </button>
            ))}
          </div>

          {project.status !== 'planned' && (
            <dl className={s.infoGrid}>
              <dt>시작한 날</dt>
              <dd className={project.startedAt ? undefined : 'muted'}>{formatDate(project.startedAt) || '모름'}</dd>
              {project.status === 'done' && (
                <>
                  <dt>완성한 날</dt>
                  <dd className={project.finishedAt ? undefined : 'muted'}>{formatDate(project.finishedAt) || '모름'}</dd>
                </>
              )}
            </dl>
          )}

          {project.description && <p className={s.description}>{project.description}</p>}

          {project.tags.length > 0 && (
            <div className="chips-wrap">
              {project.tags.map((t) => (
                <Link key={t} to={`/search?tag=${encodeURIComponent(t)}`} className="tag">
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {project.links.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              <h3 className="section-title">🔗 도안·참고 링크</h3>
              {project.links.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={s.linkItem}>
                  <ExternalLink size={16} style={{ flex: 'none' }} />
                  <span>{url}</span>
                </a>
              ))}
            </div>
          )}

          {usedMaterials.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <h3 className="section-title">🧺 사용한 재료</h3>
              <div className={s.materialList} style={{ maxHeight: 'none' }}>
                {usedMaterials.map((m) => (
                  <Link key={m.id} to={`/materials/${m.id}`} className={s.materialOption}>
                    <span className={s.materialThumb}>
                      {m.photoIds[0] ? <PhotoImg id={m.photoIds[0]} /> : materialTypes.get(m.type).emoji}
                    </span>
                    <span>
                      <strong>{m.name}</strong>
                      <br />
                      <small className="muted">{[m.brand, m.color].filter(Boolean).join(' · ')}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={s.detailWide}>
          <ProgressLogSection projectId={project.id} />
        </div>
      </div>
    </>
  );
}
