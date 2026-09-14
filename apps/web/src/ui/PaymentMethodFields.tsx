import type { PaymentMethodOption } from '../api/resources';
import { paymentChoices } from '../domain/payment';
import { ChoiceGroup } from './ChoiceGroup';

type Props = {
  value: PaymentMethodOption['id'];
  methods: readonly PaymentMethodOption[];
  onChange: (value: PaymentMethodOption['id']) => void;
};

export function PaymentMethodFields({ value, methods, onChange }: Props) {
  const choices = paymentChoices(methods);
  return (
    <ChoiceGroup
      name="payment"
      legend="Оплата"
      value={value}
      onChange={onChange}
      options={
        choices.length
          ? choices
          : [
              { value: 'card', title: 'Картой онлайн (тестовая оплата)' },
              { value: 'cash_on_delivery', title: 'Наличными при получении' },
            ]
      }
    />
  );
}
