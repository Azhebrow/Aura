import { useEffect, useState } from 'react';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';

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
    let raf: number | null = null;
    let queued = false;

    const flush = () => {
      queued = false;
      raf = null;
      setTick((v) => v + 1);
    };

    const bump = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        queued = true;
        return;
      }
      if (raf != null) {
        queued = true;
        return;
      }
      raf = window.requestAnimationFrame(flush);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && queued) {
        if (raf != null) {
          window.cancelAnimationFrame(raf);
          raf = null;
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
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, [includeTaskCategoriesConfig, types]);

  return tick;
}
