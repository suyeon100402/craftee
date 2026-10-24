import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Dices, Plus, Search } from 'lucide-react';
import type { ProjectStatus } from '../../data/types';
import { STATUSES } from '../../data/meta';
import { useCategories } from '../../data/categories';
import { useProjects } from '../../data/hooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ProjectCard } from './ProjectCard';
import s from './projects.module.css';

/**
 * works: 진행 중 + 완성 작품, plans: 만들 예정(계획) 작품
 * 둘 다 같은 Project 기록이고 status로만 나뉜다.
 */
export function ProjectListPage({ mode }: { mode: 'works' | 'plans' }) {
  const projects = useProjects();
  const [params, setParams] = useSearchParams();
  const categories = useCategories().list;
  const [category, setCategory] = useState<string | null>(null);
  const statusFilter = params.get('status') as ProjectStatus | null;

  const isPlans = mode === 'plans';
  const statuses: ProjectStatus[] = isPlans ? ['planned'] : ['in_progress', 'done'];
  const newStatus = isPlans ? 'planned' : 'done';

  const visible = (projects ?? []).filter(
    (p) =>
      statuses.includes(p.status) &&
      (!statusFilter || p.status === statusFilter) &&
      (!category || p.category === category),
  );

  const setStatus = (value: ProjectStatus | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set('status', value);
    else next.delete('status');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title={isPlans ? '만들 예정' : '작품'}
        actions={
          <>
            <Link to={`/random?mode=${isPlans ? 'next' : 'today'}`} className="icon-btn" aria-label="랜덤 뽑기">
              <Dices size={22} />
            </Link>
            <Link to="/search" className="icon-btn" aria-label="검색">
              <Search size={22} />
            </Link>
            <Link to={`/projects/new?status=${newStatus}`} className="btn btn-primary btn-sm hide-mobile">
              <Plus size={16} /> {isPlans ? '만들 것 추가' : '작품 기록'}
            </Link>
          </>
        }
      />

      <div className={s.filters}>
        {!isPlans && (
          <div className="chips" role="group" aria-label="상태">
            <button className="chip" aria-pressed={!statusFilter} onClick={() => setStatus(null)}>
              전체
            </button>
            {STATUSES.filter((st) => statuses.includes(st.value)).map((st) => (
              <button
                key={st.value}
                className="chip"
                aria-pressed={statusFilter === st.value}
                onClick={() => setStatus(st.value)}
              >
                {st.emoji} {st.label}
              </button>
            ))}
          </div>
        )}
        <div className="chips" role="group" aria-label="카테고리">
          <button className="chip" aria-pressed={!category} onClick={() => setCategory(null)}>
            모든 종류
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className="chip"
              aria-pressed={category === c.id}
              onClick={() => setCategory(category === c.id ? null : c.id)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {projects === undefined ? null : visible.length === 0 ? (
        <EmptyState
          title={
            category || statusFilter
              ? '조건에 맞는 작품이 없어요'
              : isPlans
                ? '만들고 싶은 게 생기면 적어 두세요'
                : '아직 기록한 작품이 없어요'
          }
          description={
            isPlans ? '참고 사진, 도안 링크, 필요한 재료를 함께 모아둘 수 있어요.' : '완성했거나 만들고 있는 작품을 사진과 함께 남겨 보세요.'
          }
          action={
            <Link to={`/projects/new?status=${newStatus}`} className="btn btn-primary">
              <Plus size={20} strokeWidth={2.4} /> {isPlans ? '추가' : '기록하기'}
            </Link>
          }
        />
      ) : (
        <div className="card-grid">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} showStatus={!isPlans} />
          ))}
        </div>
      )}

      <Fab to={`/projects/new?status=${newStatus}`} label={isPlans ? '만들 것 추가' : '작품 기록'} />
    </>
  );
}
