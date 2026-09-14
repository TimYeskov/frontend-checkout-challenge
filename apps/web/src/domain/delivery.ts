import type { Delivery, Quote } from '@checkout/contracts';
import type { AppError } from '../http';
import { fieldMap } from '../http';
import type { CheckoutDraft } from '../persist/store';
import type { DeliveryMethodOption } from '../api/resources';
import { formatMoney } from './money';

export type DeliveryValues = Pick<
  CheckoutDraft,
  'deliveryMethod' | 'pickupPointId' | 'city' | 'street' | 'house' | 'apartment'
>;

export type DeliveryErrors = Partial<
  Record<'deliveryMethod' | 'pickupPointId' | 'city' | 'street' | 'house' | 'apartment', string>
>;

const NONEMPTY = /\S/;
const PICKUP_IDS = new Set(['point-center', 'point-north']);

export function validateDelivery(values: DeliveryValues): DeliveryErrors {
  const errors: DeliveryErrors = {};
  if (values.deliveryMethod === 'pickup') {
    if (!PICKUP_IDS.has(values.pickupPointId)) {
      errors.pickupPointId = 'Выберите пункт выдачи.';
    }
    return errors;
  }
  const city = values.city.trim();
  if (city.length < 2 || city.length > 100 || !NONEMPTY.test(city)) {
    errors.city = 'Укажите город.';
  }
  const street = values.street.trim();
  if (street.length < 2 || street.length > 150 || !NONEMPTY.test(street)) {
    errors.street = 'Укажите улицу.';
  }
  const house = values.house.trim();
  if (!house || house.length > 20 || !NONEMPTY.test(house)) {
    errors.house = 'Укажите дом.';
  }
  if (values.apartment.trim().length > 20) {
    errors.apartment = 'Квартира — не больше 20 символов.';
  }
  return errors;
}

export function isDeliveryReady(values: DeliveryValues): boolean {
  const errors = validateDelivery(values);
  for (const key in errors) {
    if (Object.hasOwn(errors, key) && errors[key as keyof DeliveryErrors]) return false;
  }
  return true;
}

export function deliveryFromDraft(values: DeliveryValues): Delivery {
  if (values.deliveryMethod === 'pickup') {
    return {
      method: 'pickup',
      pickupPointId: values.pickupPointId as 'point-center' | 'point-north',
    };
  }
  return {
    method: 'courier',
    address: {
      city: values.city.trim(),
      street: values.street.trim(),
      house: values.house.trim(),
      ...(values.apartment.trim() ? { apartment: values.apartment.trim() } : {}),
    },
  };
}

export function sameDelivery(quote: Quote, values: DeliveryValues): boolean {
  const next = deliveryFromDraft(values);
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

const PICKUP_TITLE: Record<string, string> = {
  'point-center': 'Центральный пункт',
  'point-north': 'Северный пункт',
};

export function formatDelivery(delivery: Delivery): string {
  if (delivery.method === 'pickup') {
    return `Самовывоз: ${PICKUP_TITLE[delivery.pickupPointId] ?? delivery.pickupPointId}`;
  }
  const apartment = delivery.address.apartment ? `, кв. ${delivery.address.apartment}` : '';
  return `Курьер: ${delivery.address.city}, ${delivery.address.street}, ${delivery.address.house}${apartment}`;
}

export function pickupPointsOf(
  methods: DeliveryMethodOption[],
): DeliveryMethodOption['pickupPoints'] {
  for (let i = 0; i < methods.length; i++) {
    if (methods[i].id === 'pickup') return methods[i].pickupPoints;
  }
  return [];
}

export function deliveryChoices(methods: DeliveryMethodOption[]) {
  const choices = new Array<{ value: 'pickup' | 'courier'; title: string; description: string }>(
    methods.length,
  );
  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    choices[i] = {
      value: method.id,
      title: method.title,
      description: shippingHint(method),
    };
  }
  return choices;
}

function shippingHint(method: DeliveryMethodOption): string {
  if (method.price === 0) return 'Бесплатно';
  if (method.freeFrom != null) {
    return `${formatMoney(method.price)}, бесплатно от ${formatMoney(method.freeFrom)}`;
  }
  return formatMoney(method.price);
}

function toDeliveryField(path: string): keyof DeliveryErrors | undefined {
  const dotted = path.replace(/^body\//, '').replaceAll('/', '.');
  if (dotted === 'delivery.method') return 'deliveryMethod';
  if (dotted === 'delivery.pickupPointId') return 'pickupPointId';
  if (dotted.startsWith('delivery.address.')) {
    const key = dotted.slice('delivery.address.'.length);
    if (key === 'city' || key === 'street' || key === 'house' || key === 'apartment') return key;
  }
  return undefined;
}

export function deliveryErrorsFromApi(error: AppError): DeliveryErrors {
  const mapped = fieldMap(error);
  const result: DeliveryErrors = {};
  for (const path in mapped) {
    if (!Object.hasOwn(mapped, path)) continue;
    const key = toDeliveryField(path);
    if (key) result[key] = mapped[path];
  }
  return result;
}
