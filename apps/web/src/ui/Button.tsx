import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
};

export function Button({
  pending = false,
  variant = 'primary',
  children,
  disabled,
  className = '',
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`btn btn-${variant} ${className}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? 'Подождите…' : children}
    </button>
  );
}
