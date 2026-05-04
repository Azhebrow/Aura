import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_NAV_ORDER,
  type PageId,
} from '@/shared/config/nav-model';
import { loadNavOrderFromDb } from '@/shared/bridge/load-nav-order';
import { parseNavOrderFromSettings } from '@/shared/lib/nav-order';

type ShellContextValue = {
  /** Активная «страница» в смысле legacy bottom nav */
  activePageId: PageId;
  setActivePageId: (id: PageId) => void;
  /** Toggle: если уже на calendar — возвращает на предыдущую страницу */
  toggleCalendar: () => void;
  /** Порядок вкладок из SQLite (`bottom_nav_pages_order`), с дефолтом */
  navOrder: readonly PageId[];
  /** Пока порядок первично не прочитан из БД */
  navOrderReady: boolean;
};

const ShellContext = createContext<ShellContextValue | null>(null);

function bootstrapScreenForPage(pageId: PageId): 'home' | 'rituals' | null {
  if (pageId === 'home') return 'home';
  if (pageId === 'rituals') return 'rituals';
  return null;
}

function sanitizeNavOrder(order: readonly PageId[]): PageId[] {
  return [...order];
}

function normalizeActivePageId(id: PageId, order: readonly PageId[]): PageId {
  if (!order.length) return 'home';
  return (order.includes(id) ? id : order[0] ?? 'home') as PageId;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [activePageId, setActivePageIdState] = useState<PageId>('home');
  const [prevPageId, setPrevPageIdState] = useState<PageId>('home');
  const [navOrder, setNavOrder] = useState<readonly PageId[]>(DEFAULT_NAV_ORDER);
  const [navOrderReady, setNavOrderReady] = useState(false);
  const [reloadPending, setReloadPending] = useState(false);
  const settingsDirtyRef = useRef(false);
  const activePageIdRef = useRef<PageId>('home');

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  // Track if any setting was changed while on the settings page
  useEffect(() => {
    if (activePageId !== 'settings') {
      settingsDirtyRef.current = false;
      return;
    }
    const handler = () => { settingsDirtyRef.current = true; };
    window.addEventListener('settings-saved', handler);
    return () => window.removeEventListener('settings-saved', handler);
  }, [activePageId]);

  // Trigger reload after overlay is shown
  useEffect(() => {
    if (!reloadPending) return;
    const timer = setTimeout(() => window.location.reload(), 450);
    return () => clearTimeout(timer);
  }, [reloadPending]);

  const setActivePageId = useCallback(
    (id: PageId) => {
      const normalized = normalizeActivePageId(id, navOrder);
      const current = activePageIdRef.current;
      // If leaving settings with unsaved changes — show overlay and reload instead of navigating
      if (current === 'settings' && normalized !== 'settings' && settingsDirtyRef.current) {
        setReloadPending(true);
        return;
      }
      setActivePageIdState((prev) => {
        if (prev !== normalized) setPrevPageIdState(prev);
        return normalized;
      });
    },
    [navOrder]
  );

  const toggleCalendar = useCallback(() => {
    setActivePageIdState((prev) => {
      if (prev === 'calendar') {
        return normalizeActivePageId(prevPageId, navOrder);
      }
      setPrevPageIdState(prev);
      return 'calendar';
    });
  }, [navOrder, prevPageId]);

  useEffect(() => {
    let cancelled = false;
    loadNavOrderFromDb()
      .then((order) => {
        if (cancelled) return;
        const normalized = sanitizeNavOrder(order);
        setNavOrder(normalized);
        setActivePageIdState((prev) => normalizeActivePageId(prev, normalized));
        setNavOrderReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNavOrder([...DEFAULT_NAV_ORDER]);
        setNavOrderReady(true);
      });

    const onNavOrderChanged = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      const next = sanitizeNavOrder(parseNavOrderFromSettings(detail) ?? [...DEFAULT_NAV_ORDER]);
      setNavOrder(next);
      setActivePageIdState((prev) => normalizeActivePageId(prev, next));
    };

    window.addEventListener('nav-order-changed', onNavOrderChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('nav-order-changed', onNavOrderChanged);
    };
  }, []);

  useEffect(() => {
    const audit = (window as Window & {
      __auraDbBridgeAudit?: { markPage?: (pageId: string) => void };
    }).__auraDbBridgeAudit;
    if (audit?.markPage) {
      audit.markPage(activePageId);
    }
  }, [activePageId]);

  useEffect(() => {
    const miniApi = (window as Window & {
      __auraMiniApi?: { fetchBootstrap?: (screen: string) => Promise<unknown> };
    }).__auraMiniApi;
    if (!miniApi?.fetchBootstrap) return;

    const screensToWarm = new Set<string>(['sidebar', 'date-strip']);
    const activeScreen = bootstrapScreenForPage(activePageId);
    if (activeScreen) screensToWarm.add(activeScreen);
    // Keep home warm because users return here most often.
    if (activePageId !== 'home') screensToWarm.add('home');
    const activeIndex = navOrder.indexOf(activePageId);
    if (activeIndex >= 0) {
      const prevPage = navOrder[(activeIndex - 1 + navOrder.length) % navOrder.length];
      const nextPage = navOrder[(activeIndex + 1) % navOrder.length];
      const prevScreen = bootstrapScreenForPage(prevPage);
      const nextScreen = bootstrapScreenForPage(nextPage);
      if (prevScreen) screensToWarm.add(prevScreen);
      if (nextScreen) screensToWarm.add(nextScreen);
    }

    for (const screen of screensToWarm) {
      void miniApi.fetchBootstrap(screen).catch(() => {});
    }
  }, [activePageId, navOrder]);

  const value = useMemo(
    () => ({
      activePageId,
      setActivePageId,
      toggleCalendar,
      navOrder,
      navOrderReady,
    }),
    [activePageId, setActivePageId, toggleCalendar, navOrder, navOrderReady]
  );

  return (
    <ShellContext.Provider value={value}>
      {children}
      {reloadPending ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Применение настроек…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : null}
    </ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell must be used within ShellProvider');
  }
  return ctx;
}
