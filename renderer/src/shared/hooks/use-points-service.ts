import { useMemo } from 'react';
import type { AuraDatabase } from '@/types/aura';

export type PointsServiceInstance = {
  isDayOpen: (date: string) => boolean;
  calculateCumulativePoints: (date: string) => number;
  getDayData: (date: string, type: string, monthData?: unknown) => { value: number; text: string; color: string; fillPercent: number } | undefined;
  getMonthRange: (year: number, month: number, type: string) => unknown;
  isFutureDay: (date: string) => boolean;
  [key: string]: unknown;
};

/**
 * Возвращает экземпляр legacy PointsService, если доступен через window.
 * Единая точка доступа — не дублировать логику в CalendarPage, use-day-locked, use-cumulative-points.
 */
export function usePointsService(db: AuraDatabase | null, ready: boolean): PointsServiceInstance | null {
  return useMemo(() => {
    if (!ready || !db) return null;
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor) return null;
    try {
      return new Ctor(db) as PointsServiceInstance;
    } catch {
      return null;
    }
  }, [db, ready]);
}
