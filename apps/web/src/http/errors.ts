import type { ApiFailure, FieldError } from './types';

export class AppError extends Error {
  readonly kind: ApiFailure['kind'];
  readonly status?: number;
  readonly code?: string;
  readonly fields?: FieldError[];
  readonly requestId?: string;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = 'AppError';
    this.kind = failure.kind;
    this.status = failure.status;
    this.code = failure.code;
    this.fields = failure.fields;
    this.requestId = failure.requestId;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function isAbortError(value: unknown): boolean {
  return (
    (value instanceof DOMException && value.name === 'AbortError') ||
    (value instanceof Error && value.name === 'AbortError')
  );
}

export function toAppError(value: unknown): AppError {
  if (value instanceof AppError) return value;
  if (isAbortError(value)) {
    return new AppError({ kind: 'network', message: 'Запрос отменён.' });
  }
  return new AppError({
    kind: 'network',
    message: 'Нет соединения с сервером. Проверьте сеть и повторите.',
  });
}

const CONFLICT_HINTS: Record<string, string> = {
  CART_VERSION_CONFLICT: 'Корзина изменилась. Обновили данные — можно продолжить оформление.',
  QUOTE_EXPIRED: 'Расчёт доставки устарел. Обновили сумму — отправьте заказ ещё раз.',
  INSUFFICIENT_STOCK: 'Недостаточно товара. Уменьшите количество.',
  CART_EMPTY: 'Корзина пуста. Добавьте товары, чтобы оформить заказ.',
  CARD_DECLINED: 'Банк отклонил карту. Можно оплатить этот заказ другой картой.',
  PAYMENT_IN_PROGRESS: 'Оплата этого заказа уже обрабатывается.',
  ORDER_ALREADY_PAID: 'Заказ уже оплачен.',
  SESSION_INVALID: 'Сессия истекла. Создаём новую и продолжаем.',
};

export function userMessage(error: AppError): string {
  if (error.code && Object.hasOwn(CONFLICT_HINTS, error.code)) return CONFLICT_HINTS[error.code];
  return error.message;
}

export function fieldMap(error: AppError): Record<string, string> {
  const result: Record<string, string> = {};
  const fields = error.fields;
  if (!fields) return result;
  for (let i = 0; i < fields.length; i++) {
    const item = fields[i];
    const key = item.path.replace(/^body\//, '').replaceAll('/', '.');
    if (!Object.hasOwn(result, key)) result[key] = item.message;
  }
  return result;
}
