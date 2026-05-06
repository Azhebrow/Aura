import { useEffect, useRef, useState } from 'react';

type BootstrapScreen = 'home' | 'rituals' | 'sidebar' | 'date-strip';

type Params = Record<string, unknown> | undefined;

type Options = {
  enabled?: boolean;
  keepStaleOnError?: boolean;
  cacheMs?: number;
  mode?: 'initial-blocking' | 'background';
  suppressLoadingAfterFirstSuccess?: boolean;
  dedupeKey?: string;
};

const inFlightBootstrap = new Map<string, Promise<unknown>>();
const bootstrapCache = new Map<string, { ts: number; data: unknown; serialized: string }>();

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'null';
  } catch {
    return '[[unserializable]]';
  }
}

function makeRequestKey(screen: BootstrapScreen, params: Params, dedupeKey?: string) {
  return dedupeKey ?? `${screen}:${safeSerialize(params ?? {})}`;
}

export async function prefetchBootstrap<T>(
  screen: BootstrapScreen,
  params?: Params,
  options: Pick<Options, 'cacheMs' | 'dedupeKey'> = {}
): Promise<T | null> {
  const api = window.__auraMiniApi;
  if (!api) return null;
  const cacheMs = options.cacheMs ?? 1200;
  const requestKey = makeRequestKey(screen, params, options.dedupeKey);
  const now = Date.now();
  const cached = bootstrapCache.get(requestKey);
  if (cached && now - cached.ts <= cacheMs) {
    return (cached.data ?? null) as T | null;
  }
  const requestPromise =
    inFlightBootstrap.get(requestKey) ??
    api.fetchBootstrap(screen, params ?? {}).finally(() => {
      inFlightBootstrap.delete(requestKey);
    });
  if (!inFlightBootstrap.has(requestKey)) inFlightBootstrap.set(requestKey, requestPromise);
  const payload = await requestPromise;
  const normalized = (payload ?? null) as T | null;
  bootstrapCache.set(requestKey, {
    ts: Date.now(),
    data: normalized,
    serialized: safeSerialize(normalized),
  });
  return normalized;
}

export function useBootstrapData<T>(
  screen: BootstrapScreen,
  params: Params,
  deps: ReadonlyArray<unknown>,
  options: Options = {}
) {
  const {
    enabled = true,
    keepStaleOnError = true,
    cacheMs = 1200,
    mode = 'background',
    suppressLoadingAfterFirstSuccess = true,
    dedupeKey,
  } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasSuccessRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const api = window.__auraMiniApi;
    const requestKey = makeRequestKey(screen, params, dedupeKey);
    if (!enabled || !api) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    const now = Date.now();
    const cached = bootstrapCache.get(requestKey);
    if (cached && now - cached.ts <= cacheMs) {
      setData(cached.data as T);
      setLoading(false);
      setError(null);
      hasSuccessRef.current = true;
      return;
    }

    const shouldShowLoading =
      mode === 'initial-blocking' && (!suppressLoadingAfterFirstSuccess || !hasSuccessRef.current);
    setLoading((prev) => (shouldShowLoading ? (prev ? prev : true) : false));
    setError(null);

    const requestPromise =
      inFlightBootstrap.get(requestKey) ??
      api
        .fetchBootstrap(screen, params ?? {})
        .finally(() => {
          inFlightBootstrap.delete(requestKey);
        });

    if (!inFlightBootstrap.has(requestKey)) {
      inFlightBootstrap.set(requestKey, requestPromise);
    }

    requestPromise
      .then((payload) => {
        if (cancelled) return;
        const normalized = (payload ?? null) as T | null;
        const serialized = safeSerialize(normalized);
        bootstrapCache.set(requestKey, { ts: Date.now(), data: normalized, serialized });
        setData((prev) => {
          const prevSerialized = safeSerialize(prev);
          if (prevSerialized === serialized) return prev;
          return normalized;
        });
        hasSuccessRef.current = true;
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error('Bootstrap request failed'));
        setLoading(false);
        if (!keepStaleOnError) {
          setData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    keepStaleOnError,
    cacheMs,
    screen,
    params,
    mode,
    suppressLoadingAfterFirstSuccess,
    dedupeKey,
    ...deps,
  ]);

  return { data, loading, error };
}

export function clearBootstrapDataCache() {
  bootstrapCache.clear();
  inFlightBootstrap.clear();
}
