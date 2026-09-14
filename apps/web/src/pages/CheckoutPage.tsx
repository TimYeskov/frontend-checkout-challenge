import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Quote } from '@checkout/contracts';
import { api, type CheckoutOptions } from '../api/resources';
import {
  contactErrorsFromApi,
  customerFromDraft,
  validateCustomer,
  type ContactValues,
} from '../domain/customer';
import {
  deliveryErrorsFromApi,
  deliveryFromDraft,
  isDeliveryReady,
  sameDelivery,
  validateDelivery,
  type DeliveryValues,
} from '../domain/delivery';
import { isValid, validateDraft, type FormErrors } from '../domain/validation';
import { isAbortError, toAppError, userMessage } from '../http';
import {
  emptyDraft,
  loadState,
  newIdempotencyKey,
  patchState,
  type CheckoutDraft,
} from '../persist/store';
import { useShop } from '../state/ShopContext';
import { Banner, StatusBlock } from '../ui/Banner';
import { Button } from '../ui/Button';
import { CustomerFields } from '../ui/CustomerFields';
import { DeliveryFields } from '../ui/DeliveryFields';
import { Money } from '../ui/Money';
import { PaymentMethodFields } from '../ui/PaymentMethodFields';
import { useAsyncAction } from '../ui/useAsyncAction';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, loading, refresh } = useShop();
  const action = useAsyncAction();
  const [draft, setDraft] = useState<CheckoutDraft>(() => loadState().draft ?? emptyDraft());
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const quoteGen = useRef(0);
  const quoteRef = useRef<Quote | null>(null);
  const draftRef = useRef(draft);
  quoteRef.current = quote;
  draftRef.current = draft;

  useEffect(() => {
    patchState({ draft });
  }, [draft]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await api.checkoutOptions(controller.signal);
        setOptions(result.data);
      } catch (error) {
        if (!isAbortError(error)) setOptionsError(userMessage(toAppError(error)));
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    if (!isDeliveryReady(draftRef.current)) {
      quoteGen.current += 1;
      if (quoteRef.current) setQuote(null);
      return;
    }

    const current = (quoteGen.current += 1);
    const delay = draftRef.current.deliveryMethod === 'courier' ? 400 : 0;
    const timer = window.setTimeout(() => {
      void (async () => {
        const existing = quoteRef.current;
        const values = draftRef.current;
        if (existing && existing.cartVersion === cart.version && sameDelivery(existing, values)) {
          return;
        }
        try {
          const created = await api.createQuote(cart.version, deliveryFromDraft(values));
          if (current !== quoteGen.current) return;
          setQuote(created.data);
          setNotice(null);
        } catch (error) {
          if (current !== quoteGen.current || isAbortError(error)) return;
          const appError = toAppError(error);
          if (appError.code === 'CART_VERSION_CONFLICT' || appError.code === 'CART_EMPTY') {
            await refresh();
            setNotice(userMessage(appError));
            return;
          }
          action.setError(appError);
        }
      })();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    cart,
    draft.deliveryMethod,
    draft.pickupPointId,
    draft.city,
    draft.street,
    draft.house,
    draft.apartment,
    refresh,
    action.setError,
  ]);

  if (loading && !cart) {
    return <Banner>Загружаем оформление…</Banner>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <StatusBlock title="Нечего оформлять">
        <p>Корзина пуста. Добавьте товар и вернитесь к оформлению.</p>
        <Link className="btn btn-primary" to="/">
          К каталогу
        </Link>
      </StatusBlock>
    );
  }

  function blurContact(field: keyof ContactValues) {
    const message = validateCustomer(draft)[field];
    setFieldErrors((current) => {
      if (message) return { ...current, [field]: message };
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function blurDelivery(field: keyof DeliveryValues) {
    const message = validateDelivery(draft)[field];
    setFieldErrors((current) => {
      if (message) return { ...current, [field]: message };
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function update<K extends keyof CheckoutDraft>(key: K, value: CheckoutDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit() {
    const errors = validateDraft(draft);
    setFieldErrors(errors);
    if (!isValid(errors) || !cart) return;

    await action.run(async () => {
      const delivery = deliveryFromDraft(draft);
      let currentQuote = quoteRef.current;
      if (
        !currentQuote ||
        currentQuote.cartVersion !== cart.version ||
        !sameDelivery(currentQuote, draft)
      ) {
        currentQuote = (await api.createQuote(cart.version, delivery)).data;
        setQuote(currentQuote);
      }

      const body = {
        quoteId: currentQuote.id,
        paymentMethod: draft.paymentMethod,
        customer: customerFromDraft(draft),
      };
      const stored = loadState();
      const key = stored.orderKey ?? newIdempotencyKey();
      patchState({ orderKey: key });

      try {
        const created = await api.createOrder(body, key);
        patchState({
          orderId: created.data.id,
          orderKey: undefined,
          paymentId: undefined,
          paymentKey: undefined,
        });
        await refresh();
        if (created.data.paymentMethod === 'card') {
          navigate(`/orders/${created.data.id}/pay`);
        } else {
          navigate(`/orders/${created.data.id}`);
        }
      } catch (error) {
        const appError = toAppError(error);
        if (appError.code === 'QUOTE_EXPIRED' || appError.code === 'CART_VERSION_CONFLICT') {
          await refresh();
          const nextCart = (await api.cart()).data;
          if (nextCart.items.length) {
            const nextQuote = (await api.createQuote(nextCart.version, delivery)).data;
            setQuote(nextQuote);
            patchState({ orderKey: newIdempotencyKey() });
          }
          setNotice(userMessage(appError));
          return;
        }
        setFieldErrors({
          ...errors,
          ...contactErrorsFromApi(appError),
          ...deliveryErrorsFromApi(appError),
        });
        throw appError;
      }
    });
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Оформление</p>
          <h1>Контакты и доставка</h1>
        </div>
      </header>
      {notice ? <Banner>{notice}</Banner> : null}
      {optionsError ? <Banner kind="error">{optionsError}</Banner> : null}
      {action.error ? <Banner kind="error">{userMessage(action.error)}</Banner> : null}

      <form
        className="checkout"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="checkout-main">
          <CustomerFields
            values={draft}
            errors={fieldErrors}
            onChange={(field, value) => update(field, value)}
            onBlurField={blurContact}
          />

          <DeliveryFields
            values={draft}
            errors={fieldErrors}
            methods={options?.deliveryMethods ?? []}
            onChange={(field, value) => update(field, value)}
            onBlurField={blurDelivery}
          />

          <PaymentMethodFields
            value={draft.paymentMethod}
            methods={options?.paymentMethods ?? []}
            onChange={(value) => update('paymentMethod', value)}
          />
        </div>

        <aside className="summary card">
          <h2>Сумма</h2>
          {quote ? (
            <>
              <p>
                Товары: <Money value={quote.subtotal} />
              </p>
              <p>
                Доставка: <Money value={quote.shipping} />
              </p>
              <p className="total">
                Итого: <Money value={quote.total} />
              </p>
            </>
          ) : (
            <p className="muted">
              {draft.deliveryMethod === 'courier'
                ? 'Укажите адрес — стоимость доставки пришлёт сервер.'
                : 'Сумма появится после выбора доставки.'}
            </p>
          )}
          <Button type="submit" pending={action.pending} disabled={!quote}>
            Подтвердить заказ
          </Button>
        </aside>
      </form>
    </section>
  );
}
