import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ id, label, error, hint, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control" data-describedby={describedBy}>
        {children}
      </div>
      {hint && !error ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ id, label, error, hint, ...props }: InputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </Field>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
};

export function SelectField({ id, label, error, children, ...props }: SelectProps) {
  return (
    <Field id={id} label={label} error={error}>
      <select
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {children}
      </select>
    </Field>
  );
}
