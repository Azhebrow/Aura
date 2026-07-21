import { useEffect, useMemo, useReducer, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { StatsControlsState } from '@/features/stats/types';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { StatsControlsPanel } from '@/features/stats/StatsControlsPanel';
import { StatsChartView } from '@/features/stats/StatsChartView';
import { StatsPieView } from '@/features/stats/StatsPieView';
import { StatsTableView } from '@/features/stats/StatsTableView';
import { useStatsData } from '@/features/stats/use-stats-data';
import { LoadingShell } from '@/shared/ui/data-states';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import type { AuraRow } from '@/types/aura';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import type { StatsAggregation, StatsGroupBy, StatsMode } from '@/features/stats/types';

function defaultDates(period: number): Pick<StatsControlsState, 'startDate' | 'endDate' | 'period'> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, period - 1));
  return {
    period,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const initialControls = (): StatsControlsState => ({
  mode: 'tasks',
  groupBy: 'categories',
  aggregation: 'day',
  selectedSeriesKeys: null,
  ...defaultDates(30),
});

type DesktopView = 'chart' | 'pie' | 'table';
const STATS_MODES: StatsMode[] = ['tasks', 'finance', 'time', 'leisure', 'rituals', 'rank', 'mood', 'nutrition', 'correlation'];
const STATS_GROUPS: StatsGroupBy[] = ['categories', 'elements'];
const STATS_AGGREGATIONS: StatsAggregation[] = ['day', 'week', 'month', 'year'];

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readStoredStatsControls(): StatsControlsState {
  const fallback = initialControls();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS_CONTROLS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StatsControlsState>;
    return {
      ...fallback,
      mode: STATS_MODES.includes(parsed.mode as StatsMode) ? parsed.mode as StatsMode : fallback.mode,
      groupBy: STATS_GROUPS.includes(parsed.groupBy as StatsGroupBy) ? parsed.groupBy as StatsGroupBy : fallback.groupBy,
      aggregation: STATS_AGGREGATIONS.includes(parsed.aggregation as StatsAggregation) ? parsed.aggregation as StatsAggregation : fallback.aggregation,
      period: Number.isFinite(Number(parsed.period)) ? Number(parsed.period) : fallback.period,
      startDate: isIsoDate(parsed.startDate) ? parsed.startDate : fallback.startDate,
      endDate: isIsoDate(parsed.endDate) ? parsed.endDate : fallback.endDate,
      selectedSeriesKeys: Array.isArray(parsed.selectedSeriesKeys)
        ? parsed.selectedSeriesKeys.filter((value): value is string => typeof value === 'string')
        : parsed.selectedSeriesKeys === null ? null : fallback.selectedSeriesKeys,
    };
  } catch {
    return fallback;
  }
}

function readStoredStatsView(): DesktopView {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS_VIEW);
    if (raw === 'pie' || raw === 'table') return raw;
    return 'chart';
  } catch {
    return 'chart';
  }
}

function supportsPieView(mode: StatsMode): boolean {
  return mode === 'finance' || mode === 'time' || mode === 'leisure' || mode === 'nutrition';
}

type Action = { type: 'patch'; patch: Partial<StatsControlsState> };

function controlsReducer(state: StatsControlsState, action: Action): StatsControlsState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

export function StatsOverviewPage() {
  const { db, ready } = useAuraDb();
  const [controls, dispatch] = useReducer(controlsReducer, undefined, readStoredStatsControls);
  const [desktopView, setDesktopView] = useState<DesktopView>(readStoredStatsView);
  const patch = (p: Partial<StatsControlsState>) => dispatch({ type: 'patch', patch: p });
  const setStoredDesktopView = (next: DesktopView) => {
    setDesktopView(next);
    try { localStorage.setItem(STORAGE_KEYS.STATS_VIEW, next); } catch { /* ignore */ }
  };
  const { dayRows, meta, table, allSeriesKeys, currencyCode, timeSummary, loading } = useStatsData(db, ready, controls);
  const statsVisibility = useMemo(() => {
    if (!db) return { chart: true, table: true };
    return getPageSectionsFromSettings(db.getAppSettings() as AuraRow | null).stats;
  }, [db]);
  const availableViews = useMemo<Array<DesktopView>>(() => {
    const next: DesktopView[] = [];
    if (statsVisibility.chart !== false) next.push('chart');
    if (statsVisibility.chart !== false && supportsPieView(controls.mode)) next.push('pie');
    if (statsVisibility.table !== false) next.push('table');
    return next.length ? next : ['chart'];
  }, [controls.mode, statsVisibility.chart, statsVisibility.table]);

  useEffect(() => {
    if (!availableViews.includes(desktopView)) setStoredDesktopView(availableViews[0] ?? 'chart');
  }, [availableViews, desktopView]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.STATS_CONTROLS, JSON.stringify(controls)); } catch { /* ignore */ }
  }, [controls]);

  const dataContent = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel/25">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {desktopView === 'chart' ? (
            <StatsChartView
              mode={controls.mode}
              groupBy={controls.groupBy}
              aggregation={controls.aggregation}
              table={table}
              meta={meta}
              selectedSeriesKeys={controls.selectedSeriesKeys}
              currencyCode={currencyCode}
              timeSummary={timeSummary}
              loading={loading}
            />
          ) : desktopView === 'pie' ? (
            <StatsPieView
              mode={controls.mode}
              groupBy={controls.groupBy}
              rows={dayRows}
              columns={allSeriesKeys}
              meta={meta}
              selectedSeriesKeys={controls.selectedSeriesKeys}
              currencyCode={currencyCode}
              loading={loading}
            />
          ) : (
            loading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <LoadingShell rows={6} className="w-full max-w-2xl" />
              </div>
            ) : (
              <StatsTableView
                mode={controls.mode}
                table={table}
                meta={meta}
                selectedSeriesKeys={controls.selectedSeriesKeys}
              />
            )
          )}
        </div>
      </div>
    </section>
  );

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
          {!ready ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <LoadingShell rows={4} />
            </div>
          ) : !db ? (
            <div className="aura-body-muted flex min-h-0 flex-1 items-center justify-center p-6 text-sm">
              Статистика недоступна: не удалось получить доступ к локальной базе.
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden aura-content-fade-in">
              <MegaPanelHeader title="Статистика" className="aura-strict-only-header hidden" />
              <StatsControlsPanel
                state={controls}
                onChange={patch}
                seriesKeys={allSeriesKeys}
                meta={meta}
                view={desktopView}
                onViewChange={setStoredDesktopView}
                availableViews={availableViews}
              />
              {dataContent}
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
