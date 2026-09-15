import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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
      className={`btn btn-${variant} ${pending ? 'is-pending' : ''} ${className}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {children}
    </button>
  );
}
