import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { useMaterialTypes } from '../../data/categories';
import { useMaterials } from '../../data/hooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { MaterialCard } from './MaterialCard';
import s from './materials.module.css';

export function MaterialListPage() {
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();
  const [type, setType] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = (materials ?? []).filter(
    (m) =>
      (!type || materialTypes.get(m.type).id === type) &&
      (!q || [m.name, m.brand, m.color, m.note, ...m.tags].some((v) => v.toLowerCase().includes(q))),
  );
  // 가진 재료 종류만 필터 칩으로 보여준다.
  const usedTypes = materialTypes.list.filter((t) => materials?.some((m) => materialTypes.get(m.type).id === t.id));

  return (
    <>
      <PageHeader
        title="재료 보관함"
        actions={
          <Link to="/materials/new" className="btn btn-primary btn-sm hide-mobile">
            <Plus size={16} /> 재료 등록
          </Link>
        }
      />

      {materials && materials.length > 0 && (
        <div className={s.toolbar}>
          <div className={s.searchBox}>
            <Search size={18} />
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 브랜드, 색상으로 찾기"
            />
          </div>
          {usedTypes.length > 1 && (
            <div className="chips" role="group" aria-label="재료 종류">
              <button className="chip" aria-pressed={!type} onClick={() => setType(null)}>
                전체 {materials.length}
              </button>
              {usedTypes.map((t) => (
                <button
                  key={t.id}
                  className="chip"
                  aria-pressed={type === t.id}
                  onClick={() => setType(type === t.id ? null : t.id)}
                >
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {materials === undefined ? null : visible.length === 0 ? (
        <EmptyState
          title={materials.length ? '찾는 재료가 없어요' : '재료 보관함이 비어 있어요'}
          description={materials.length ? '다른 검색어로 찾아보세요.' : '가진 실, 바늘, 블록, 원단을 등록해 두면 작품에 연결하고, 나중에 랜덤 뽑기에도 쓸 수 있어요.'}
          action={
            !materials.length && (
              <Link to="/materials/new" className="btn btn-primary">
                <Plus size={18} /> 첫 재료 등록하기
              </Link>
            )
          }
        />
      ) : (
        <div className="card-grid">
          {visible.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}

      <Fab to="/materials/new" label="재료 등록" />
    </>
  );
}
