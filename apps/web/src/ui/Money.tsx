import { formatMoney } from '../domain/money';

export function Money({ value }: { value: number }) {
  return <span className="money">{formatMoney(value)}</span>;
}
