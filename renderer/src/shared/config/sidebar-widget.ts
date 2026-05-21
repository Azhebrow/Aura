import type { AuraRow } from '@/types/aura';

export type SidebarMetricKey =
  | 'day-progress'
  | 'daily-points'
  | 'focus-time'
  | 'rituals'
  | 'calories'
  | 'transactions'
  | 'balance'
  | 'streak';

export const SIDEBAR_CORE_METRICS: readonly SidebarMetricKey[] = [
  'day-progress',
  'daily-points',
  'focus-time',
  'rituals',
  'calories',
  'transactions',
  'balance',
  'streak',
] as const;

export const SIDEBAR_METRIC_LABELS: Readonly<Record<SidebarMetricKey, string>> = {
  'day-progress': 'Прогресс дня',
  'daily-points': 'Очки',
  'focus-time': 'Фокус',
  rituals: 'Ритуалы',
  calories: 'Ккал',
  transactions: 'Транзакции',
  balance: 'Баланс',
  streak: 'Серия',
};

const MIN_ENABLED = 3;

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function uniqueKeys(keys: readonly SidebarMetricKey[]): SidebarMetricKey[] {
  return Array.from(new Set(keys));
}

function asMetricKeys(raw: string[]): SidebarMetricKey[] {
  const allowed = new Set<SidebarMetricKey>(SIDEBAR_CORE_METRICS);
  return raw.filter((k): k is SidebarMetricKey => allowed.has(k as SidebarMetricKey));
}

export function getSidebarWidgetSettings(settings: AuraRow | null | undefined): {
  enabledMetrics: SidebarMetricKey[];
  order: SidebarMetricKey[];
} {
  const enabledRaw = asMetricKeys(parseJsonArray(settings?.sidebar_widget_enabled_metrics));
  const orderRaw = asMetricKeys(parseJsonArray(settings?.sidebar_widget_order));
  const enabled = uniqueKeys(enabledRaw.length ? enabledRaw : [...SIDEBAR_CORE_METRICS]);
  return {
    enabledMetrics: enabled.length >= MIN_ENABLED ? enabled : [...SIDEBAR_CORE_METRICS],
    order: uniqueKeys([...orderRaw, ...SIDEBAR_CORE_METRICS]),
  };
}

export function resolveVisibleSidebarMetrics(
  enabledMetrics: SidebarMetricKey[],
  order: SidebarMetricKey[]
): SidebarMetricKey[] {
  const enabled = new Set(enabledMetrics);
  return uniqueKeys([...order.filter((k) => enabled.has(k)), ...SIDEBAR_CORE_METRICS.filter((k) => enabled.has(k))]);
}
