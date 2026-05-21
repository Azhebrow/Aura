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

  const snapshot = useMemo(() => {
    if (!db) return null;
    return buildHomeDaySnapshot(db, dateString, bootstrap);
  }, [bootstrap, db, dateString, dataTick]);

  return { data: snapshot, loading: !snapshot && loading, dataTick };
}
