import { NavLink, Outlet } from 'react-router-dom';
import { useShop } from '../state/ShopContext';

export function Layout() {
  const { cart } = useShop();
  const count = cart?.quantity ?? 0;

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          Лавка
          <span>учебный магазин</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Каталог
          </NavLink>
          <NavLink to="/cart">
            Корзина{count ? <span className="badge">{count}</span> : null}
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
