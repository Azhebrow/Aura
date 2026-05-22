import { useEffect } from 'react';
import { loadNavOrderFromDb } from '@/shared/bridge/load-nav-order';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import { prefetchBootstrap } from '@/shared/hooks/use-bootstrap-data';
import { ensureAuraFontsStylesheet } from '@/features/theme/load-google-fonts';
import { loadIconsManifest } from '@/features/settings/load-icons-manifest';
import { RANK_TIERS, rankImageSrc } from '@/shared/config/ranks-model';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { applyAppearanceScales, readAppearanceScaleSettings } from '@/features/theme/appearance-scale';
import { todayIsoDate } from '@/shared/lib/dates';
import { setStartupReadiness, type StartupTask } from './startup-readiness';
import type { AuraDatabase, AuraRow } from '@/types/aura';


const STARTUP_TASK_TIMEOUT_MS = 12_000;
const BOOTSTRAP_TIMEOUT_MS = 9_000;
const FONT_TIMEOUT_MS = 4_000;

const CATALOG_ICON_NAMES = [
  'brain',
  'activity',
  'calendar',
  'apple',
  'moon',
  'sunrise',
  'target',
  'timer',
  'list-todo',
  'chart-column',
  'piggy-bank',
  'receipt-text',
  'house',
  'flame',
  'book-open',
  'settings',
  'trophy',
  'chart-scatter',
  'chart-line',
  'heart',
  'beef',
  'droplet',
  'wheat',
  'ghost',
  'sparkles',
  'calendar-days',
  'receipt',
  'wallet',
  'credit-card',
  'clipboard-list',
  'clipboard-check',
  'check-line',
] as const;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    const done = async () => {
      try {
        await img.decode?.();
      } catch {
        /* decode can reject for SVG/cached edge cases; onload is enough fallback */
      }
      resolve(img);
    };
    img.onload = () => void done();
    img.onerror = () => resolve(img);
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
    if (img.complete) void done();
  });
}

function preloadCuratedIcons(available: Set<string>) {
  const urls = CATALOG_ICON_NAMES.flatMap((name) => (available.has(name) ? [`/icons/${encodeURIComponent(name)}.svg`] : []));
  return Promise.allSettled(urls.map((src) => preloadImage(src)));
}

async function preloadRankArt() {
  const entries = await Promise.all(
    RANK_TIERS.map(async (tier) => {
      const src = rankImageSrc(tier.imageNumber);
      const image = await preloadImage(src);
      return [src, image] as const;
    })
  );
  window.__auraRankImageCache = {
    ...(window.__auraRankImageCache ?? {}),
    ...Object.fromEntries(entries),
  };
}

function warmDatabaseDialogData(db: AuraDatabase) {
  const runtimeDb = db as AuraDatabase & {
    getInfo?: () => { tables?: Array<{ name: string; rowCount: number }>; path?: string; error?: string };
    dbPath?: string;
    db?: {
      pragma?: (query: string) => unknown;
      prepare?: (query: string) => {
        all?: () => Array<{ name: string }>;
        get?: () => { count?: number } | undefined;
      };
    };
  };

  const info = runtimeDb.getInfo?.();
  if (info?.tables?.length) return;

  const tableRows = runtimeDb.db?.prepare?.("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")?.all?.() ?? [];
  for (const row of tableRows) {
    if (!row.name) continue;
    try {
      runtimeDb.db?.prepare?.(`SELECT COUNT(*) as count FROM ${row.name}`)?.get?.();
    } catch {
      /* best-effort warmup only */
    }
  }
}

async function warmHeavyModalSurfaces(db: AuraDatabase) {
  await Promise.allSettled([
    import('@/features/timer/TimerFullscreenDialog'),
    import('@/widgets/date-strip/CalendarPickerDialog'),
    import('@/features/app-settings/DatabaseManagementDialog'),
    import('@/features/settings/icon-picker-panel'),
    import('@/components/ui/universal-modal'),
    import('@/components/ui/dialog'),
  ]);

  warmDatabaseDialogData(db);
}

