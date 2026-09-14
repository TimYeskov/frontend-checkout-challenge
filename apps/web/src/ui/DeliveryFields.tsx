import type { DeliveryMethodOption } from '../api/resources';
import { deliveryChoices, pickupPointsOf, type DeliveryValues } from '../domain/delivery';
import type { FormErrors } from '../domain/validation';
import { ChoiceGroup } from './ChoiceGroup';
import { SelectField, TextField } from './Field';

const ADDRESS_FIELDS = [
  {
    id: 'city' as const,
    label: 'Город',
    autoComplete: 'address-level2',
    maxLength: 100,
    required: true,
  },
  {
    id: 'street' as const,
    label: 'Улица',
    autoComplete: 'address-line1',
    maxLength: 150,
    required: true,
  },
];

const HOUSE_FIELDS = [
  {
    id: 'house' as const,
    label: 'Дом',
    maxLength: 20,
    required: true,
  },
  {
    id: 'apartment' as const,
    label: 'Квартира',
    maxLength: 20,
    required: false,
  },
];

type AddressKey = 'city' | 'street' | 'house' | 'apartment' | 'pickupPointId' | 'deliveryMethod';

type Props = {
  values: DeliveryValues;
  errors: FormErrors;
  methods: DeliveryMethodOption[];
  onChange: (field: AddressKey, value: string) => void;
  onBlurField: (field: AddressKey) => void;
};

export function DeliveryFields({ values, errors, methods, onChange, onBlurField }: Props) {
  const choices = deliveryChoices(methods);
  const points = pickupPointsOf(methods);

  return (
    <>
      <ChoiceGroup
        name="delivery"
        legend="Доставка"
        value={values.deliveryMethod}
        error={errors.deliveryMethod}
        onChange={(value) => onChange('deliveryMethod', value)}
        options={
          choices.length
            ? choices
            : [
                { value: 'pickup', title: 'Самовывоз', description: 'Бесплатно' },
                { value: 'courier', title: 'Курьер', description: 'Стоимость посчитает сервер' },
              ]
        }
      />

      {values.deliveryMethod === 'pickup' ? (
        <div className="card">
          <SelectField
            id="pickupPointId"
            label="Пункт выдачи"
            value={values.pickupPointId}
            error={errors.pickupPointId}
            onChange={(event) => onChange('pickupPointId', event.target.value)}
            onBlur={() => onBlurField('pickupPointId')}
            required
          >
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.title} — {point.address}
              </option>
            ))}
          </SelectField>
        </div>
      ) : (
        <fieldset className="card">
          <legend>Адрес</legend>
          {ADDRESS_FIELDS.map((field) => (
            <TextField
              key={field.id}
              id={field.id}
              label={field.label}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              required={field.required}
              value={values[field.id]}
              error={errors[field.id]}
              onChange={(event) => onChange(field.id, event.target.value)}
              onBlur={() => onBlurField(field.id)}
            />
          ))}
          <div className="split">
            {HOUSE_FIELDS.map((field) => (
              <TextField
                key={field.id}
                id={field.id}
                label={field.label}
                maxLength={field.maxLength}
                required={field.required}
                value={values[field.id]}
                error={errors[field.id]}
                onChange={(event) => onChange(field.id, event.target.value)}
                onBlur={() => onBlurField(field.id)}
              />
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
