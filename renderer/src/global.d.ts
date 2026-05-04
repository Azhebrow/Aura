declare global {
  interface Window {
    getDB?: () => import('./types/aura').AuraDatabase | null;
    __auraUserDataPath?: string;
    __auraAppPath?: string;
    /** Инъекция из main.js — см. legacy `PointsService` */
    PointsService?: new (db: import('./types/aura').AuraDatabase) => {
      calculateCumulativePoints: (date: string) => number;
      isDayOpen: (date: string) => boolean;
      isFutureDay: (date: string) => boolean;
    };
    __auraMiniApi?: {
      callDbBatched: (method: string, args?: unknown[]) => Promise<unknown>;
      fetchBootstrap: (
        screen: 'home' | 'rituals' | 'sidebar' | 'date-strip',
        body: Record<string, unknown>
      ) => Promise<unknown>;
      invalidateBootstrapCache: () => void;
    };
  }
}

export {};
