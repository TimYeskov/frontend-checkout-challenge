import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Money } from '../ui/Money';
import { Banner, StatusBlock } from '../ui/Banner';
import { useShop } from '../state/ShopContext';
import { userMessage } from '../http';

export function CartPage() {
  const { cart, lines, loading, error, refresh, setQuantity, removeItem } = useShop();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const empty = !cart || cart.items.length === 0;

  async function run(key: string, action: () => Promise<void>) {
    if (pendingKey !== null) return;
    setPendingKey(key);
    try {
      await action();
    } finally {
      setPendingKey((current) => (current === key ? null : current));
    }
  }

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
            {lines.map((line) => {
              const qtyKey = `qty:${line.productId}`;
              const removeKey = `rm:${line.productId}`;
              const lineBusy = pendingKey === qtyKey || pendingKey === removeKey;
              const labelId = `qty-label-${line.productId}`;
              return (
                <li key={line.productId} className="cart-line">
                  <div className="cart-line-info">
                    <h2>{line.title}</h2>
                    <p className="muted">
                      <Money value={line.unitPrice} /> за шт.
                    </p>
                  </div>
                  <div className="qty">
                    <span className="qty-label" id={labelId}>
                      Количество
                    </span>
                    <div className="qty-control" role="group" aria-labelledby={labelId}>
                      <button
                        type="button"
                        className="qty-step"
                        aria-label="Уменьшить количество"
                        disabled={lineBusy || line.quantity <= 1}
                        onClick={() =>
                          void run(qtyKey, () => setQuantity(line.productId, line.quantity - 1))
                        }
                      >
                        −
                      </button>
                      <input
                        id={`qty-${line.productId}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={line.stock}
                        value={line.quantity}
                        disabled={lineBusy}
                        aria-labelledby={labelId}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isInteger(next) || next < 1) return;
                          if (next > line.stock) return;
                          void run(qtyKey, () => setQuantity(line.productId, next));
                        }}
                      />
                      <button
                        type="button"
                        className="qty-step"
                        aria-label="Увеличить количество"
                        disabled={lineBusy || line.quantity >= line.stock}
                        onClick={() =>
                          void run(qtyKey, () => setQuantity(line.productId, line.quantity + 1))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="price cart-line-total">
                    <Money value={line.lineTotal} />
                  </p>
                  <Button
                    variant="danger"
                    pending={pendingKey === removeKey}
                    disabled={lineBusy && pendingKey !== removeKey}
                    onClick={() => void run(removeKey, () => removeItem(line.productId))}
                  >
                    Удалить
                  </Button>
                </li>
              );
            })}
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
