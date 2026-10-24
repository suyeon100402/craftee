import { useEffect, useRef, useState } from 'react';
import { Plus, RotateCcw, X } from 'lucide-react';
import type { CategoryColor } from '../../data/types';
import { CATEGORY_COLORS } from '../../data/meta';
import { useProjects, useSetting } from '../../data/hooks';
import { settingsRepo } from '../../data/repo';
import s from './random.module.css';

const OPTIONS_KEY = 'wheel:options';
const DEFAULT_OPTIONS = ['뜨개질 하기', '블록 조립', '인형 만들기', '오늘은 쉬기'];
const MAX_OPTIONS = 16;
const SPIN_MS = 4200;

// 이웃한 칸끼리 색이 겹치지 않게 회색은 빼고 돌려 쓴다.
const SLICE_COLORS: CategoryColor[] = CATEGORY_COLORS.filter((c) => c !== 'gray');

/** 돌림판 위 각도(12시 방향이 0도, 시계 방향)를 SVG 좌표로 */
function point(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return `${(100 + r * Math.sin(rad)).toFixed(2)},${(100 - r * Math.cos(rad)).toFixed(2)}`;
}

function shorten(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** 직접 적은 항목으로 돌리는 돌림판. 항목은 이 기기에 저장해 둔다. */
export function Wheel() {
  const saved = useSetting<string[]>(OPTIONS_KEY);
  const projects = useProjects();
  if (saved === undefined) return null;
  return <WheelInner initial={saved ?? DEFAULT_OPTIONS} plannedTitles={(projects ?? []).filter((p) => p.status === 'planned').map((p) => p.title).filter(Boolean)} />;
}

function WheelInner({ initial, plannedTitles }: { initial: string[]; plannedTitles: string[] }) {
  const [options, setOptions] = useState(initial);
  const [text, setText] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const update = (next: string[]) => {
    setOptions(next);
    setResult(null);
    void settingsRepo.set(OPTIONS_KEY, next);
  };

  const add = () => {
    const value = text.trim();
    if (!value || options.length >= MAX_OPTIONS) return;
    update([...options, value]);
    setText('');
  };

  const fillFromPlans = () => update([...new Set(plannedTitles)].slice(0, MAX_OPTIONS));

  const spin = () => {
    if (options.length < 2 || spinning) return;
    const seg = 360 / options.length;
    const winner = Math.floor(Math.random() * options.length);
    // 칸 가장자리에 걸리지 않게 칸 안쪽 어딘가에 멈춘다.
    const target = winner * seg + seg * (0.15 + Math.random() * 0.7);
    const current = ((rotation % 360) + 360) % 360;
    const delta = (((360 - target - current) % 360) + 360) % 360;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setResult(null);
    setRotation(rotation + delta + (reduce ? 0 : 360 * 6));
    if (reduce) {
      setResult(options[winner]);
      return;
    }
    setSpinning(true);
    timer.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(options[winner]);
    }, SPIN_MS);
  };

  const seg = 360 / Math.max(options.length, 1);
  // 글씨가 가운데 버튼이나 바깥 테두리를 넘지 않을 만큼만 보여준다.
  const labelMax = options.length > 10 ? 4 : options.length > 6 ? 5 : 6;
  const fontSize = options.length > 10 ? 8 : options.length > 6 ? 9.5 : 11;

  return (
    <div className={s.wheelWrap}>
      <div className={s.wheelBox}>
        <svg viewBox="0 0 200 200" className={s.wheelSvg} aria-hidden="true">
          <circle cx="100" cy="100" r="99" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
          <g
            className={s.wheelSpin}
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? `${SPIN_MS}ms` : '0ms',
            }}
          >
            {options.length === 1 ? (
              <circle cx="100" cy="100" r="94" fill={`var(--cat-${SLICE_COLORS[0]})`} />
            ) : (
              options.map((opt, i) => {
                const color = SLICE_COLORS[i % SLICE_COLORS.length];
                const a0 = i * seg;
                const a1 = (i + 1) * seg;
                const large = seg > 180 ? 1 : 0;
                // 왼쪽 절반의 글씨는 뒤집혀 보이니, 반대 방향으로 돌려서 바로 읽히게 한다.
                const mid = a0 + seg / 2;
                const flip = mid > 180;
                return (
                  <g key={`${opt}-${i}`}>
                    <path
                      d={`M100,100 L${point(a0, 94)} A94,94 0 ${large} 1 ${point(a1, 94)} Z`}
                      fill={`var(--cat-${color})`}
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                    />
                    <text
                      x={flip ? 42 : 158}
                      y="100"
                      transform={`rotate(${flip ? mid + 90 : mid - 90} 100 100)`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fontWeight="700"
                      fill={`var(--cat-${color}-ink)`}
                    >
                      {shorten(opt, labelMax)}
                    </text>
                  </g>
                );
              })
            )}
          </g>
          {/* 바늘 */}
          <path d="M100,16 L92,2 L108,2 Z" fill="var(--text)" />
        </svg>
        <button
          type="button"
          className={s.wheelHub}
          onClick={spin}
          disabled={options.length < 2 || spinning}
          aria-label="돌림판 돌리기"
        >
          {spinning ? '…' : '돌려!'}
        </button>
      </div>

      <div className={s.wheelResult} aria-live="polite">
        {result ? (
          <p className={s.wheelResultText}>
            🎉 <strong>{result}</strong>
          </p>
        ) : (
          <p className="muted">
            {options.length < 2 ? '항목을 두 개 이상 넣어 주세요' : spinning ? '두근두근…' : '가운데 버튼을 눌러 돌려요'}
          </p>
        )}
      </div>

      <div className={s.actions}>
        <button type="button" className={`btn btn-primary ${s.rollBtn}`} onClick={spin} disabled={options.length < 2 || spinning}>
          <RotateCcw size={20} /> {result ? '다시 돌리기' : '돌리기'}
        </button>
      </div>

      <section className={`card ${s.wheelEditor}`}>
        <div className="row">
          <h3 className="section-title" style={{ fontSize: 17 }}>
            돌림판 항목 <span className="muted" style={{ fontSize: 14 }}>{options.length}/{MAX_OPTIONS}</span>
          </h3>
        </div>
        <form
          className={s.wheelAdd}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="항목 입력 (예: 토끼 인형)"
            maxLength={30}
            disabled={spinning}
          />
          <button type="submit" className="btn" disabled={!text.trim() || options.length >= MAX_OPTIONS || spinning}>
            <Plus size={18} /> 추가
          </button>
        </form>
        <div className="chips-wrap">
          {options.map((opt, i) => (
            <span key={`${opt}-${i}`} className={s.wheelChip} style={{ background: `var(--cat-${SLICE_COLORS[i % SLICE_COLORS.length]})` }}>
              {opt}
              <button
                type="button"
                onClick={() => update(options.filter((_, j) => j !== i))}
                disabled={spinning}
                aria-label={`${opt} 빼기`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {plannedTitles.length >= 2 && (
            <button type="button" className="btn btn-sm" onClick={fillFromPlans} disabled={spinning}>
              💭 만들 예정 작품으로 채우기
            </button>
          )}
          {options.length > 0 && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => update([])} disabled={spinning}>
              모두 지우기
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
