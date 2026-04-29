import { useEffect, useState } from 'react';
import type { AuraDatabase } from '@/types/aura';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { usePointsService } from '@/shared/hooks/use-points-service';

export function useCumulativePoints(db: AuraDatabase | null, ready: boolean, dateString: string) {
  const [points, setPoints] = useState(0);
  const dataTick = useAuraDataRefresh();
  const svc = usePointsService(db, ready);

  useEffect(() => {
    if (!ready || !db) {
      setPoints(0);
      return;
    }
    if (svc) {
      try {
        setPoints(svc.calculateCumulativePoints(dateString));
      } catch {
        setPoints(0);
      }
      return;
    }
    // Fallback: прямой запрос к БД если PointsService недоступен
    try {
      const rows = db.getAll('act_daily_points') || [];
      const target = String(dateString ?? '');
      const latest = rows
        .filter((r) => r.date && String(r.date) <= target)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .at(-1);
      const fallback = latest?.cumulative_points ?? latest?.daily_points ?? 0;
      setPoints(Number(fallback) || 0);
    } catch {
      setPoints(0);
    }
  }, [db, ready, dateString, svc, dataTick]);

  return points;
}
