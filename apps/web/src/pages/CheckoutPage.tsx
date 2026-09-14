import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Quote } from '@checkout/contracts';
import { api, type CheckoutOptions } from '../api/resources';
import {
  customerFromDraft,
  deliveryFromDraft,
  isValid,
  validateDraft,
  type FormErrors,
} from '../domain/validation';
import { fieldMap, isAbortError, toAppError, userMessage } from '../http';
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
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { SelectField, TextField } from '../ui/Field';
import { Money } from '../ui/Money';
import { useAsyncAction } from '../ui/useAsyncAction';

function sameDelivery(quote: Quote, draft: CheckoutDraft): boolean {
  const next = deliveryFromDraft(draft);
  if (quote.delivery.method !== next.method) return false;
  if (next.method === 'pickup' && quote.delivery.method === 'pickup') {
    return quote.delivery.pickupPointId === next.pickupPointId;
  }
  if (next.method === 'courier' && quote.delivery.method === 'courier') {
    const left = quote.delivery.address;
    const right = next.address;
    return (
      left.city === right.city &&
      left.street === right.street &&
      left.house === right.house &&
      (left.apartment ?? '') === (right.apartment ?? '')
    );
  }
  return false;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, refresh } = useShop();
  const action = useAsyncAction();
  const [draft, setDraft] = useState<CheckoutDraft>(() => loadState().draft ?? emptyDraft());
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const quoteGen = useRef(0);
  const quoteRef = useRef<Quote | null>(null);
  quoteRef.current = quote;

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

  const pickupPoints = useMemo(() => {
    const methods = options?.deliveryMethods;
    if (!methods) return [];
    for (let i = 0; i < methods.length; i++) {
      if (methods[i].id === 'pickup') return methods[i].pickupPoints;
    }
    return [];
  }, [options]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    const deliveryCheck = validateDraft({
      ...draft,
      name: 'Имя',
      email: 'buyer@example.test',
      phone: '+79990000000',
    });
    const deliveryReady =
      draft.deliveryMethod === 'pickup'
        ? !deliveryCheck.pickupPointId
        : !deliveryCheck.city && !deliveryCheck.street && !deliveryCheck.house;
    if (!deliveryReady) return;

    const current = (quoteGen.current += 1);
    const delay = draft.deliveryMethod === 'courier' ? 400 : 0;
    const timer = window.setTimeout(() => {
      void (async () => {
        const existing = quoteRef.current;
        if (existing && existing.cartVersion === cart.version && sameDelivery(existing, draft)) {
          return;
        }
        try {
          const created = await api.createQuote(cart.version, deliveryFromDraft(draft));
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
  }, [cart, draft, refresh, action]);

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
        setFieldErrors({ ...errors, ...fieldMap(appError) });
        throw appError;
      }
    });
  }

  const paymentOptions =
    options?.paymentMethods.map((method) => ({
      value: method.id,
      title: method.title,
    })) ?? [];

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
        <fieldset className="card">
          <legend>Покупатель</legend>
          <TextField
            id="name"
            label="Имя"
            autoComplete="name"
            value={draft.name}
            error={fieldErrors.name}
            onChange={(event) => update('name', event.target.value)}
            required
          />
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={draft.email}
            error={fieldErrors.email}
            onChange={(event) => update('email', event.target.value)}
            required
          />
          <TextField
            id="phone"
            label="Телефон"
            type="tel"
            autoComplete="tel"
            value={draft.phone}
            error={fieldErrors.phone}
            hint="Формат: +79990000000"
            onChange={(event) => update('phone', event.target.value)}
            required
          />
        </fieldset>

        <ChoiceGroup
          name="delivery"
          legend="Доставка"
          value={draft.deliveryMethod}
          onChange={(value) => update('deliveryMethod', value)}
          options={[
            { value: 'pickup', title: 'Самовывоз', description: 'Бесплатно, пункт выдачи' },
            { value: 'courier', title: 'Курьер', description: '390 ₽, бесплатно от 5 000 ₽' },
          ]}
        />

        {draft.deliveryMethod === 'pickup' ? (
          <SelectField
            id="pickupPointId"
            label="Пункт выдачи"
            value={draft.pickupPointId}
            error={fieldErrors.pickupPointId}
            onChange={(event) => update('pickupPointId', event.target.value)}
          >
            {pickupPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.title} — {point.address}
              </option>
            ))}
          </SelectField>
        ) : (
          <fieldset className="card">
            <legend>Адрес</legend>
            <TextField
              id="city"
              label="Город"
              autoComplete="address-level2"
              value={draft.city}
              error={fieldErrors.city}
              onChange={(event) => update('city', event.target.value)}
              required
            />
            <TextField
              id="street"
              label="Улица"
              autoComplete="address-line1"
              value={draft.street}
              error={fieldErrors.street}
              onChange={(event) => update('street', event.target.value)}
              required
            />
            <div className="split">
              <TextField
                id="house"
                label="Дом"
                value={draft.house}
                error={fieldErrors.house}
                onChange={(event) => update('house', event.target.value)}
                required
              />
              <TextField
                id="apartment"
                label="Квартира"
                value={draft.apartment}
                error={fieldErrors.apartment}
                onChange={(event) => update('apartment', event.target.value)}
              />
            </div>
          </fieldset>
        )}

        <ChoiceGroup
          name="payment"
          legend="Оплата"
          value={draft.paymentMethod}
          onChange={(value) => update('paymentMethod', value)}
          options={
            paymentOptions.length
              ? paymentOptions
              : [
                  { value: 'card', title: 'Картой онлайн' },
                  { value: 'cash_on_delivery', title: 'Наличными при получении' },
                ]
          }
        />

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
            <p className="muted">Сумма появится после выбора доставки.</p>
          )}
          <Button type="submit" pending={action.pending} disabled={!quote}>
            Подтвердить заказ
          </Button>
        </aside>
      </form>
    </section>
  );
}
