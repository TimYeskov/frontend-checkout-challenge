const ruble = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

export function formatMoney(kopecks: number): string {
  return ruble.format(kopecks / 100);
}
