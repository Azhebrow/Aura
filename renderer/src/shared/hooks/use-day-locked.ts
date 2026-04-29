import { useEffect, useState } from 'react';
import type { AuraDatabase } from '@/types/aura';
import { usePointsService } from '@/shared/hooks/use-points-service';

/** День «закрыт» для действий — как legacy `DayLockManager` через PointsService. */
export function useDayLocked(db: AuraDatabase | null, ready: boolean, dateString: string) {
  const [locked, setLocked] = useState(false);
  const svc = usePointsService(db, ready);

  useEffect(() => {
    if (!ready || !db || !svc) {
      setLocked(false);
      return;
    }
    try {
      setLocked(!svc.isDayOpen(dateString));
    } catch {
      setLocked(false);
    }
  }, [db, ready, dateString, svc]);

  return locked;
}
