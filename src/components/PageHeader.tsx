import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import s from './components.module.css';

interface PageHeaderProps {
  title: ReactNode;
  /** 뒤로 가기 버튼을 보여준다. 문자열이면 방문 기록이 없을 때 그 주소로 간다. */
  back?: boolean | string;
  actions?: ReactNode;
}

export function PageHeader({ title, back, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(typeof back === 'string' ? back : '/', { replace: true });
  };

  return (
    <header className={s.header}>
      {back && (
        <button type="button" className="icon-btn" onClick={goBack} aria-label="뒤로">
          <ChevronLeft size={26} />
        </button>
      )}
      <h1 className={s.headerTitle}>{title}</h1>
      {actions && <div className={s.headerActions}>{actions}</div>}
    </header>
  );
}
