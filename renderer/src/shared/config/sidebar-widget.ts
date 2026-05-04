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

export type SidebarWidgetStyleVariant = 'compact' | 'balanced';

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

const MIN_ITEMS = 3;
const MAX_ITEMS = 10;
const DEFAULT_MAX = 8;

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
  maxItems: number;
  styleVariant: SidebarWidgetStyleVariant;
} {
  const enabledRaw = asMetricKeys(parseJsonArray(settings?.sidebar_widget_enabled_metrics));
  const orderRaw = asMetricKeys(parseJsonArray(settings?.sidebar_widget_order));
  const enabled = uniqueKeys(enabledRaw.length ? enabledRaw : [...SIDEBAR_CORE_METRICS]);
  const mergedOrder = uniqueKeys([...orderRaw, ...SIDEBAR_CORE_METRICS]);
  const maxRaw = Number(settings?.sidebar_widget_max_items);
  const maxItems = Number.isFinite(maxRaw) ? Math.max(MIN_ITEMS, Math.min(MAX_ITEMS, Math.floor(maxRaw))) : DEFAULT_MAX;
  const styleVariant: SidebarWidgetStyleVariant =
    settings?.sidebar_widget_style_variant === 'compact' ? 'compact' : 'balanced';
  return {
    enabledMetrics: enabled,
    order: mergedOrder,
    maxItems,
    styleVariant,
  };
}

export function resolveVisibleSidebarMetrics(
  enabledMetrics: SidebarMetricKey[],
  order: SidebarMetricKey[],
  maxItems: number
): SidebarMetricKey[] {
  const enabled = new Set(enabledMetrics);
  const orderedEnabled = order.filter((k) => enabled.has(k));
  const fallback = SIDEBAR_CORE_METRICS.filter((k) => enabled.has(k));
  const merged = uniqueKeys([...orderedEnabled, ...fallback]);
  return merged.slice(0, Math.max(MIN_ITEMS, Math.min(MAX_ITEMS, maxItems)));
}

