import { Link, useNavigate, useParams } from 'react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { useMaterialTypes } from '../../data/categories';
import { useMaterial, useProjects } from '../../data/hooks';
import { materialsRepo } from '../../data/repo';
import { PageHeader } from '../../components/PageHeader';
import { PhotoGallery } from '../../components/PhotoGallery';
import { MaterialTypeBadge } from '../../components/Badges';
import { NotFoundPage } from '../../app/NotFoundPage';
import { useConfirm } from '../../components/ConfirmDialog';
import { ProjectCard } from '../projects/ProjectCard';
import ps from '../projects/projects.module.css';

export function MaterialDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const material = useMaterial(id);
  const projects = useProjects();
  const confirm = useConfirm();
  const materialTypes = useMaterialTypes();

  if (material === undefined) return null;
  if (material === null) return <NotFoundPage message="재료를 찾을 수 없어요" />;

  const usedIn = (projects ?? []).filter((p) => p.materialIds.includes(material.id));

  const remove = async () => {
    const ok = await confirm({
      title: `'${material.name}'을(를) 보관함에서 지울까요?`,
      message: '사진도 함께 지워져요.',
      confirmLabel: '지우기',
      danger: true,
    });
    if (!ok) return;
    await materialsRepo.remove(material.id);
    navigate('/materials', { replace: true });
  };

  const info: [string, string][] = (
    [
      ['브랜드', material.brand],
      ['색상', material.color],
      ['수량', material.quantity],
    ] as [string, string][]
  ).filter(([, v]) => v);

  return (
    <>
      <PageHeader
        title=""
        back="/materials"
        actions={
          <>
            <Link to={`/materials/${material.id}/edit`} className="icon-btn" aria-label="수정">
              <Pencil size={20} />
            </Link>
            <button type="button" className="icon-btn" onClick={remove} aria-label="삭제">
              <Trash2 size={20} />
            </button>
          </>
        }
      />

      <div className={ps.detail}>
        <div>
          {material.photoIds.length ? (
            <PhotoGallery photoIds={material.photoIds} alt={material.name} />
          ) : (
            <div className={ps.noPhoto} style={{ background: material.colorHex ?? `var(--cat-${materialTypes.get(material.type).color})` }}>
              {materialTypes.get(material.type).emoji}
            </div>
          )}
        </div>

        <div className="stack">
          <div>
            <MaterialTypeBadge type={material.type} />
            <h2 className={ps.detailTitle}>{material.name}</h2>
          </div>

          {info.length > 0 && (
            <dl className={ps.infoGrid}>
              {info.map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd className="row">
                    {label === '색상' && material.colorHex && (
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: material.colorHex,
                          border: '1px solid var(--border)',
                        }}
                      />
                    )}
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {material.note && <p className={ps.description}>{material.note}</p>}

          {material.tags.length > 0 && (
            <div className="chips-wrap">
              {material.tags.map((t) => (
                <Link key={t} to={`/search?tag=${encodeURIComponent(t)}`} className="tag">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>

        <section className={`stack ${ps.detailWide}`} style={{ gap: 12 }}>
          <h3 className="section-title">🧺 이 재료를 쓴 작품</h3>
          {usedIn.length ? (
            <div className="card-grid">
              {usedIn.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <p className="muted">작품을 기록할 때 이 재료를 고르면 여기에 모여요.</p>
          )}
        </section>
      </div>
    </>
  );
}
