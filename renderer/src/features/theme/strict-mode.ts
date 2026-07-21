export function isStrictVisualMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-strict-mode') === 'on';
}

export function strictModeForeground(fallback = '#111111'): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || fallback;
}

export function strictModeFaintFill(): { soft: string; faint: string } {
  if (typeof document === 'undefined') return { soft: 'rgba(0,0,0,0.14)', faint: 'rgba(0,0,0,0.025)' };
  const root = document.documentElement;
  const dark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'tinted';
  return dark
    ? { soft: 'rgba(255,255,255,0.18)', faint: 'rgba(255,255,255,0.035)' }
    : { soft: 'rgba(0,0,0,0.14)', faint: 'rgba(0,0,0,0.025)' };
}
