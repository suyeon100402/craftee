import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import s from './components.module.css';

/** 모바일에서 오른쪽 아래에 떠 있는 추가 버튼(PC에서는 숨김) */
export function Fab({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={s.fab} aria-label={label}>
      <Plus size={28} strokeWidth={2.4} />
    </Link>
  );
}
