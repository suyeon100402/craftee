import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { todayStr } from '../lib/date';
import s from './components.module.css';

interface DateFieldProps {
  label: string;
  /**
   * 'YYYY', 'YYYY-MM', 'YYYY-MM-DD' 중 하나. 연도만, 연월만 알아도 저장할 수 있다.
   * null이면 '모름'.
   */
  value: string | null;
  onChange: (value: string | null) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const OLDEST_YEAR = 1970;

/**
 * 날짜 입력칸. 연 / 월 / 일을 따로 고르고, 월이나 일은 '-'로 비워 둘 수 있다.
 * 오른쪽 위 '모름'을 누르면 날짜 없이 저장한다.
 */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const id = useId();
  const unknown = value === null;
  const [y, m, d] = (value ?? '').split('-').map(Number);

  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = thisYear + 1; year >= Math.min(OLDEST_YEAR, y || thisYear); year--) years.push(year);

  // 월을 비우면 일도 비운다. 월을 바꿨을 때 그 달에 없는 날(예: 2월 31일)이면 마지막 날로 맞춘다.
  const update = (year: number, month: number, day: number) => {
    if (!month) return onChange(String(year));
    if (!day) return onChange(`${year}-${pad(month)}`);
    onChange(`${year}-${pad(month)}-${pad(Math.min(day, daysInMonth(year, month)))}`);
  };

  return (
    <div className="field">
      <div className={s.dateHead}>
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <button
          type="button"
          className={s.unknownToggle}
          aria-pressed={unknown}
          onClick={() => onChange(unknown ? todayStr() : null)}
        >
          모름
        </button>
      </div>
      {unknown ? (
        <button id={id} type="button" className={`input ${s.dateUnknown}`} onClick={() => onChange(todayStr())}>
          <span>?</span> 날짜 모름
        </button>
      ) : (
        <div className={s.dateSelects}>
          <Select id={id} value={y} onChange={(year) => update(year, m, d)} aria-label={`${label} 연도`}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </Select>
          <Select value={m || 0} onChange={(month) => update(y, month, month ? d : 0)} aria-label={`${label} 월`}>
            <option value={0}>- 월</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}월
              </option>
            ))}
          </Select>
          <Select value={d || 0} onChange={(day) => update(y, m, day)} disabled={!m} aria-label={`${label} 일`}>
            <option value={0}>- 일</option>
            {m > 0 &&
              Array.from({ length: daysInMonth(y, m) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}일
                </option>
              ))}
          </Select>
        </div>
      )}
    </div>
  );
}

interface SelectProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  'aria-label': string;
  children: ReactNode;
}

function Select({ onChange, children, ...rest }: SelectProps) {
  return (
    <span className={s.selectWrap}>
      <select className={`input ${s.select}`} onChange={(e) => onChange(Number(e.target.value))} {...rest}>
        {children}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </span>
  );
}
