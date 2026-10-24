import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { Dices, House, Images, Lightbulb, Package, Plus, Search, Settings } from 'lucide-react';
import s from './AppShell.module.css';

const NAV = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/works', label: '작품', icon: Images },
  { to: '/plans', label: '만들 예정', short: '계획', icon: Lightbulb },
  { to: '/materials', label: '재료 보관함', short: '재료', icon: Package },
  { to: '/settings', label: '설정', icon: Settings },
];

export function AppShell() {
  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <Link to="/" className={s.brand}>
          <img src="./logo.svg" alt="" />
          Craftee
        </Link>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={s.navLink}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <NavLink to="/random" className={s.navLink}>
          <Dices size={20} />
          랜덤 뽑기
        </NavLink>
        <NavLink to="/search" className={s.navLink}>
          <Search size={20} />
          검색
        </NavLink>
        <div className={s.sidebarFooter}>
          <Link to="/projects/new?status=done" className="btn btn-primary btn-block">
            <Plus size={18} /> 작품 기록하기
          </Link>
          <Link to="/projects/new?status=planned" className="btn btn-block">
            <Lightbulb size={18} /> 만들 것 추가
          </Link>
        </div>
      </aside>

      <main className={s.main}>
        <Outlet />
      </main>

      <nav className={s.tabbar}>
        {NAV.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={s.tab}>
            <span className={s.tabIcon}>
              <Icon size={21} />
            </span>
            {short ?? label}
          </NavLink>
        ))}
      </nav>
      <ScrollRestoration />
    </div>
  );
}
