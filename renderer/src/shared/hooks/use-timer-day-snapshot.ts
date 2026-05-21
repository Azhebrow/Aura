import { useCallback, useEffect, useState } from 'react';
import type { AuraDatabase } from '@/types/aura';
import { buildTimerDaySnapshot, type TimerDaySnapshot } from '@/shared/lib/timer-day-snapshot';

function sameSnapshot(a: TimerDaySnapshot, b: TimerDaySnapshot): boolean {
  return JSON.stringify({
    date: a.date,
    byGroup: a.byGroup,
    sessions: a.sessions,
  }) === JSON.stringify({
    date: b.date,
    byGroup: b.byGroup,
    sessions: b.sessions,
  });
}

export function useTimerDaySnapshot(db: AuraDatabase | null, dateString: string, refreshKey?: number) {
  const [snapshot, setSnapshot] = useState<TimerDaySnapshot>(() => buildTimerDaySnapshot(db, dateString));

  const reload = useCallback(() => {
    const next = buildTimerDaySnapshot(db, dateString);
    setSnapshot((prev) => (sameSnapshot(prev, next) ? prev : next));
  }, [db, dateString]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  return { snapshot, reload };
}
