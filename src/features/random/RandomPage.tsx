import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Dices, RotateCcw } from 'lucide-react';
import type { Category, Material, Project } from '../../data/types';
import { useMaterials, useProjects } from '../../data/hooks';
import { useCategories, useMaterialTypes } from '../../data/categories';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { PhotoImg } from '../../components/PhotoImg';
import { Wheel } from './Wheel';
import s from './random.module.css';

type Mode = 'next' | 'today' | 'material' | 'combo' | 'wheel';

const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: 'next', label: '💭 다음에 만들 작품', desc: '만들 예정인 작품 중에서 하나를 골라요.' },
  { value: 'today', label: '🪡 오늘 할 작품', desc: '만들고 있는 작품 중에서 오늘 손댈 걸 골라요.' },
  { value: 'material', label: '🎁 재료 하나', desc: '가지고 있는 재료 중에서 하나를 골라요.' },
  { value: 'combo', label: '🎨 재료 조합', desc: '고른 종류마다 재료를 하나씩 뽑아 조합을 만들어요.' },
  { value: 'wheel', label: '🎡 돌림판', desc: '직접 적은 항목으로 돌림판을 돌려요. 항목은 이 기기에 저장돼요.' },
];

/** 뽑기 결과 카드 하나에 필요한 정보(작품이든 재료든 같은 모양으로 보여준다) */
interface PickItem {
  key: string;
  title: string;
  sub: string;
  emoji: string;
  color: string;
  photoId?: string;
  colorHex?: string | null;
  to: string;
}

const ROLL_MS = 1400;

function randomOf<T>(list: T[], avoid?: T): T {
  if (list.length > 1 && avoid !== undefined) list = list.filter((x) => x !== avoid);
  return list[Math.floor(Math.random() * list.length)];
}

