import { useEffect, useState } from 'react';
import type { AuraDatabase } from '@/types/aura';

/** День «закрыт» для действий — как legacy `DayLockManager` через PointsService. */
export function useDayLocked(db: AuraDatabase | null, ready: boolean, dateString: string) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!ready || !db) {
      setLocked(false);
      return;
    }
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor) {
      setLocked(false);
      return;
    }
    try {
      const ps = new Ctor(db);
      setLocked(!ps.isDayOpen(dateString));
    } catch {
      setLocked(false);
    }
  }, [db, ready, dateString]);

  return locked;
}
