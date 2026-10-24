import { useId } from 'react';
import { todayStr } from '../lib/date';
import s from './components.module.css';

interface DateFieldProps {
  label: string;
  /** null이면 '모름' */
  value: string | null;
  onChange: (value: string | null) => void;
}

/** 날짜 입력칸. 오른쪽 위 '모름'을 누르면 날짜 없이 저장할 수 있다. */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const id = useId();
  const unknown = value === null;

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
        <input
          id={id}
          type="date"
          className={`input ${s.dateInput}`}
          value={value}
          // 달력에서 '지우기'를 누르면 모름으로 바뀐다.
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}
    </div>
  );
}