export function RandomPage() {
  const [params, setParams] = useSearchParams();
  const mode = (MODES.some((m) => m.value === params.get('mode')) ? params.get('mode') : 'next') as Mode;
  const projects = useProjects();
  const materials = useMaterials();
  const categories = useCategories();
  const materialTypes = useMaterialTypes();
  // 비어 있으면 '전체'
  const [filter, setFilter] = useState<string[]>([]);
  const [comboTypes, setComboTypes] = useState<string[] | null>(null);
  const [shown, setShown] = useState<PickItem[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number>(undefined);
  const lastKeys = useRef<string[]>([]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!projects || !materials) return null;

  const haveMaterials = materials.filter((m) => !m.usedUp);
  const typeOf = (m: Material) => materialTypes.get(m.type);

  const projectItem = (p: Project): PickItem => {
    const c = categories.get(p.category);
    return { key: p.id, title: p.title || '이름 없는 작품', sub: `${c.emoji} ${c.name}`, emoji: c.emoji, color: c.color, photoId: p.photoIds[0], to: `/projects/${p.id}` };
  };
  const materialItem = (m: Material): PickItem => {
    const t = typeOf(m);
    return {
      key: m.id,
      title: m.name,
      sub: [`${t.emoji} ${t.name}`, m.brand, m.color].filter(Boolean).join(' · '),
      emoji: t.emoji,
      color: t.color,
      photoId: m.photoIds[0],
      colorHex: m.colorHex,
      to: `/materials/${m.id}`,
    };
  };

  // 지금 모드에서 고를 수 있는 종류 칩과 후보
  const isProjectMode = mode === 'next' || mode === 'today';
  const pool: Project[] | Material[] = isProjectMode
    ? projects.filter((p) => p.status === (mode === 'next' ? 'planned' : 'in_progress'))
    : haveMaterials;
  const chipSource: Category[] = isProjectMode ? categories.list : materialTypes.list;
  const chipOf = (r: Project | Material) =>
    isProjectMode ? categories.get((r as Project).category).id : typeOf(r as Material).id;
  const chips = chipSource.filter((c) => (pool as (Project | Material)[]).some((r) => chipOf(r) === c.id));

  // 재료 조합: 처음엔 재료가 있는 종류 중 앞의 두 개를 골라 둔다.
  const selectedCombo = comboTypes ?? chips.slice(0, 2).map((c) => c.id);
  const activeFilter = mode === 'combo' ? selectedCombo : filter.filter((id) => chips.some((c) => c.id === id));

  const candidates = (pool as (Project | Material)[]).filter(
    (r) => activeFilter.length === 0 || activeFilter.includes(chipOf(r)),
  );
  // 슬롯마다의 후보: 조합은 종류마다 하나, 나머지는 한 칸
  const slots: (Project | Material)[][] =
    mode === 'combo'
      ? selectedCombo.map((typeId) => haveMaterials.filter((m) => typeOf(m).id === typeId))
      : [candidates];
  const toItem = (r: Project | Material) => (isProjectMode ? projectItem(r as Project) : materialItem(r as Material));
  const canRoll = slots.length > 0 && slots.every((slot) => slot.length > 0);

  const changeMode = (next: Mode) => {
    window.clearTimeout(timer.current);
    setRolling(false);
    setShown(null);
    setFilter([]);
    setParams({ mode: next }, { replace: true });
  };

  const toggleChip = (id: string) => {
    setShown(null);
    if (mode === 'combo') {
      setComboTypes(selectedCombo.includes(id) ? selectedCombo.filter((t) => t !== id) : [...selectedCombo, id]);
    } else {
      setFilter((f) => (f.includes(id) ? f.filter((t) => t !== id) : [...f, id]));
    }
  };

  const roll = () => {
    if (!canRoll || rolling) return;
    // 후보가 둘 이상이면 바로 전에 나온 것은 피한다.
    const final = slots.map((slot, i) => toItem(randomOf(slot, slot.find((r) => r.id === lastKeys.current[i]))));
    lastKeys.current = final.map((f) => f.key);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(final);
      return;
    }
    // 처음엔 빠르게, 점점 느리게 바뀌다가 멈춘다.
    setRolling(true);
    let delay = 55;
    let elapsed = 0;
    const tick = () => {
      elapsed += delay;
      if (elapsed >= ROLL_MS) {
        setShown(final);
        setRolling(false);
        return;
      }
      setShown(slots.map((slot) => toItem(randomOf(slot))));
      delay *= 1.18;
      timer.current = window.setTimeout(tick, delay);
    };
    tick();
  };

  const modeInfo = MODES.find((m) => m.value === mode)!;
  const emptyText: Record<Exclude<Mode, 'wheel'>, { title: string; to: string; action: string }> = {
    next: { title: '만들 예정인 작품이 없어요', to: '/projects/new?status=planned', action: '만들 것 추가' },
    today: { title: '만들고 있는 작품이 없어요', to: '/plans', action: '만들 예정 보기' },
    material: { title: '가지고 있는 재료가 없어요', to: '/materials/new', action: '재료 등록' },
    combo: { title: '가지고 있는 재료가 없어요', to: '/materials/new', action: '재료 등록' },
  };

  return (
    <>
      <PageHeader title="랜덤 뽑기" back />

      <div className={s.modes} role="tablist" aria-label="뽑을 것">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            className={`${s.mode} ${m.value === 'wheel' ? s.modeWide : ''}`}
            onClick={() => changeMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className={`muted ${s.modeDesc}`}>{modeInfo.desc}</p>

      {mode === 'wheel' ? (
        <Wheel />
      ) : pool.length === 0 ? (
        <EmptyState
          title={emptyText[mode].title}
          action={
            <Link to={emptyText[mode].to} className="btn btn-primary">
              {emptyText[mode].action}
            </Link>
          }
        />
      ) : (
        <>
          {chips.length > 1 && (
            <div className={s.filters}>
              <span className="label">{mode === 'combo' ? '조합할 종류 (종류마다 하나씩)' : '이 중에서만 뽑기'}</span>
              <div className="chips-wrap">
                {mode !== 'combo' && (
                  <button type="button" className="chip" aria-pressed={activeFilter.length === 0} onClick={() => { setFilter([]); setShown(null); }}>
                    전체
                  </button>
                )}
                {chips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    aria-pressed={activeFilter.includes(c.id)}
                    onClick={() => toggleChip(c.id)}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={s.stage}>
            {shown ? (
              <div className={`${s.results} ${shown.length > 1 ? s.resultsMany : ''}`}>
                {shown.map((item, i) => (
                  <ResultCard key={`${i}-${rolling ? 'r' : item.key}`} item={item} rolling={rolling} />
                ))}
              </div>
            ) : (
              <div className={s.placeholder}>
                <span className={s.dice}>🎲</span>
                <p>
                  {mode === 'combo'
                    ? selectedCombo.length
                      ? `${selectedCombo.length}가지 종류에서 하나씩 뽑아요`
                      : '조합할 종류를 골라 주세요'
                    : `후보 ${candidates.length}개 중에서 뽑아요`}
                </p>
              </div>
            )}
          </div>

          {mode === 'combo' && !canRoll && selectedCombo.length > 0 && (
            <p className="muted" style={{ textAlign: 'center', marginBottom: 12 }}>
              고른 종류 중에 가지고 있는 재료가 없는 종류가 있어요.
            </p>
          )}

          <div className={s.actions}>
            <button type="button" className={`btn btn-primary ${s.rollBtn}`} onClick={roll} disabled={!canRoll || rolling}>
              {shown && !rolling ? <RotateCcw size={20} /> : <Dices size={22} />}
              {rolling ? '두근두근…' : shown ? '다시 뽑기' : '뽑기!'}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function ResultCard({ item, rolling }: { item: PickItem; rolling: boolean }) {
  const body = (
    <>
      <div className={s.cardThumb} style={{ background: item.colorHex ?? `var(--cat-${item.color})` }}>
        {item.photoId ? <PhotoImg id={item.photoId} alt={item.title} /> : <span>{item.emoji}</span>}
      </div>
      <div className={s.cardBody}>
        <p className={s.cardTitle}>{item.title}</p>
        <p className={s.cardSub}>{item.sub}</p>
        {!rolling && <span className={s.cardLink}>자세히 보기 →</span>}
      </div>
    </>
  );
  return rolling ? (
    <div className={`${s.card} ${s.cardRolling}`}>{body}</div>
  ) : (
    <Link to={item.to} className={`${s.card} ${s.cardDone}`}>
      {body}
    </Link>
  );
}
