import { useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import type { ProjectStatus } from '../../data/types';
import { STATUSES } from '../../data/meta';
import { useCategories } from '../../data/categories';
import { useAllTags, useMaterials, useProjects } from '../../data/hooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ProjectCard } from '../projects/ProjectCard';
import { MaterialCard } from '../materials/MaterialCard';
import ms from '../materials/materials.module.css';

type Scope = 'all' | 'projects' | 'materials';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'projects', label: '작품' },
  { value: 'materials', label: '재료' },
];

/** 검색 조건은 주소(?q=&tag=…)에 담아서, 뒤로 가기 해도 그대로 남게 한다. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const projects = useProjects();
  const materials = useMaterials();
  const allTags = useAllTags() ?? [];

  const query = params.get('q') ?? '';
  const tag = params.get('tag');
  const scope = (params.get('scope') as Scope) ?? 'all';
  const category = params.get('category');
  const categories = useCategories().list;
  const status = params.get('status') as ProjectStatus | null;

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const toggle = (key: string, value: string, current: string | null) => update(key, current === value ? null : value);

  const q = query.trim().toLowerCase();
  const matches = (fields: string[]) => !q || fields.some((f) => f.toLowerCase().includes(q));
  const hasFilter = Boolean(q || tag || category || status);

  const foundProjects =
    scope === 'materials'
      ? []
      : (projects ?? []).filter(
          (p) =>
            matches([p.title, p.description, ...p.tags]) &&
            (!tag || p.tags.includes(tag)) &&
            (!category || p.category === category) &&
            (!status || p.status === status),
        );
  // 작품 전용 조건(종류·상태)을 골랐으면 재료는 보여주지 않는다.
  const foundMaterials =
    scope === 'projects' || category || status
      ? []
      : (materials ?? []).filter(
          (m) => matches([m.name, m.brand, m.color, m.note, ...m.tags]) && (!tag || m.tags.includes(tag)),
        );

  return (
    <>
      <PageHeader title="검색" back />

      <div className="stack" style={{ marginBottom: 24 }}>
        <div className={ms.searchBox}>
          <Search size={18} />
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => update('q', e.target.value)}
            placeholder="작품 이름, 메모, 재료로 찾기"
            autoFocus={!tag}
          />
        </div>

        <div className="chips" role="group" aria-label="검색 범위">
          {SCOPES.map((sc) => (
            <button
              key={sc.value}
              className="chip"
              aria-pressed={scope === sc.value}
              onClick={() => update('scope', sc.value === 'all' ? null : sc.value)}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {scope !== 'materials' && (
          <div className="chips" role="group" aria-label="작품 종류와 상태">
            {categories.map((c) => (
              <button
                key={c.id}
                className="chip"
                aria-pressed={category === c.id}
                onClick={() => toggle('category', c.id, category)}
              >
                {c.emoji} {c.name}
              </button>
            ))}
            {STATUSES.map((st) => (
              <button
                key={st.value}
                className="chip"
                aria-pressed={status === st.value}
                onClick={() => toggle('status', st.value, status)}
              >
                {st.emoji} {st.label}
              </button>
            ))}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="chips-wrap" role="group" aria-label="태그">
            {allTags.map((t) => (
              <button
                key={t}
                className="chip"
                style={{ minHeight: 30, fontSize: 13 }}
                aria-pressed={tag === t}
                onClick={() => toggle('tag', t, tag)}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasFilter ? (
        <EmptyState title="무엇을 찾고 있나요?" description="이름이나 메모로 검색하거나, 위의 태그를 눌러 모아 보세요." />
      ) : foundProjects.length + foundMaterials.length === 0 ? (
        <EmptyState title="찾는 결과가 없어요" description="검색어나 조건을 바꿔 보세요." />
      ) : (
        <div className="stack" style={{ gap: 28 }}>
          {foundProjects.length > 0 && (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="section-title">작품 {foundProjects.length}</h2>
              <div className="card-grid">
                {foundProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}
          {foundMaterials.length > 0 && (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="section-title">재료 {foundMaterials.length}</h2>
              <div className="card-grid">
                {foundMaterials.map((m) => (
                  <MaterialCard key={m.id} material={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
