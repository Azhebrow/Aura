declare global {
  interface Window {
    getDB?: () => import('./types/aura').AuraDatabase | null;
    __auraUserDataPath?: string;
    __auraAppPath?: string;
    __auraWebMode?: boolean;
    __auraRankImageCache?: Record<string, HTMLImageElement>;
    /** Реализован в renderer/src/shared/services/PointsService.ts, регистрируется в AppProviders. */
    PointsService?: new (db: import('./types/aura').AuraDatabase) => {
      isDayOpen: (date: string) => boolean;
      isFutureDay: (date: string) => boolean;
      getDayStatus: (date: string) => 'open' | 'locked' | 'future';
      calculateCumulativePoints: (date: string) => number;
      getMonthRange: (year: number, month: number, type: string) => unknown;
      getDayData: (date: string, type: string, monthData?: unknown) => {
        value: number; text: string; color: string; fillPercent: number;
      };
    };
    __auraMiniApi?: {
      callDbBatched: (method: string, args?: unknown[]) => Promise<unknown>;
      fetchBootstrap: (
        screen: 'home' | 'rituals' | 'sidebar' | 'date-strip',
        body: Record<string, unknown>
      ) => Promise<unknown>;
      invalidateBootstrapCache: (detail?: { type?: string; date?: string; entityId?: string; scope?: string }) => void;
    };
  }
}

export {};
