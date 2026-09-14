export type CheckoutDraft = {
  name: string;
  email: string;
  phone: string;
  deliveryMethod: 'pickup' | 'courier';
  pickupPointId: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  paymentMethod: 'card' | 'cash_on_delivery';
};

export type PersistedState = {
  token?: string;
  sessionId?: string;
  orderId?: string;
  paymentId?: string;
  orderKey?: string;
  paymentKey?: string;
  draft?: CheckoutDraft;
};

const STORAGE_KEY = 'checkout.session.v1';

export function emptyDraft(): CheckoutDraft {
  return {
    name: '',
    email: '',
    phone: '',
    deliveryMethod: 'pickup',
    pickupPointId: 'point-center',
    city: 'Учебный',
    street: '',
    house: '',
    apartment: '',
    paymentMethod: 'card',
  };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveState(next: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function patchState(patch: Partial<PersistedState>): PersistedState {
  const current = loadState();
  const next: PersistedState = { ...current, ...patch };
  saveState(next);
  return next;
}

export function clearCheckoutFlow(): void {
  const current = loadState();
  saveState({
    token: current.token,
    sessionId: current.sessionId,
    draft: current.draft,
  });
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