function buildStartupTasks(): StartupTask[] {
  return [
    {
      id: 'db',
      label: 'База данных',
      detail: 'Ждём локальный bridge и готовность `window.getDB`.',
      status: 'pending',
    },
    {
      id: 'fonts',
      label: 'Шрифты и тема',
      detail: 'Подключаем шрифтовую таблицу и дожидаемся `document.fonts`.',
      status: 'pending',
    },
    {
      id: 'icons-manifest',
      label: 'Каталог иконок',
      detail: 'Загружаем манифест SVG-иконок.',
      status: 'pending',
    },
    {
      id: 'icons-assets',
      label: 'Иконки интерфейса',
      detail: 'Прогреваем самые частые public-иконки.',
      status: 'pending',
    },
    {
      id: 'ranks-art',
      label: 'Ранги и арт',
      detail: 'Кэшируем изображения рангов.',
      status: 'pending',
    },
    {
      id: 'heavy-modals',
      label: 'Модальные окна',
      detail: 'Прогреваем fullscreen-таймер, календарь, базу данных и пикер иконок.',
      status: 'pending',
    },
    {
      id: 'nav-order',
      label: 'Списки и навигация',
      detail: 'Читаем порядок вкладок и базовые списки.',
      status: 'pending',
    },
    {
      id: 'bootstrap-home',
      label: 'Домашняя страница',
      detail: 'Прогреваем домашнюю bootstrap-сводку.',
      status: 'pending',
    },
    {
      id: 'bootstrap-sidebar',
      label: 'Сайдбар',
      detail: 'Собираем сводку для боковой панели.',
      status: 'pending',
    },
    {
      id: 'bootstrap-date-strip',
      label: 'Date strip',
      detail: 'Прогреваем календарную полоску на ближайшие дни.',
      status: 'pending',
    },
  ];
}

