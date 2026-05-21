export const AURA_DATA_CHANGED = 'aura-data-changed';

export type AuraDataChangedDetail = {
  type?: string;
  date?: string;
  entityId?: string;
  scope?: string;
};

export function dispatchAuraDataChanged(typeOrDetail: string | AuraDataChangedDetail, date?: string): void {
  if (typeof window === 'undefined') return;
  const detail = typeof typeOrDetail === 'string' ? { type: typeOrDetail, date } : typeOrDetail;
  window.dispatchEvent(new CustomEvent<AuraDataChangedDetail>(AURA_DATA_CHANGED, { detail }));
}
