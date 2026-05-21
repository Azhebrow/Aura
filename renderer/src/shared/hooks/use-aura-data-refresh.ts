import { useEffect, useRef, useState } from 'react';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';

type UseAuraDataRefreshOptions = {
  types?: string[];
  includeTaskCategoriesConfig?: boolean;
};

/**
 * Возвращает инкрементальный токен, который меняется при изменении act-данных.
 * Используется для реактивного пересчета `useMemo`/`useEffect` в UI-виджетах.
 *
 * Важно: `types` намеренно не включён в массив зависимостей эффекта.
 * Многие компоненты передают новый литерал массива при каждом рендере, что
 * приводило бы к пересозданию эффекта и отмене ожидающего RAF до его срабатывания —
 * из-за чего dataTick никогда не увеличивался. Вместо этого используем ref,
 * чтобы всегда читать актуальный список типов внутри обработчика события.
 */
export function useAuraDataRefresh(options: UseAuraDataRefreshOptions = {}): number {
  const { types, includeTaskCategoriesConfig = false } = options;
  const [tick, setTick] = useState(0);

  // Keep a ref so the event handler always sees the latest types list without
  // re-running the effect (and cancelling a pending RAF) on every render.
  const typesRef = useRef(types);
  typesRef.current = types;

  useEffect(() => {
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
      const currentTypes = typesRef.current;
      if (!Array.isArray(currentTypes)) {
        bump();
        return;
      }
      const type = (ev as CustomEvent<{ type?: string }>).detail?.type;
      if (type && currentTypes.includes(type)) bump();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeTaskCategoriesConfig]);

  return tick;
}
