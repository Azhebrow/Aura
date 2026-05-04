export function getAppBaseUrl(): string {
  const base = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL : undefined;
  if (!base || typeof base !== 'string') return './';
  return base.endsWith('/') ? base : `${base}/`;
}
