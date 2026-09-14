import type { Customer, Delivery } from '@checkout/contracts';
import type { CheckoutDraft } from '../persist/store';

export type FormErrors = Partial<Record<keyof CheckoutDraft, string>>;

const NAME = /^\S(?:.*\S)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{9,14}$/;
const NONEMPTY = /\S/;

export function validateDraft(draft: CheckoutDraft): FormErrors {
  const errors: FormErrors = {};
  if (draft.name.trim().length < 2 || draft.name.length > 100 || !NAME.test(draft.name.trim())) {
    errors.name = 'Укажите имя от 2 до 100 символов.';
  }
  if (!EMAIL.test(draft.email) || draft.email.length > 150) {
    errors.email = 'Укажите корректный email.';
  }
  if (!PHONE.test(draft.phone)) {
    errors.phone = 'Телефон в формате + и 10–15 цифр, например +79990000000.';
  }
  if (draft.deliveryMethod === 'pickup' && !draft.pickupPointId) {
    errors.pickupPointId = 'Выберите пункт выдачи.';
  }
  if (draft.deliveryMethod === 'courier') {
    if (draft.city.trim().length < 2 || !NONEMPTY.test(draft.city)) {
      errors.city = 'Укажите город.';
    }
    if (draft.street.trim().length < 2 || !NONEMPTY.test(draft.street)) {
      errors.street = 'Укажите улицу.';
    }
    if (!draft.house.trim() || !NONEMPTY.test(draft.house)) {
      errors.house = 'Укажите дом.';
    }
  }
  return errors;
}

export function isValid(errors: FormErrors): boolean {
  for (const key in errors) {
    if (Object.hasOwn(errors, key) && errors[key as keyof FormErrors]) return false;
  }
  return true;
}

export function customerFromDraft(draft: CheckoutDraft): Customer {
  return { name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() };
}

export function deliveryFromDraft(draft: CheckoutDraft): Delivery {
  if (draft.deliveryMethod === 'pickup') {
    return {
      method: 'pickup',
      pickupPointId: draft.pickupPointId as 'point-center' | 'point-north',
    };
  }
  return {
    method: 'courier',
    address: {
      city: draft.city.trim(),
      street: draft.street.trim(),
      house: draft.house.trim(),
      ...(draft.apartment.trim() ? { apartment: draft.apartment.trim() } : {}),
    },
  };
}
