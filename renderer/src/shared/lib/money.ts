const SYMBOLS: Record<string, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KZT: '₸',
  BYN: 'Br',
  PLN: 'zł',
  TRY: '₺',
  AED: 'د.إ',
  CZK: 'Kč',
  HUF: 'Ft',
  NOK: 'kr',
  SEK: 'kr',
  CHF: 'Fr',
  JPY: '¥',
  CNY: '¥',
};

export function currencySymbol(code: string | undefined): string {
  if (!code) return SYMBOLS.RUB;
  const c = code.toUpperCase();
  return SYMBOLS[c] ?? c;
}

export function formatAmount(amount: unknown, currencyCode: string | undefined): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '—';
  const sym = currencySymbol(currencyCode);
  return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${sym}`;
}
