import type { ReactNode } from 'react';

type Kind = 'info' | 'error' | 'success';

export function Banner({
  kind = 'info',
  children,
}: {
  kind?: Kind;
  children: ReactNode;
}) {
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function StatusBlock({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="status-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
