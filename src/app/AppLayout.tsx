import { useEffect, useRef } from 'react';
import { ArrowUpRight, BookOpenCheck, Compass, Info } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { navigation } from './navigation';
import { PwaBanner } from '../pwa/PwaStatus';

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="ЕГЭ Трекер — главная">
      <span className="poster-brand">
        <b>ЕГЭ</b>
        <span>трекер</span>
      </span>
    </Link>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const section = navigation.find((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  );

  useEffect(() => {
    document.title = `${section?.label ?? 'Страница не найдена'} · ЕГЭ Трекер`;
    if (previousPath.current !== pathname) {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousPath.current = pathname;
    }
  }, [pathname, section]);

  return (
    <div
      className={`app-shell poster-app ${pathname === '/' ? 'poster-home' : 'poster-page'}`}
      data-subject={pathname.split('/')[2]}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <header className="mobile-header">
        <Brand />
        <span className="mobile-header__label">Личная подготовка</span>
      </header>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Brand />
          <p>
            Маленькие шаги.
            <br />
            Большие результаты.
          </p>
        </div>
        <div className="sidebar__caption">ТВОЁ ПРОСТРАНСТВО</div>
        <nav className="navigation" aria-label="Основная навигация">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              to={to}
              end={to === '/'}
              key={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link--active' : ''}`
              }
            >
              <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <div className="sidebar-note">
            <BookOpenCheck size={25} aria-hidden="true" />
            <p>
              В своём темпе,
              <br />
              <strong>к своей цели.</strong>
            </p>
            <span>Каждое решение имеет значение.</span>
          </div>
          <Link to="/settings" className="sidebar__about">
            О трекере
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <Compass size={16} aria-hidden="true" /> Подготовка к ЕГЭ{' '}
            <span aria-hidden="true" className="topbar__slash">
              /
            </span>{' '}
            <strong>{section?.label ?? 'Страница'}</strong>
          </span>
          <span className="topbar__label">Личный трекер</span>
        </header>
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="main-content"
        >
          <PwaBanner />
          <div className="stage-notice">
            <Info size={17} aria-hidden="true" />
            <p>
              <strong>Твоя подготовка — в этом браузере.</strong> Сохраняй
              резервные копии в настройках, чтобы переносить историю и скриншоты
              между устройствами.
            </p>
          </div>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>ЕГЭ Трекер</span>
          <span>Подготовка начинается с одного шага.</span>
        </footer>
      </div>
    </div>
  );
}
