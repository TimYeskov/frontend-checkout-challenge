import type { CheckoutDraft } from '../persist/store';
import { validateCustomer } from './customer';
import { validateDelivery } from './delivery';

export type FormErrors = Partial<Record<keyof CheckoutDraft, string>>;

export function validateDraft(draft: CheckoutDraft): FormErrors {
  return { ...validateCustomer(draft), ...validateDelivery(draft) };
}

export function isValid(errors: FormErrors): boolean {
  for (const key in errors) {
    if (Object.hasOwn(errors, key) && errors[key as keyof FormErrors]) return false;
  }
  return true;
}
