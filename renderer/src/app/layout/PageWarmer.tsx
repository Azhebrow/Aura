import { useEffect } from 'react';
import { loadNavOrderFromDb } from '@/shared/bridge/load-nav-order';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import { prefetchBootstrap } from '@/shared/hooks/use-bootstrap-data';
import { ensureAuraFontsStylesheet } from '@/features/theme/load-google-fonts';
import { loadIconsManifest } from '@/features/settings/load-icons-manifest';
import { RANK_TIERS, rankImageSrc } from '@/shared/config/ranks-model';
import { getCategoryProgresses } from '@/shared/bridge/get-category-progresses';
import { TASK_CATEGORY_IDS } from '@/shared/config/domain-taxonomy';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { setStartupReadiness, type StartupTask } from './startup-readiness';

type DbLike = {
  getAll: (table: string) => unknown;
  getAppSettings?: () => unknown;
  getDiaryEntry?: (date: string) => unknown;
  getTimerSessions?: (date: string) => unknown;
  getNutritionEntries?: (date: string) => unknown;
  getCategoryProgress?: (category: string, date: string) => unknown;
  getCategoryProgresses?: (date: string) => Record<string, unknown> | null;
};

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

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
    if (img.complete) resolve();
  });
}

function warmTables(db: DbLike, tables: string[]) {
  const touched: string[] = [];
  for (const table of tables) {
    try {
      db.getAll(table);
      touched.push(table);
    } catch {
      /* best-effort warmup */
    }
  }
  try {
    db.getAppSettings?.();
  } catch {
    /* ignore */
  }
  return touched;
}

function preloadCuratedIcons(available: Set<string>) {
  const urls = CATALOG_ICON_NAMES.flatMap((name) => (available.has(name) ? [`/icons/${encodeURIComponent(name)}.svg`] : []));
  return Promise.allSettled(urls.map((src) => preloadImage(src)));
}

function preloadRankArt() {
  return Promise.allSettled(RANK_TIERS.map((tier) => preloadImage(rankImageSrc(tier.imageNumber))));
}

