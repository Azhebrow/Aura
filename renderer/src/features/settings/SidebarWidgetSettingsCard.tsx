import { useCallback, useEffect, useMemo } from 'react';
import { BookOpen, CalendarDays, Flame, HandCoins, PanelLeft, Timer, TrendingUp, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import {
  getSidebarWidgetSettings,
  SIDEBAR_CORE_METRICS,
  SIDEBAR_METRIC_LABELS,
  type SidebarMetricKey,
} from '@/shared/config/sidebar-widget';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { cn } from '@/lib/utils';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

const METRIC_ICONS: Record<SidebarMetricKey, LucideIcon> = {
  'day-progress': CalendarDays,
  'daily-points': TrendingUp,
  'focus-time': Timer,
  rituals: Flame,
  calories: UtensilsCrossed,
  transactions: HandCoins,
  balance: Wallet,
  streak: BookOpen,
};

function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

function MetricPill({ metricKey, checked, onChange }: { metricKey: SidebarMetricKey; checked: boolean; onChange: (checked: boolean) => void }) {
  const Icon = METRIC_ICONS[metricKey];
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium aura-tx-colors outline-none active:scale-[0.97]',
        'focus-visible:ring-2 focus-visible:ring-ring/60',
        checked
          ? 'border-primary/25 bg-primary/10 text-foreground'
          : 'border-[var(--aura-border-soft)] bg-transparent text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground',
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', checked ? 'text-primary' : 'opacity-40')} aria-hidden />
      <span className="truncate">{SIDEBAR_METRIC_LABELS[metricKey]}</span>
    </button>
  );
}

export function SidebarWidgetSettingsCard() {
  const { db, ready } = useAuraDb();
  const [enabledMetrics, setEnabledMetrics] = useState<SidebarMetricKey[]>([]);

  const reload = useCallback(() => {
    if (!db) return;
    const settings = db.getAppSettings() as AuraRow | null;
    setEnabledMetrics(getSidebarWidgetSettings(settings).enabledMetrics);
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

  const enabledSet = useMemo(() => new Set(enabledMetrics), [enabledMetrics]);

  const saveMetrics = useCallback(
    (next: SidebarMetricKey[]) => {
      if (!db) return;
      const safe = next.length >= 3 ? next : enabledMetrics;
      setEnabledMetrics(safe);
      mergeSave(db, { sidebar_widget_enabled_metrics: JSON.stringify(safe) });
    },
    [db, enabledMetrics]
  );

  if (!ready || !db) return <p className="text-sm text-muted-foreground">Загрузка…</p>;

  return (
    <SettingsSectionCard title="Виджет боковой панели" leadingIcon={PanelLeft} contentClassName="gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="aura-label">Показатели</p>
        <span className="text-caption font-medium text-[var(--aura-text-subtle)]">{enabledMetrics.length}/{SIDEBAR_CORE_METRICS.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SIDEBAR_CORE_METRICS.map((key) => (
          <MetricPill
            key={key}
            metricKey={key}
            checked={enabledSet.has(key)}
            onChange={(checked) => {
              const next = checked
                ? Array.from(new Set([...enabledMetrics, key]))
                : enabledMetrics.filter((metric) => metric !== key);
              saveMetrics(next);
            }}
          />
        ))}
      </div>
      <p className="text-caption font-medium leading-relaxed text-[var(--aura-text-subtle)]">
        Виджет автоматически скрывается при низкой высоте окна, чтобы пункты меню оставались доступными.
      </p>
    </SettingsSectionCard>
  );
}
