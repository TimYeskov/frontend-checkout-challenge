import type {
  Cart,
  CartItem,
  CreateOrder,
  Customer,
  Delivery,
  Order,
  Payment,
  Product,
  Quote,
  Scenario,
  Simulation,
} from '@checkout/contracts';
import { createClient } from '../http/client';
import type { RequestSpec, SuccessPayload } from '../http/types';
import { AppError } from '../http/errors';
import { loadState, patchState } from '../persist/store';

export type CheckoutOptions = {
  cart: Cart;
  deliveryMethods: DeliveryMethodOption[];
  paymentMethods: PaymentMethodOption[];
};

export type DeliveryMethodOption = {
  id: 'pickup' | 'courier';
  title: string;
  price: number;
  freeFrom: number | null;
  pickupPoints: { id: string; title: string; address: string }[];
};

export type PaymentMethodOption = {
  id: 'card' | 'cash_on_delivery';
  title: string;
};

export type SandboxCard = {
  id: string;
  title: string;
  maskedNumber: string;
  scenario: Exclude<Scenario, 'cancel'>;
};

export type Sandbox = {
  settlementDelayMs: number;
  cards: SandboxCard[];
};

let token = loadState().token;
let inflightSession: Promise<void> | undefined;

const client = createClient({
  readToken: () => token,
});

function setSession(nextToken: string, sessionId?: string) {
  token = nextToken;
  patchState({ token: nextToken, sessionId: sessionId ?? loadState().sessionId });
}

export function getSessionToken(): string | undefined {
  return token;
}

async function execute<T>(spec: RequestSpec, retried = false): Promise<SuccessPayload<T>> {
  try {
    return await client.execute<T>(spec);
  } catch (error) {
    if (
      !retried &&
      spec.auth !== false &&
      error instanceof AppError &&
      error.status === 401
    ) {
      await createSession();
      return execute<T>(spec, true);
    }
    throw error;
  }
}

export async function createSession(): Promise<void> {
  const result = await client.execute<{ id: string; token: string; cart: Cart }>({
    method: 'POST',
    path: '/api/sessions',
    body: {},
    auth: false,
  });
  setSession(result.data.token, result.data.id);
}

export async function ensureSession(): Promise<void> {
  if (!inflightSession) {
    inflightSession = (async () => {
      if (!token) {
        await createSession();
        return;
      }
      try {
        await client.execute<Cart>({ method: 'GET', path: '/api/cart' });
      } catch (error) {
        if (error instanceof AppError && error.status === 401) {
          await createSession();
          return;
        }
        throw error;
      }
    })().finally(() => {
      inflightSession = undefined;
    });
  }
  return inflightSession;
}

export const api = {
  products: (signal?: AbortSignal) =>
    execute<Product[]>({ method: 'GET', path: '/api/products', auth: false, signal }),

  sandbox: (signal?: AbortSignal) =>
    execute<Sandbox>({ method: 'GET', path: '/api/sandbox', auth: false, signal }),

  cart: (signal?: AbortSignal) => execute<Cart>({ method: 'GET', path: '/api/cart', signal }),

  setItem: (productId: string, quantity: number, signal?: AbortSignal) =>
    execute<CartItem>({
      method: 'PUT',
      path: `/api/cart/items/${productId}`,
      body: { quantity },
      signal,
    }),

  removeItem: (productId: string, signal?: AbortSignal) =>
    execute<undefined>({
      method: 'DELETE',
      path: `/api/cart/items/${productId}`,
      signal,
    }),

  checkoutOptions: (signal?: AbortSignal) =>
    execute<CheckoutOptions>({ method: 'GET', path: '/api/checkout/options', signal }),

  createQuote: (cartVersion: number, delivery: Delivery, signal?: AbortSignal) =>
    execute<Quote>({
      method: 'POST',
      path: '/api/quotes',
      body: { cartVersion, delivery },
      signal,
    }),

  quote: (quoteId: string, signal?: AbortSignal) =>
    execute<Quote>({ method: 'GET', path: `/api/quotes/${quoteId}`, signal }),

  createOrder: (body: CreateOrder, idempotencyKey: string, signal?: AbortSignal) =>
    execute<Order>({
      method: 'POST',
      path: '/api/orders',
      body,
      idempotencyKey,
      signal,
    }),

  orders: (signal?: AbortSignal) => execute<Order[]>({ method: 'GET', path: '/api/orders', signal }),

  order: (orderId: string, signal?: AbortSignal) =>
    execute<Order>({ method: 'GET', path: `/api/orders/${orderId}`, signal }),

  createPayment: (orderId: string, idempotencyKey: string, signal?: AbortSignal) =>
    execute<Payment>({
      method: 'POST',
      path: `/api/orders/${orderId}/payments`,
      body: {},
      idempotencyKey,
      signal,
    }),

  payments: (orderId: string, signal?: AbortSignal) =>
    execute<Payment[]>({ method: 'GET', path: `/api/orders/${orderId}/payments`, signal }),

  payment: (paymentId: string, signal?: AbortSignal) =>
    execute<Payment>({ method: 'GET', path: `/api/payments/${paymentId}`, signal }),

  simulate: (paymentId: string, scenario: Scenario, signal?: AbortSignal) =>
    execute<Simulation>({
      method: 'POST',
      path: `/api/payments/${paymentId}/simulations`,
      body: { scenario },
      signal,
    }),
};

export type { Cart, CartItem, CreateOrder, Customer, Delivery, Order, Payment, Product, Quote };
