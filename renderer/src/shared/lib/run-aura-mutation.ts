import { dispatchAuraDataChanged, type AuraDataChangedDetail } from '@/shared/lib/aura-data-events';
import { invalidateBootstrapCache } from '@/shared/bridge/mini-app-client';
import { clearBootstrapDataCache } from '@/shared/hooks/use-bootstrap-data';
import { clearCategoryProgressCache } from '@/shared/bridge/get-category-progresses';

/**
 * Единая точка мутаций данных в UI:
 * выполняет изменение и затем отправляет событие синхронизации.
 */
export function runAuraMutation<T>(typeOrDetail: string | AuraDataChangedDetail, mutate: () => T, date?: string): T {
  const result = mutate();
  const detail = typeof typeOrDetail === 'string' ? { type: typeOrDetail, date } : typeOrDetail;
  invalidateBootstrapCache(detail);
  clearBootstrapDataCache(detail);
  clearCategoryProgressCache();
  dispatchAuraDataChanged(detail);
  return result;
}