function warmPointsService(db: DbLike, date: string) {
  const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
  const pointsApi = Ctor ? (new Ctor(db as never) as any) : null;
  const month = new Date(`${date}T00:00:00`);
  if (!Number.isNaN(month.getTime()) && pointsApi) {
    const year = month.getFullYear();
    const monthIndex = month.getMonth() + 1;
    const types = ['completion', 'points', 'rituals', 'mood', 'income', 'expense', 'finance', 'calories'] as const;
    for (const type of types) {
      try {
        pointsApi.getMonthRange(year, monthIndex, type);
      } catch {
        /* best effort */
      }
      try {
        pointsApi.getDayData(date, type);
      } catch {
        /* best effort */
      }
    }
    try {
      pointsApi.calculateCumulativePoints(date);
    } catch {
      /* best effort */
    }
    try {
      pointsApi.isDayOpen(date);
    } catch {
      /* best effort */
    }
    try {
      pointsApi.isFutureDay(date);
    } catch {
      /* best effort */
    }
  }

  try {
    getCategoryProgresses(db as never, date, TASK_CATEGORY_IDS);
  } catch {
    /* best effort */
  }
  try {
    loadTaskCategoryConfig(db as never);
  } catch {
    /* best effort */
  }
  try {
    db.getAll('act_daily_points');
  } catch {
    /* best effort */
  }
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
      id: 'nav-order',
      label: 'Списки и навигация',
      detail: 'Читаем порядок вкладок и базовые списки.',
      status: 'pending',
    },
    {
      id: 'cfg-forms',
      label: 'CFG и настройки',
      detail: 'Поднимаем cfg-таблицы и читаем конфиг категорий задач.',
      status: 'pending',
    },
    {
      id: 'analytics',
      label: 'Статистика и календарь',
      detail: 'Прогреваем точки, прогресс категорий и legacy PointsService.',
      status: 'pending',
    },
    {
      id: 'timer-data',
      label: 'Таймер и сессии',
      detail: 'Прогреваем задачи таймера, музыку и дневные сессии.',
      status: 'pending',
    },
    {
      id: 'diary-data',
      label: 'Дневник и питание',
      detail: 'Прогреваем записи дневника, настроения и питание.',
      status: 'pending',
    },
    {
      id: 'bootstrap-home',
      label: 'Домашняя страница',
      detail: 'Прогреваем домашнюю bootstrap-сводку.',
      status: 'pending',
    },
    {
      id: 'bootstrap-rituals',
      label: 'Страница ритуалов',
      detail: 'Прогреваем данные ритуалов и списков.',
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

    const warmCfgGroup = async () => {
      await waitForAuraDatabase();
      const getDB = window.getDB;
      if (typeof getDB !== 'function') throw new Error('window.getDB is not available');
      const db = getDB();
      if (!db) throw new Error('Database is not ready');
      const tables = warmTables(db, [
        'cfg_tasks',
        'cfg_leisure_tasks',
        'cfg_goal_categories',
        'cfg_vows',
        'cfg_diary_moods',
        'cfg_diary_categories',
        'cfg_diary_entry_presets',
        'cfg_nutrition_products',
        'cfg_nutrition_presets',
        'cfg_accounts',
        'cfg_income_categories',
        'cfg_expense_categories',
        'cfg_ambient_music',
      ]);
      try {
        loadTaskCategoryConfig(db as never);
      } catch {
        /* ignore */
      }
      cfgReady = tables.length > 0;
    };

    publish();

    const run = async () => {
      const date = todayYmd();

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

      const navPromise = runTask('nav-order', async () => {
        await loadNavOrderFromDb();
      });
      const cfgFormsPromise = runTask('cfg-forms', warmCfgGroup);
      const analyticsPromise = runTask('analytics', async () => {
        const getDB = window.getDB;
        if (typeof getDB !== 'function') throw new Error('window.getDB is not available');
        const db = getDB();
        if (!db) throw new Error('Database is not ready');
        warmPointsService(db, date);
        warmTables(db, ['act_daily_points', 'act_task_completions', 'act_daily_plans', 'act_goal_tasks']);
      });
      const timerPromise = runTask('timer-data', async () => {
        const getDB = window.getDB;
        if (typeof getDB !== 'function') throw new Error('window.getDB is not available');
        const db = getDB();
        if (!db) throw new Error('Database is not ready');
        warmTables(db, ['cfg_tasks', 'cfg_leisure_tasks', 'cfg_ambient_music']);
        try {
          db.getTimerSessions?.(date);
        } catch {
          /* ignore */
        }
      });
      const diaryPromise = runTask('diary-data', async () => {
        const getDB = window.getDB;
        if (typeof getDB !== 'function') throw new Error('window.getDB is not available');
        const db = getDB();
        if (!db) throw new Error('Database is not ready');
        warmTables(db, [
          'cfg_diary_moods',
          'cfg_diary_categories',
          'cfg_diary_entry_presets',
          'cfg_nutrition_products',
          'cfg_nutrition_presets',
          'cfg_accounts',
          'cfg_income_categories',
          'cfg_expense_categories',
        ]);
        try {
          db.getDiaryEntry?.(date);
        } catch {
          /* ignore */
        }
        try {
          db.getNutritionEntries?.(date);
        } catch {
          /* ignore */
        }
      });

      const bootstrapHomePromise = runTask('bootstrap-home', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('home', { date }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS,
          'Home bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, home: true };
      }, BOOTSTRAP_TIMEOUT_MS + 500);
      const bootstrapRitualsPromise = runTask('bootstrap-rituals', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('rituals', { date }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS,
          'Rituals bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, rituals: true };
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
        navPromise,
        cfgFormsPromise,
        analyticsPromise,
        timerPromise,
        diaryPromise,
        bootstrapHomePromise,
        bootstrapRitualsPromise,
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
