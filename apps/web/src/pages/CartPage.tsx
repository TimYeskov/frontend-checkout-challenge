import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Money } from '../ui/Money';
import { Banner, StatusBlock } from '../ui/Banner';
import { useShop } from '../state/ShopContext';
import { userMessage } from '../http';
import { useAsyncAction } from '../ui/useAsyncAction';

export function CartPage() {
  const { cart, lines, loading, error, refresh, setQuantity, removeItem } = useShop();
  const action = useAsyncAction();
  const empty = !cart || cart.items.length === 0;

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Корзина</p>
          <h1>Ваш заказ</h1>
        </div>
      </header>
      {loading && empty ? <Banner>Загружаем корзину…</Banner> : null}
      {error ? (
        <Banner kind="error">
          {userMessage(error)}{' '}
          <Button variant="ghost" onClick={() => void refresh()}>
            Повторить
          </Button>
        </Banner>
      ) : null}
      {empty && !loading ? (
        <StatusBlock title="Корзина пуста">
          <p>Добавьте доступный товар из каталога, чтобы перейти к оформлению.</p>
          <Link className="btn btn-primary" to="/">
            К каталогу
          </Link>
        </StatusBlock>
      ) : null}
      {!empty ? (
        <>
          <ul className="cart-list">
            {lines.map((line) => (
              <li key={line.productId} className="cart-line">
                <div>
                  <h2>{line.title}</h2>
                  <p className="muted">
                    <Money value={line.unitPrice} /> за шт.
                  </p>
                </div>
                <div className="qty">
                  <label htmlFor={`qty-${line.productId}`}>Количество</label>
                  <input
                    id={`qty-${line.productId}`}
                    type="number"
                    min={1}
                    max={line.stock}
                    value={line.quantity}
                    disabled={action.pending}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isInteger(next) || next < 1) return;
                      void action.run(() => setQuantity(line.productId, next));
                    }}
                  />
                </div>
                <p className="price">
                  <Money value={line.lineTotal} />
                </p>
                <Button
                  variant="ghost"
                  pending={action.pending}
                  onClick={() => void action.run(() => removeItem(line.productId))}
                >
                  Удалить
                </Button>
              </li>
            ))}
          </ul>
          <footer className="cart-total">
            <p>
              Итого: <Money value={cart.subtotal} />
            </p>
            <Link className="btn btn-primary" to="/checkout">
              Оформить заказ
            </Link>
          </footer>
        </>
      ) : null}
    </section>
  );
}
