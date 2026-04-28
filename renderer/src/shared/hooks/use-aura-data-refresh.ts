import { useEffect, useState } from 'react';
import { AURA_DATA_CHANGED } from '@/features/stats/stats-data-events';

type UseAuraDataRefreshOptions = {
  types?: string[];
  includeTaskCategoriesConfig?: boolean;
};

/**
 * Возвращает инкрементальный токен, который меняется при изменении act-данных.
 * Используется для реактивного пересчета `useMemo`/`useEffect` в UI-виджетах.
 */
export function useAuraDataRefresh(options: UseAuraDataRefreshOptions = {}): number {
  const { types, includeTaskCategoriesConfig = false } = options;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const allowed = Array.isArray(types) ? new Set(types) : null;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(ua);
    const throttleMs = isMobile ? 100 : 50;
    let timer: number | null = null;
    let queued = false;

    const flush = () => {
      queued = false;
      timer = null;
      setTick((v) => v + 1);
    };

    const bump = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        queued = true;
        return;
      }
      if (timer != null) {
        queued = true;
        return;
      }
      timer = window.setTimeout(flush, throttleMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && queued) {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
        flush();
      }
    };
    const onAuraData = (ev: Event) => {
      if (!allowed) {
        bump();
        return;
      }
      const type = (ev as CustomEvent<{ type?: string }>).detail?.type;
      if (type && allowed.has(type)) bump();
    };

    window.addEventListener(AURA_DATA_CHANGED, onAuraData);
    document.addEventListener('visibilitychange', onVisibility);
    if (includeTaskCategoriesConfig) {
      window.addEventListener('task-categories-config-changed', bump);
    }

    return () => {
      window.removeEventListener(AURA_DATA_CHANGED, onAuraData);
      document.removeEventListener('visibilitychange', onVisibility);
      if (includeTaskCategoriesConfig) {
        window.removeEventListener('task-categories-config-changed', bump);
      }
      if (timer != null) window.clearTimeout(timer);
    };
  }, [includeTaskCategoriesConfig, types]);

  return tick;
}
