import type { ContactValues } from '../domain/customer';
import type { FormErrors } from '../domain/validation';
import { TextField } from './Field';

const FIELDS = [
  {
    id: 'name' as const,
    label: 'Имя',
    autoComplete: 'name',
    maxLength: 100,
  },
  {
    id: 'email' as const,
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    maxLength: 150,
    hint: 'Например buyer@example.test',
  },
  {
    id: 'phone' as const,
    label: 'Телефон',
    type: 'tel',
    autoComplete: 'tel',
    inputMode: 'tel' as const,
    maxLength: 16,
    hint: 'Формат: +79990000000',
  },
];

type Props = {
  values: ContactValues;
  errors: FormErrors;
  onChange: (field: keyof ContactValues, value: string) => void;
  onBlurField: (field: keyof ContactValues) => void;
};

export function CustomerFields({ values, errors, onChange, onBlurField }: Props) {
  return (
    <fieldset className="card">
      <legend>Покупатель</legend>
      {FIELDS.map((field) => (
        <TextField
          key={field.id}
          id={field.id}
          label={field.label}
          type={field.type}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          maxLength={field.maxLength}
          hint={field.hint}
          value={values[field.id]}
          error={errors[field.id]}
          required
          onChange={(event) => onChange(field.id, event.target.value)}
          onBlur={() => onBlurField(field.id)}
        />
      ))}
    </fieldset>
  );
}
