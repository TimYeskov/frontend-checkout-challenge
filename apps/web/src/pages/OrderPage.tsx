import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Delivery, Order } from '@checkout/contracts';
import { api } from '../api/resources';
import { isCashOrder, isPaidOrder, isSuccessfulOrder } from '../domain/payment';
import { isAbortError, pollUntil, toAppError, userMessage } from '../http';
import { Banner, StatusBlock } from '../ui/Banner';
import { Money } from '../ui/Money';

function deliveryText(delivery: Delivery): string {
  if (delivery.method === 'pickup') {
    return delivery.pickupPointId === 'point-north' ? 'Самовывоз: Северный пункт' : 'Самовывоз: Центральный пункт';
  }
  const apartment = delivery.address.apartment ? `, кв. ${delivery.address.apartment}` : '';
  return `Курьер: ${delivery.address.city}, ${delivery.address.street}, ${delivery.address.house}${apartment}`;
}

export function OrderPage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await api.order(orderId, controller.signal);
        setOrder(result.data);
        if (
          result.data.paymentMethod === 'card' &&
          !isSuccessfulOrder(result.data) &&
          (result.data.paymentStatus === 'pending' || result.data.status === 'awaiting_payment')
        ) {
          setWaiting(result.data.paymentStatus === 'pending');
          if (result.data.paymentStatus === 'pending') {
            await pollUntil({
              signal: controller.signal,
              intervalMs: 800,
              load: async (signal) => {
                const next = await api.order(orderId, signal);
                return { value: next.data };
              },
              isDone: (value) =>
                isPaidOrder(value) ||
                value.paymentStatus === 'failed' ||
                value.paymentStatus === 'cancelled' ||
                value.paymentStatus === 'unpaid',
              onValue: (value) => setOrder(value),
            });
            if (!controller.signal.aborted) setWaiting(false);
          }
        }
      } catch (value) {
        if (!isAbortError(value)) setError(userMessage(toAppError(value)));
      }
    })();
    return () => controller.abort();
  }, [orderId]);

  if (error) return <Banner kind="error">{error}</Banner>;
  if (!order) return <Banner>Загружаем заказ…</Banner>;

  if (isCashOrder(order)) {
    return (
      <SuccessLayout order={order}>
        <Banner kind="success">Заказ оформлен, оплата при получении.</Banner>
      </SuccessLayout>
    );
  }

  if (isPaidOrder(order)) {
    return (
      <SuccessLayout order={order}>
        <Banner kind="success">Оплата прошла, заказ подтверждён.</Banner>
      </SuccessLayout>
    );
  }

  return (
    <StatusBlock title={`Заказ ${order.number}`}>
      {waiting ? <Banner>Оплата ещё обрабатывается. Проверяем статус…</Banner> : null}
      {order.paymentStatus === 'failed' ? (
        <Banner kind="error">Банк отклонил карту.</Banner>
      ) : null}
      {order.paymentStatus === 'cancelled' ? <Banner>Оплата была отменена.</Banner> : null}
      {order.paymentMethod === 'card' && !isPaidOrder(order) ? (
        <Link className="btn btn-primary" to={`/orders/${order.id}/pay`}>
          Перейти к оплате
        </Link>
      ) : null}
    </StatusBlock>
  );
}

function SuccessLayout({ order, children }: { order: Order; children: React.ReactNode }) {
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Готово</p>
          <h1>Заказ {order.number}</h1>
        </div>
      </header>
      {children}
      <div className="card">
        <h2>Состав</h2>
        <ul className="plain">
          {order.items.map((item) => (
            <li key={item.productId}>
              {item.title} × {item.quantity} — <Money value={item.lineTotal} />
            </li>
          ))}
        </ul>
        <p>{deliveryText(order.delivery)}</p>
        <p>
          Доставка: <Money value={order.shipping} />
        </p>
        <p className="total">
          Итого: <Money value={order.total} />
        </p>
      </div>
      <Link className="btn btn-secondary" to="/">
        Вернуться в каталог
      </Link>
    </section>
  );
}
