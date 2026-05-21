import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuraDb } from './use-aura-db';
import { useAuraDataRefresh } from './use-aura-data-refresh';
import type { DataState, DataStatus } from '@/shared/types/operations';
import type { AuraDatabase } from '@/types/aura';

type Options = {
  /**
   * AURA event types to subscribe for auto-reload.
   * Pass undefined to subscribe to ALL events.
   * Pass [] to disable auto-reload.
   */
  events?: string[];
  /**
   * Treat null / undefined / empty-array result as 'empty' status.
   * Default: true.
   */
  detectEmpty?: boolean;
};

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'null';
  } catch {
    return '[[unserializable]]';
  }
}

/**
 * useAsyncData — THE single hook for all data reads in the app.
 *
 * Law 2: "One hook for reading." Every component that reads from the DB
 * must use this hook. No direct db.getAll() calls in components.
 *
 * @example
 * const { data, status, reload } = useAsyncData(
 *   (db) => db.getRitualsMorning(dateString),
 *   [dateString],
 *   { events: ['ritual'] }
 * );
 */
export function useAsyncData<T>(
  loader: (db: AuraDatabase) => T,
  deps: unknown[],
  options: Options = {}
): DataState<T | null> {
  const { db, ready: dbReady } = useAuraDb();
  const { events, detectEmpty = true } = options;

  // Only subscribe to events when events !== []
  const shouldSubscribe = !Array.isArray(events) || events.length > 0;
  const tick = useAuraDataRefresh(
    shouldSubscribe ? { types: Array.isArray(events) ? events : undefined } : {}
  );

  const [status, setStatus] = useState<DataStatus>('loading');
  const [data,   setData]   = useState<T | null>(null);
  const [error,  setError]  = useState<string | undefined>();
  const manualReloadRef     = useRef(0);
  const hadSuccessRef       = useRef(false);
  const dataHashRef         = useRef('null');

  const reload = useCallback((options?: { silent?: boolean }) => {
    const silent = options?.silent ?? true;
    manualReloadRef.current += 1;
    setStatus((prev) => {
      if (silent && hadSuccessRef.current && (prev === 'ready' || prev === 'empty' || prev === 'refreshing')) {
        return 'refreshing';
      }
      return 'loading';
    });
  }, []);

  useLayoutEffect(() => {
    if (!dbReady || !db) return;
    setStatus((prev) => {
      if (hadSuccessRef.current && (prev === 'ready' || prev === 'empty' || prev === 'refreshing')) {
        return 'refreshing';
      }
      return 'loading';
    });
  }, [dbReady, db, tick, manualReloadRef.current, ...deps]);

  useEffect(() => {
    if (!dbReady || !db) {
      setStatus('loading');
      return;
    }
    try {
      const result = loader(db);
      const isEmpty =
        detectEmpty &&
        (result === null ||
          result === undefined ||
          (Array.isArray(result) && (result as unknown[]).length === 0));
      const normalized = result ?? null;
      const nextHash = safeSerialize(normalized);
      if (dataHashRef.current !== nextHash) {
        dataHashRef.current = nextHash;
        setData(normalized);
      }
      setStatus(isEmpty ? 'empty' : 'ready');
      hadSuccessRef.current = true;
      setError(undefined);
    } catch (e) {
      setStatus((prev) => (hadSuccessRef.current && (prev === 'ready' || prev === 'empty' || prev === 'refreshing') ? prev : 'error'));
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbReady, db, tick, manualReloadRef.current, ...deps]);

  return useMemo(
    () => ({ data, status, error, reload }),
    [data, status, error, reload]
  );
}
