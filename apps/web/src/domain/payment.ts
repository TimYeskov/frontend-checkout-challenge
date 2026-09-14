import type { Order, Payment } from '@checkout/contracts';
import type { PaymentMethodOption, SandboxCard } from '../api/resources';

const TERMINAL_PAYMENT = new Set(['succeeded', 'failed', 'cancelled']);

export function isTerminalPayment(status: Payment['status']): boolean {
  return TERMINAL_PAYMENT.has(status);
}

export function isPaidOrder(order: Order): boolean {
  return order.status === 'paid' && order.paymentStatus === 'succeeded';
}

export function isCashOrder(order: Order): boolean {
  return order.paymentMethod === 'cash_on_delivery' && order.status === 'confirmed';
}

export function isSuccessfulOrder(order: Order): boolean {
  return isPaidOrder(order) || isCashOrder(order);
}

export function paymentOutcomeMessage(status: Payment['status']): string {
  if (status === 'failed') return 'Банк отклонил карту. Можно оплатить этот заказ снова.';
  if (status === 'cancelled') return 'Оплата отменена. Можно вернуться к заказу и оплатить его.';
  if (status === 'succeeded') return 'Оплата подтверждена.';
  return 'Ожидаем подтверждение оплаты.';
}

export function paymentOutcomeKind(status: Payment['status']): 'info' | 'error' | 'success' {
  if (status === 'succeeded') return 'success';
  if (status === 'failed') return 'error';
  return 'info';
}

export function latestActivePayment(payments: readonly Payment[]): Payment | undefined {
  for (let i = 0; i < payments.length; i++) {
    const status = payments[i].status;
    if (status === 'pending' || status === 'processing') return payments[i];
  }
}

export function paymentChoices(methods: readonly PaymentMethodOption[]) {
  const choices = new Array<{ value: PaymentMethodOption['id']; title: string }>(methods.length);
  for (let i = 0; i < methods.length; i++) {
    choices[i] = { value: methods[i].id, title: methods[i].title };
  }
  return choices;
}

export function cardChoices(cards: readonly SandboxCard[]) {
  const choices = new Array<{ value: string; title: string; description: string }>(cards.length);
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    choices[i] = { value: card.id, title: card.title, description: card.maskedNumber };
  }
  return choices;
}

export function indexCards(cards: readonly SandboxCard[]): Map<string, SandboxCard> {
  const map = new Map<string, SandboxCard>();
  for (let i = 0; i < cards.length; i++) map.set(cards[i].id, cards[i]);
  return map;
}
