import { dispatchAuraDataChanged } from '@/features/stats/stats-data-events';
import { invalidateBootstrapCache } from '@/shared/bridge/mini-app-client';

/**
 * Единая точка мутаций данных в UI:
 * выполняет изменение и затем отправляет событие синхронизации.
 */
export function runAuraMutation<T>(type: string, mutate: () => T): T {
  const result = mutate();
  invalidateBootstrapCache();
  dispatchAuraDataChanged(type);
  return result;
}
