import { Button } from '../ui/Button';
import { Money } from '../ui/Money';
import { Banner } from '../ui/Banner';
import { useShop } from '../state/ShopContext';
import { userMessage } from '../http';
import { useAsyncAction } from '../ui/useAsyncAction';

export function CatalogPage() {
  const { rows, loading, error, refresh, setQuantity } = useShop();
  const action = useAsyncAction();

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Товары учебной лавки</h1>
        </div>
      </header>
      {loading && !rows.length ? <Banner>Загружаем каталог…</Banner> : null}
      {error ? (
        <Banner kind="error">
          {userMessage(error)}{' '}
          <Button variant="ghost" onClick={() => void refresh()}>
            Повторить
          </Button>
        </Banner>
      ) : null}
      <ul className="product-grid">
        {rows.map((row) => (
          <li key={row.product.id} className="card">
            <p className="sku">{row.product.sku}</p>
            <h2>{row.product.title}</h2>
            <p className="muted">{row.product.description}</p>
            <p className="price">
              <Money value={row.product.price} />
            </p>
            {row.available ? (
              <p className="hint">В наличии: {row.product.stock} шт.</p>
            ) : (
              <p className="error">Нет в наличии</p>
            )}
            <Button
              pending={action.pending}
              disabled={!row.available || row.inCart >= row.product.stock}
              onClick={() =>
                void action.run(() => setQuantity(row.product.id, row.inCart + 1))
              }
            >
              {row.inCart ? `В корзине: ${row.inCart}` : 'В корзину'}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
