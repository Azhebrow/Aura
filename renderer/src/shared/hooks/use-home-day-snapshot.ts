import { useMemo } from 'react';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import {
  buildHomeDaySnapshot,
  type HomeDayBootstrap,
  type HomeDaySnapshot,
} from '@/shared/lib/home-day-snapshot';

export function useHomeDaySnapshot(dateString: string): {
  data: HomeDaySnapshot | null;
  loading: boolean;
  dataTick: number;
} {
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh({
    types: ['task-progress', 'timer', 'ritual', 'nutrition', 'diary', 'mood', 'transaction', 'points'],
    includeTaskCategoriesConfig: true,
  });
  const bootstrapParams = useMemo(() => ({ date: dateString }), [dateString]);
  const { data: bootstrap, loading } = useBootstrapData<HomeDayBootstrap>(
    'home',
    bootstrapParams,
    [dateString, dataTick],
    { keepStaleOnError: true }
  );

  // dataTick is intentionally NOT in the snapshot memo deps.
  // The bootstrap dep already drives freshness: when a mutation fires,
  // bootstrap is refetched and this memo recomputes with fresh data.
  // Including dataTick caused the snapshot (and all derived UI) to recompute
  // synchronously on every mutation, even before new bootstrap data arrived,
  // which produced a one-frame flash of stale/zero values.
  const snapshot = useMemo(() => {
    if (!db) return null;
    return buildHomeDaySnapshot(db, dateString, bootstrap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap, db, dateString]);

  return { data: snapshot, loading: !snapshot && loading, dataTick };
}
