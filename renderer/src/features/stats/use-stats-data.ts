import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { AuraDatabase } from '@/types/aura';
import { aggregateData } from '@/features/stats/stats-data-aggregator';
import type { StatsAggregatedRow, StatsControlsState, StatsDayRow, StatsMeta } from '@/features/stats/types';
import type { StatsFormattedTable } from '@/features/stats/stats-table-format';
import { formatForTable } from '@/features/stats/stats-table-format';
import { buildStatsMeta } from './build-stats-meta';
import { buildTimePeriodSummary, getRankDailyPointsData, getStatsData } from './stats-data-service';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';
import type { StatsTimeSummary } from '@/features/stats/types';

export type StatsPipelineResult = {
  dayRows: StatsDayRow[];
  aggregated: StatsAggregatedRow[];
  rankDailyAggregated: StatsAggregatedRow[] | null;
  meta: StatsMeta;
  table: StatsFormattedTable;
  allSeriesKeys: string[];
  currencyCode: string | undefined;
  timeSummary: StatsTimeSummary | null;
};

export function useStatsData(db: AuraDatabase | null, ready: boolean, controls: StatsControlsState) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<StatsPipelineResult | null>(null);

  const reload = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    const onTaskCategories = () => {
      reload();
    };

    const onAuraData = (ev: Event) => {
      const detail = (ev as CustomEvent<{ type?: string }>).detail;
      void detail?.type;
      reload();
    };

    window.addEventListener(AURA_DATA_CHANGED, onAuraData);
    window.addEventListener('task-categories-config-changed', onTaskCategories);
    return () => {
      window.removeEventListener(AURA_DATA_CHANGED, onAuraData);
      window.removeEventListener('task-categories-config-changed', onTaskCategories);
    };
  }, [reload]);

  useLayoutEffect(() => {
    if (!db || !ready) return;
    setLoading(true);
  }, [db, ready, controls, refreshToken]);

  useEffect(() => {
    if (!db || !ready) {
      setResult(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const raf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const dayRows = getStatsData(db, controls.mode, controls.startDate, controls.endDate, controls.groupBy);

      const aggregated = aggregateData(dayRows, controls.aggregation, controls.startDate, controls.endDate, controls.mode);

      let rankDailyAggregated: StatsAggregatedRow[] | null = null;
      if (controls.mode === 'rank') {
        const dailyRows = getRankDailyPointsData(db, controls.startDate, controls.endDate);
        rankDailyAggregated = aggregateData(dailyRows, controls.aggregation, controls.startDate, controls.endDate, 'finance');
      }

      const allKeys = new Set<string>();
      for (const r of aggregated) {
        for (const k of Object.keys(r.values || {})) allKeys.add(k);
      }

      const meta = buildStatsMeta(db, controls.mode, controls.groupBy, allKeys);
      const table = formatForTable(aggregated, controls.mode, controls.groupBy, controls.aggregation, db);
      const settings = db.getAppSettings();
      const currencyCode = settings && typeof settings === 'object' && typeof settings.currency === 'string' ? settings.currency : undefined;
      const timeSummary = controls.mode === 'time' || controls.mode === 'leisure' ? buildTimePeriodSummary(db, controls.startDate, controls.endDate) : null;

      setResult({
        dayRows,
        aggregated,
        rankDailyAggregated,
        meta,
        table,
        allSeriesKeys: table.columns,
        currencyCode,
        timeSummary,
      });
      setLoading(false);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [db, ready, controls, refreshToken]);

  return {
    dayRows: result?.dayRows ?? [],
    aggregated: result?.aggregated ?? null,
    rankDailyAggregated: result?.rankDailyAggregated ?? null,
    meta: result?.meta ?? { icons: {}, colors: {} },
    table: result?.table ?? { labels: [], rows: [], columns: [] },
    allSeriesKeys: result?.allSeriesKeys ?? [],
    currencyCode: result?.currencyCode,
    timeSummary: result?.timeSummary ?? null,
    loading,
    reload,
  };
}
