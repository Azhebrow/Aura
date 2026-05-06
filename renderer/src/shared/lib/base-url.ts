export function getAppBaseUrl(): string {
  // In Electron with file:// protocol, use empty string for relative paths
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return '';
  }

  const base = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL : undefined;
  if (!base || typeof base !== 'string') return './';
  return base.endsWith('/') ? base : `${base}/`;
}