export function PageWarmer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    let alive = true;
    let tasks = buildStartupTasks();
    let cfgReady = false;
    let actReadyByScreen: Partial<Record<'home' | 'rituals' | 'sidebar' | 'date-strip', boolean>> = {};
    let manifestIcons = new Set<string>();

    const publish = () => {
      if (!alive) return;
      const doneCount = tasks.filter((task) => task.status === 'done' || task.status === 'error').length;
      const total = Math.max(1, tasks.length);
      const activeTask = tasks.find((task) => task.status === 'running') ?? null;
      setStartupReadiness({
        cfgReady,
        actReadyByScreen,
        startupReady: doneCount === total,
        phase: doneCount === total ? 'ready' : 'booting',
        progress: Math.min(100, Math.round((doneCount / total) * 100)),
        activeTaskId: activeTask?.id ?? null,
        activeTaskLabel: activeTask?.label ?? null,
        tasks,
      });
    };

    const setTaskStatus = (id: string, status: StartupTask['status'], patch: Partial<StartupTask> = {}) => {
      tasks = tasks.map((task) => (task.id === id ? { ...task, status, ...patch } : task));
      publish();
    };

    const runTask = async (id: string, runner: () => Promise<void>, timeoutMs = STARTUP_TASK_TIMEOUT_MS) => {
      const current = tasks.find((task) => task.id === id);
      setTaskStatus(id, 'running', {
        detail: current?.detail,
        error: undefined,
      });
      try {
        await withTimeout(runner(), timeoutMs, current?.label ?? id);
        setTaskStatus(id, 'done');
      } catch (error) {
        setTaskStatus(id, 'error', {
          error: error instanceof Error ? error.message : 'Startup task failed',
        });
      }
    };

    const markCfgReady = async () => {
      await waitForAuraDatabase();
      const getDB = window.getDB;
      if (typeof getDB !== 'function') throw new Error('window.getDB is not available');
      const db = getDB();
      if (!db) throw new Error('Database is not ready');
      try {
        loadTaskCategoryConfig(db as never);
      } catch {
        /* ignore */
      }
      cfgReady = true;
    };

    publish();

    const run = async () => {
      const date = todayIsoDate();

      const dbPromise = runTask('db', async () => {
        await waitForAuraDatabase();
      });
      const fontPromise = runTask('fonts', async () => {
        ensureAuraFontsStylesheet();
        if (typeof document === 'undefined' || !document.fonts?.ready) return;
        await withTimeout(document.fonts.ready, FONT_TIMEOUT_MS, 'Fonts');
      }, FONT_TIMEOUT_MS + 500);
      const manifestPromise = runTask('icons-manifest', async () => {
        const manifest = await withTimeout(loadIconsManifest(), STARTUP_TASK_TIMEOUT_MS, 'Icon catalog');
        manifestIcons = new Set(manifest.icons);
      }, STARTUP_TASK_TIMEOUT_MS + 1000);
      const iconsAssetsPromise = runTask('icons-assets', async () => {
        if (manifestIcons.size === 0) {
          await manifestPromise;
        }
        await preloadCuratedIcons(manifestIcons);
      }, STARTUP_TASK_TIMEOUT_MS + 1000);
      const ranksPromise = runTask('ranks-art', async () => {
        await preloadRankArt();
      });

      await dbPromise;
      const db = window.getDB?.();
      if (!db) throw new Error('Database is not ready after startup task');

      const modalsPromise = runTask('heavy-modals', async () => {
        if (manifestIcons.size === 0) {
          await manifestPromise;
        }
        await warmHeavyModalSurfaces(db);
      }, STARTUP_TASK_TIMEOUT_MS + 4000);

      // Apply appearance scale immediately after DB is ready so the loading
      // screen uses the correct rem size — prevents the visual grow on reveal.
      try {
        if (db) {
          const settings = (db.getAppSettings?.() ?? {}) as AuraRow;
          const { appScale, textScale } = readAppearanceScaleSettings(settings);
          applyAppearanceScales(appScale, textScale);
        }
      } catch { /* non-critical */ }

      const navPromise = runTask('nav-order', async () => {
        await loadNavOrderFromDb();
      });
      const cfgReadyPromise = markCfgReady();

      const bootstrapHomePromise = runTask('bootstrap-home', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('home', { date }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS,
          'Home bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, home: true };
      }, BOOTSTRAP_TIMEOUT_MS + 500);
      const bootstrapSidebarPromise = runTask('bootstrap-sidebar', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('sidebar', { date }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS,
          'Sidebar bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, sidebar: true };
      }, BOOTSTRAP_TIMEOUT_MS + 500);
      const bootstrapStripPromise = runTask('bootstrap-date-strip', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('date-strip', { date, rangeDays: 7 }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS,
          'Date strip bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, 'date-strip': true };
      }, BOOTSTRAP_TIMEOUT_MS + 500);

      await Promise.allSettled([
        fontPromise,
        manifestPromise,
        iconsAssetsPromise,
        ranksPromise,
        modalsPromise,
        navPromise,
        cfgReadyPromise,
        bootstrapHomePromise,
        bootstrapSidebarPromise,
        bootstrapStripPromise,
      ]);

      if (!alive) return;

      cfgReady = true;
      actReadyByScreen = {
        home: true,
        rituals: true,
        sidebar: true,
        'date-strip': true,
      };

      tasks = tasks.map((task) =>
        task.status === 'done' || task.status === 'error'
          ? task
          : { ...task, status: 'done' as const }
      );
      setStartupReadiness({
        cfgReady,
        actReadyByScreen,
        startupReady: true,
        phase: 'ready',
        progress: 100,
        activeTaskId: null,
        activeTaskLabel: null,
        tasks,
      });
      window.dispatchEvent(new CustomEvent('aura-startup-done'));
      onDone();
    };

    void run().catch((error) => {
      if (!alive) return;
      tasks = tasks.map((task) =>
        task.status === 'running'
          ? { ...task, status: 'error', error: error instanceof Error ? error.message : 'Startup failed' }
          : task
      );
      setStartupReadiness({
        cfgReady,
        actReadyByScreen,
        startupReady: true,
        phase: 'ready',
        progress: 100,
        activeTaskId: null,
        activeTaskLabel: null,
        tasks,
      });
      window.dispatchEvent(new CustomEvent('aura-startup-done'));
      onDone();
    });

    return () => {
      alive = false;
      tasks = [];
    };
  }, [onDone]);

  return null;
}
