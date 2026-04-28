import { useCallback, useEffect, useState } from 'react';
import type { AuraDatabase } from '@/types/aura';
import { aggregateData } from '@/shared/stats/stats-data-aggregator';
import { getStatsCache } from '@/shared/stats/stats-cache';
import type { StatsAggregatedRow, StatsControlsState, StatsDayRow, StatsMeta } from '@/shared/stats/types';
import type { StatsFormattedTable } from '@/shared/stats/stats-table-format';
import { formatForTable } from '@/shared/stats/stats-table-format';
import { buildStatsMeta } from './build-stats-meta';
import { getRankDailyPointsData, getStatsData } from './stats-data-service';
import { AURA_DATA_CHANGED, prefixesForAuraDataType } from './stats-data-events';

export type StatsPipelineResult = {
  dayRows: StatsDayRow[];
  aggregated: StatsAggregatedRow[];
  rankDailyAggregated: StatsAggregatedRow[] | null;
  meta: StatsMeta;
  table: StatsFormattedTable;
  allSeriesKeys: string[];
};

type CachedPayload = { dayRows: StatsDayRow[] };

export function useStatsData(db: AuraDatabase | null, ready: boolean, controls: StatsControlsState) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [result, setResult] = useState<StatsPipelineResult | null>(null);

  const reload = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    const onTaskCategories = () => {
      getStatsCache().invalidateByPrefix('tasks_');
      reload();
    };

    const onAuraData = (ev: Event) => {
      const detail = (ev as CustomEvent<{ type?: string }>).detail;
      const type = detail?.type;
      const cache = getStatsCache();
      if (!type) {
        cache.invalidate();
      } else {
        const prefixes = prefixesForAuraDataType(type);
        // Для новых/косвенных типов изменений не держим устаревший кэш:
        // если явной карты нет — инвалидируем весь кэш статистики.
        if (!prefixes.length) {
          cache.invalidate();
        }
        for (const p of prefixes) {
          cache.invalidateByPrefix(p);
        }
      }
      reload();
    };

    window.addEventListener(AURA_DATA_CHANGED, onAuraData);
    window.addEventListener('task-categories-config-changed', onTaskCategories);
    return () => {
      window.removeEventListener(AURA_DATA_CHANGED, onAuraData);
      window.removeEventListener('task-categories-config-changed', onTaskCategories);
    };
  }, [reload]);

  useEffect(() => {
    if (!db || !ready) {
      setResult(null);
      return;
    }

    const cache = getStatsCache();
    const cacheKey = cache.generateKey(
      controls.mode,
      controls.viewType,
      controls.groupBy,
      controls.period,
      controls.aggregation,
      controls.startDate,
      controls.endDate
    );

    let dayRows: StatsDayRow[];
    const cached = cache.get<CachedPayload>(cacheKey);
    if (cached && Array.isArray(cached.dayRows)) {
      dayRows = cached.dayRows;
    } else {
      dayRows = getStatsData(db, controls.mode, controls.startDate, controls.endDate, controls.groupBy);
      cache.set(cacheKey, { dayRows });
    }

    const aggregated = aggregateData(dayRows, controls.aggregation, controls.startDate, controls.endDate);

    let rankDailyAggregated: StatsAggregatedRow[] | null = null;
    if (controls.mode === 'rank') {
      const dailyRows = getRankDailyPointsData(db, controls.startDate, controls.endDate);
      rankDailyAggregated = aggregateData(dailyRows, controls.aggregation, controls.startDate, controls.endDate);
    }

    const allKeys = new Set<string>();
    for (const r of aggregated) {
      for (const k of Object.keys(r.values || {})) {
        allKeys.add(k);
      }
    }

    const meta = buildStatsMeta(db, controls.mode, controls.groupBy, allKeys);
    const table = formatForTable(aggregated, controls.mode, controls.groupBy, controls.aggregation, db);

    setResult({
      dayRows,
      aggregated,
      rankDailyAggregated,
      meta,
      table,
      allSeriesKeys: table.columns,
    });
  }, [db, ready, controls, refreshToken]);

  return {
    dayRows: result?.dayRows ?? [],
    aggregated: result?.aggregated ?? null,
    rankDailyAggregated: result?.rankDailyAggregated ?? null,
    meta: result?.meta ?? { icons: {}, colors: {} },
    table: result?.table ?? { labels: [], rows: [], columns: [] },
    allSeriesKeys: result?.allSeriesKeys ?? [],
    reload,
  };
}
