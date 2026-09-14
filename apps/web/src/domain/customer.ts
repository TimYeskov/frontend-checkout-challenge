import type { Customer } from '@checkout/contracts';
import type { AppError } from '../http';
import { fieldMap } from '../http';
import type { CheckoutDraft } from '../persist/store';

export type ContactValues = Pick<CheckoutDraft, 'name' | 'email' | 'phone'>;
export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const NAME = /^\S(?:.*\S)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{9,14}$/;

export function validateCustomer(contact: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = contact.name.trim();
  if (name.length < 2 || name.length > 100 || !NAME.test(name)) {
    errors.name = 'Укажите имя от 2 до 100 символов.';
  }
  const email = contact.email.trim();
  if (!EMAIL.test(email) || email.length > 150) {
    errors.email = 'Укажите корректный email.';
  }
  const phone = contact.phone.trim();
  if (!PHONE.test(phone)) {
    errors.phone = 'Телефон в формате + и 10–15 цифр, например +79990000000.';
  }
  return errors;
}

export function customerFromDraft(draft: ContactValues): Customer {
  return { name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() };
}

export function toFormField(path: string): string {
  const dotted = path.replace(/^body\//, '').replaceAll('/', '.');
  return dotted.startsWith('customer.') ? dotted.slice('customer.'.length) : dotted;
}

export function contactErrorsFromApi(error: AppError): ContactErrors {
  const mapped = fieldMap(error);
  const result: ContactErrors = {};
  for (const path in mapped) {
    if (!Object.hasOwn(mapped, path)) continue;
    const key = toFormField(path);
    if (key === 'name' || key === 'email' || key === 'phone') result[key] = mapped[path];
  }
  return result;
}
