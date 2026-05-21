import type { AuraDatabase } from '@/types/aura';
import { callDbBatched, fetchBootstrap, invalidateBootstrapCache } from './mini-app-client';

export type AuraDataSourceMode = 'electron-direct' | 'web-mini-api' | 'unavailable';

export type BootstrapScreen = 'home' | 'rituals' | 'sidebar' | 'date-strip';

export type AuraDataSource = {
  mode: AuraDataSourceMode;
  callDb: (method: string, args?: unknown[]) => Promise<unknown>;
  fetchBootstrap: (screen: BootstrapScreen, body: Record<string, unknown>) => Promise<unknown>;
  invalidate: (detail?: { type?: string; date?: string; scope?: string; entityId?: string }) => void;
};

export function detectAuraDataSourceMode(): AuraDataSourceMode {
  if (typeof window === 'undefined') return 'unavailable';
  if ((window as Window & { __auraWebMode?: boolean }).__auraWebMode) return 'web-mini-api';
  if (typeof window.getDB === 'function') return 'electron-direct';
  return 'unavailable';
}

export function getAuraDataSource(): AuraDataSource {
  const mode = detectAuraDataSourceMode();
  return {
    mode,
    callDb: (method, args = []) => callDbBatched(method, args),
    fetchBootstrap,
    invalidate: invalidateBootstrapCache,
  };
}

export function getAuraDatabase(): AuraDatabase | null {
  if (typeof window === 'undefined' || typeof window.getDB !== 'function') return null;
  try {
    return window.getDB() ?? null;
  } catch {
    return null;
  }
}
