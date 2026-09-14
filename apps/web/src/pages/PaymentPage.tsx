import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Order, Payment } from '@checkout/contracts';
import { api, type SandboxCard } from '../api/resources';
import {
  indexCards,
  isPaidOrder,
  isTerminalPayment,
  latestActivePayment,
  paymentOutcomeKind,
  paymentOutcomeMessage,
} from '../domain/payment';
import { isAbortError, pollUntil, toAppError, userMessage } from '../http';
import { loadState, newIdempotencyKey, patchState } from '../persist/store';
import { Banner, StatusBlock } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Money } from '../ui/Money';
import { SandboxCardFields } from '../ui/SandboxCardFields';
import { useAsyncAction } from '../ui/useAsyncAction';

export function PaymentPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const action = useAsyncAction();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [cards, setCards] = useState<SandboxCard[]>([]);
  const [cardId, setCardId] = useState('');
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<AbortController | null>(null);
  const cardsById = useMemo(() => indexCards(cards), [cards]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [orderResult, sandbox] = await Promise.all([
          api.order(orderId, controller.signal),
          api.sandbox(controller.signal),
        ]);
        setOrder(orderResult.data);
        setCards(sandbox.data.cards);
        if (sandbox.data.cards.length) setCardId(sandbox.data.cards[0].id);
        if (isPaidOrder(orderResult.data) || orderResult.data.paymentMethod !== 'card') {
          navigate(`/orders/${orderId}`, { replace: true });
          return;
        }
        await restorePayment(orderId, controller.signal);
      } catch (error) {
        if (!isAbortError(error)) action.setError(toAppError(error));
      }
    })();
    return () => {
      controller.abort();
      pollRef.current?.abort();
    };
  }, [orderId, navigate, action.setError]);

  async function restorePayment(id: string, signal: AbortSignal) {
    const stored = loadState();
    if (stored.paymentId && stored.orderId === id) {
      const existing = await api.payment(stored.paymentId, signal);
      setPayment(existing.data);
      if (!isTerminalPayment(existing.data.status)) await watch(existing.data.id);
      return;
    }
    const list = await api.payments(id, signal);
    const active = latestActivePayment(list.data);
    if (!active) return;
    patchState({ orderId: id, paymentId: active.id });
    setPayment(active);
    if (active.status === 'processing') await watch(active.id);
  }

  async function ensurePayment(): Promise<Payment> {
    if (payment && !isTerminalPayment(payment.status)) return payment;
    const stored = loadState();
    const key =
      stored.orderId === orderId && stored.paymentKey ? stored.paymentKey : newIdempotencyKey();
    patchState({ orderId, paymentKey: key });
    try {
      const created = await api.createPayment(orderId, key);
      patchState({ paymentId: created.data.id });
      setPayment(created.data);
      return created.data;
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code !== 'PAYMENT_IN_PROGRESS') throw appError;
      const list = await api.payments(orderId);
      const active = latestActivePayment(list.data);
      if (!active) throw appError;
      patchState({ paymentId: active.id });
      setPayment(active);
      return active;
    }
  }

  async function watch(paymentId: string, initialDelayMs?: number) {
    pollRef.current?.abort();
    const controller = new AbortController();
    pollRef.current = controller;
    setWaiting(true);
    const result = await pollUntil({
      signal: controller.signal,
      intervalMs: 800,
      initialDelayMs,
      load: async (signal) => {
        const response = await api.payment(paymentId, signal);
        return { value: response.data, retryAfterMs: response.retryAfterMs };
      },
      isDone: (value) => isTerminalPayment(value.status),
      onValue: (value) => setPayment(value),
    });
    if (controller.signal.aborted) return;
    setWaiting(false);
    if (!result) return;
    if (result.status !== 'succeeded') return;
    const confirmed = await api.order(orderId);
    if (isPaidOrder(confirmed.data)) navigate(`/orders/${orderId}`);
    else setOrder(confirmed.data);
  }

  async function pay() {
    const selected = cardsById.get(cardId);
    if (!selected) return;
    await action.run(async () => {
      const current = await ensurePayment();
      const started = await api.simulate(current.id, selected.scenario);
      setPayment((prev) =>
        prev
          ? { ...prev, status: started.data.status === 'processing' ? 'processing' : prev.status }
          : prev,
      );
      await watch(current.id, started.retryAfterMs);
    });
  }

  async function cancel() {
    await action.run(async () => {
      const current = await ensurePayment();
      const started = await api.simulate(current.id, 'cancel');
      await watch(current.id, started.retryAfterMs);
    });
  }

  function retry() {
    patchState({ paymentId: undefined, paymentKey: newIdempotencyKey() });
    setPayment(null);
    setWaiting(false);
    action.setError(null);
    if (cards.length) setCardId(cards[0].id);
  }

  if (!order && action.error) {
    return (
      <Banner kind="error">
        {userMessage(action.error)} <Link to="/">На главную</Link>
      </Banner>
    );
  }

  if (!order) return <Banner>Загружаем заказ…</Banner>;

  const terminal = payment ? isTerminalPayment(payment.status) : false;
  const showForm = !waiting && (!payment || payment.status === 'pending');

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Оплата</p>
          <h1>Заказ {order.number}</h1>
        </div>
      </header>
      <p className="total">
        К оплате: <Money value={order.total} />
      </p>
      {waiting ? <Banner>Проверяем статус оплаты…</Banner> : null}
      {action.error ? <Banner kind="error">{userMessage(action.error)}</Banner> : null}
      {payment && terminal ? (
        <Banner kind={paymentOutcomeKind(payment.status)}>
          {paymentOutcomeMessage(payment.status)}
        </Banner>
      ) : null}

      {showForm ? (
        <form
          className="card"
          onSubmit={(event) => {
            event.preventDefault();
            void pay();
          }}
        >
          <SandboxCardFields cards={cards} value={cardId} onChange={setCardId} />
          <div className="actions">
            <Button type="submit" pending={action.pending} disabled={!cardId}>
              Оплатить
            </Button>
            <Button
              type="button"
              variant="secondary"
              pending={action.pending}
              onClick={() => void cancel()}
            >
              Отмена
            </Button>
          </div>
          <p className="hint">
            Настоящий номер карты и CVC не нужны — выберите карту по названию и маске.
          </p>
        </form>
      ) : null}

      {terminal && payment?.status !== 'succeeded' ? (
        <div className="actions">
          <Button onClick={retry}>Оплатить снова</Button>
        </div>
      ) : null}

      {terminal && payment?.status === 'succeeded' ? (
        <StatusBlock title="Оплата принята">
          <Link className="btn btn-primary" to={`/orders/${orderId}`}>
            К заказу
          </Link>
        </StatusBlock>
      ) : null}
    </section>
  );
}
