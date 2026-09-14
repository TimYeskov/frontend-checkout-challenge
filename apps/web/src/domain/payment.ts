import type { Order, Payment } from '@checkout/contracts';

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
