import { useEffect } from 'react';
import { loadNavOrderFromDb } from '@/shared/bridge/load-nav-order';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import { prefetchBootstrap } from '@/shared/hooks/use-bootstrap-data';
import { ensureAuraFontsStylesheet } from '@/features/theme/load-google-fonts';
import { loadIconsManifest } from '@/features/settings/load-icons-manifest';
import { getCurrentRank, RANK_TIERS, rankImageSrc } from '@/shared/config/ranks-model';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { applyAppearanceScales, readAppearanceScaleSettings } from '@/features/theme/appearance-scale';
import { todayIsoDate } from '@/shared/lib/dates';
import { buildTimerDaySnapshot, timerTaskDailyProgressPct as snapshotTimerTaskDailyProgressPct } from '@/shared/lib/timer-day-snapshot';
import { loadPickerTasks, sameSessions, timerTaskDailyProgressPct } from '@/features/timer/timer-utils';
import { buildTimerTaskGroupById, getSessionGroup } from '@/features/timer/timer-session-groups';
import { parseAmbientDefaults, parseAmbientTracks } from '@/features/timer/use-ambient-audio';
import { setStartupReadiness, type StartupTask } from './startup-readiness';
import {
  startupLoggerInit,
  startupLoggerTaskStart,
  startupLoggerTaskDone,
  startupLoggerTaskError,
  startupLoggerPhaseReveal,
  startupLoggerPhaseBackground,
  startupLoggerFinalize,
} from './startup-logger';
import type { AuraDatabase, AuraRow } from '@/types/aura';

// ─── Timeouts ─────────────────────────────────────────────────────────────────
const DB_TIMEOUT_MS            = 12_000;
const FONT_TIMEOUT_MS          = 4_000;
const MANIFEST_TIMEOUT_MS      = 13_000;
const BOOTSTRAP_TIMEOUT_MS     = 9_000;
const NAV_TIMEOUT_MS           = 8_000;

// Background phase — пользователь уже видит интерфейс
const ICONS_ASSETS_TIMEOUT_MS  = 13_000;
const RANKS_TIMEOUT_MS         = 12_000;
const MODALS_TIMEOUT_MS        = 16_000;
const TIMER_WARMUP_TIMEOUT_MS  = 17_000;

// ─── Icon preloads ────────────────────────────────────────────────────────────
const CATALOG_ICON_NAMES = [
  'brain', 'activity', 'calendar', 'apple', 'moon', 'sunrise', 'target',
  'timer', 'list-todo', 'chart-column', 'piggy-bank', 'receipt-text', 'house',
  'flame', 'book-open', 'settings', 'trophy', 'chart-scatter', 'chart-line',
  'heart', 'beef', 'droplet', 'wheat', 'ghost', 'sparkles', 'calendar-days',
  'receipt', 'wallet', 'credit-card', 'clipboard-list', 'clipboard-check', 'check-line',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function preloadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    const done = async () => {
      try { await img.decode?.(); } catch { /* SVG/cached edge case */ }
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
  const urls = CATALOG_ICON_NAMES.flatMap((name) =>
    available.has(name) ? [`/icons/${encodeURIComponent(name)}.svg`] : []
  );
  return Promise.allSettled(urls.map((src) => preloadImage(src)));
}

function preloadIconNames(names: string[], available: Set<string>) {
  const urls = [...new Set(names)]
    .filter((name) => available.has(name))
    .map((name) => `/icons/${encodeURIComponent(name)}.svg`);
  return Promise.allSettled(urls.map((src) => preloadImage(src)));
}

async function preloadRankArt(db: AuraDatabase) {
  // Only preload the user's current rank + neighbours (max 3 images).
  // All 14 tiers at once took ~6s and competed with the main thread.
  let points = 0;
  try {
    points = (db.getLastCumulativePointsBefore?.('9999-12-31') as number | undefined) ?? 0;
  } catch { /* ignore */ }

  const currentTier = getCurrentRank(points);
  const currentIdx = RANK_TIERS.findIndex((t) => t.id === currentTier.id);
  const indicesToLoad = [
    Math.max(0, currentIdx - 1),
    currentIdx,
    Math.min(RANK_TIERS.length - 1, currentIdx + 1),
  ];
  const uniqueTiers = [...new Set(indicesToLoad)].map((i) => RANK_TIERS[i]);

  const entries = await Promise.allSettled(
    uniqueTiers.map(async (tier) => {
      const src = rankImageSrc(tier.imageNumber);
      const image = await preloadImage(src);
      return [src, image] as const;
    })
  );
  window.__auraRankImageCache = {
    ...(window.__auraRankImageCache ?? {}),
    ...Object.fromEntries(
      entries.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    ),
  };
}

function warmDatabaseDialogData(db: AuraDatabase) {
  const runtimeDb = db as AuraDatabase & {
    getInfo?: () => { tables?: Array<{ name: string; rowCount: number }>; path?: string; error?: string };
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
  const tableRows =
    runtimeDb.db?.prepare?.("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")?.all?.() ?? [];
  for (const row of tableRows) {
    if (!row.name) continue;
    try {
      runtimeDb.db?.prepare?.(`SELECT COUNT(*) as count FROM ${row.name}`)?.get?.();
    } catch { /* best-effort */ }
  }
}

async function warmHeavyModalSurfaces(db: AuraDatabase) {
  warmDatabaseDialogData(db);
}

function warmTimerAnimationPrimitives() {
  if (typeof document === 'undefined') return Promise.resolve();
  return new Promise<void>((resolve) => {
    const node = document.createElement('div');
    node.className = 'aura-vinyl-spin';
    node.style.cssText = 'position:fixed;left:-20px;top:-20px;width:1px;height:1px;opacity:0;pointer-events:none;transform:translateZ(0)';
    document.body.appendChild(node);
    node.getBoundingClientRect();
    window.requestAnimationFrame(() => { node.remove(); resolve(); });
  });
}

async function warmTimerSurfaces(db: AuraDatabase, date: string, availableIcons: Set<string>) {
  // Warm data caches
  const snapshot = buildTimerDaySnapshot(db, date);
  const pickerTasks = loadPickerTasks(db);
  const groupByTaskId = buildTimerTaskGroupById(db);
  sameSessions(snapshot.sessions, snapshot.sessions);
  for (const session of snapshot.sessions.slice(0, 12)) {
    getSessionGroup(session, groupByTaskId);
  }
  for (const task of Object.values(snapshot.byGroup).flat().slice(0, 24)) {
    snapshotTimerTaskDailyProgressPct(task);
    timerTaskDailyProgressPct(task);
  }

  const taskIcons = pickerTasks.flatMap((task) => (task.icon ? [task.icon] : []));
  const tracks = parseAmbientTracks(db);
  const defaults = parseAmbientDefaults((db.getAppSettings?.() ?? null) as AuraRow | null);
  const defaultTrackIds = new Set([defaults.timer, defaults.stopwatch, defaults.break].filter(Boolean));
  const orderedTracks = [
    ...tracks.filter((t) => defaultTrackIds.has(t.id)),
    ...tracks.filter((t) => !defaultTrackIds.has(t.id)),
  ];
  const ambientIcons = orderedTracks.flatMap((t) => (t.icon ? [t.icon] : []));

  // Phase B: icon preloads + cover images (fast, parallel, no audio)
  await Promise.allSettled([
    preloadIconNames(
      [...taskIcons, ...ambientIcons, 'pause', 'play', 'square', 'coffee', 'shuffle', 'volume-2'],
      availableIcons
    ),
    Promise.allSettled(
      orderedTracks.flatMap((t) => (t.coverImage ? [preloadImage(t.coverImage)] : []))
    ),
    warmTimerAnimationPrimitives(),
  ]);
}

// ─── Task definitions ─────────────────────────────────────────────────────────

/**
 * CRITICAL задачи — блокируют экран загрузки.
 * Пользователь не видит интерфейс пока они не завершены.
 */
function buildCriticalTasks(): StartupTask[] {
  return [
    { id: 'db',               label: 'База данных',      detail: 'Ждём Electron bridge и window.getDB',      status: 'pending' },
    { id: 'fonts',            label: 'Шрифты',           detail: 'document.fonts.ready + Google Fonts',      status: 'pending' },
    { id: 'icons-manifest',   label: 'Каталог иконок',   detail: 'JSON-манифест SVG-иконок',                 status: 'pending' },
    { id: 'nav-order',        label: 'Навигация',        detail: 'Порядок вкладок из БД',                    status: 'pending' },
    { id: 'bootstrap-home',   label: 'Главная',          detail: 'Bootstrap-сводка домашней страницы',       status: 'pending' },
    { id: 'bootstrap-sidebar',label: 'Сайдбар',          detail: 'Bootstrap-сводка боковой панели',          status: 'pending' },
    { id: 'bootstrap-strip',  label: 'Полоска дат',      detail: 'Ближайшие 7 дней',                         status: 'pending' },
  ];
}

/**
 * BACKGROUND задачи — запускаются ПОСЛЕ reveal, пользователь уже в интерфейсе.
 * Нужны для плавной работы, но не блокируют старт.
 */
function buildBackgroundTasks(): StartupTask[] {
  return [
    { id: 'icons-assets',  label: 'Иконки UI',       detail: 'Preload 32 SVG в браузерный кеш',          status: 'pending' },
    { id: 'ranks-art',     label: 'Арт рангов',       detail: 'Кеш изображений всех уровней рангов',      status: 'pending' },
    { id: 'heavy-modals',  label: 'Данные модалок',    detail: 'DB metadata без UI-chunk прогрева',        status: 'pending' },
    { id: 'timer-warmup',  label: 'Таймер',            detail: 'Снимок дня, иконки, обложки, анимация',    status: 'pending' },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PageWarmer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    let alive = true;
    let criticalTasks = buildCriticalTasks();
    let backgroundTasks = buildBackgroundTasks();
    let cfgReady = false;
    let actReadyByScreen: Partial<Record<'home' | 'rituals' | 'sidebar' | 'date-strip', boolean>> = {};
    let manifestIcons = new Set<string>();

    startupLoggerInit();

    const allTasks = () => [...criticalTasks, ...backgroundTasks];

    const publish = () => {
      if (!alive) return;
      const tasks = allTasks();
      const doneCount = tasks.filter((t) => t.status === 'done' || t.status === 'error').length;
      const criticalDone = criticalTasks.every((t) => t.status === 'done' || t.status === 'error');
      const activeTask = criticalTasks.find((t) => t.status === 'running')
        ?? backgroundTasks.find((t) => t.status === 'running')
        ?? null;

      // Progress counts only critical tasks for the loading screen bar
      const critTotal = Math.max(1, criticalTasks.length);
      const critDone = criticalTasks.filter((t) => t.status === 'done' || t.status === 'error').length;

      setStartupReadiness({
        cfgReady,
        actReadyByScreen,
        startupReady: doneCount === tasks.length,
        phase: criticalDone ? 'ready' : 'booting',
        progress: Math.min(100, Math.round((critDone / critTotal) * 100)),
        activeTaskId: activeTask?.id ?? null,
        activeTaskLabel: activeTask?.label ?? null,
        tasks,
      });
    };

    const setTaskStatus = (
      list: StartupTask[],
      id: string,
      status: StartupTask['status'],
      patch: Partial<StartupTask> = {}
    ): StartupTask[] =>
      list.map((t) => (t.id === id ? { ...t, status, ...patch } : t));

    const runTask = async (
      id: string,
      runner: () => Promise<void>,
      timeoutMs: number,
      isCritical: boolean
    ) => {
      const label = (isCritical ? criticalTasks : backgroundTasks).find((t) => t.id === id)?.label ?? id;

      if (isCritical) {
        criticalTasks = setTaskStatus(criticalTasks, id, 'running');
      } else {
        backgroundTasks = setTaskStatus(backgroundTasks, id, 'running');
      }
      publish();
      startupLoggerTaskStart(id, label);

      try {
        await withTimeout(runner(), timeoutMs, label);
        if (isCritical) {
          criticalTasks = setTaskStatus(criticalTasks, id, 'done');
        } else {
          backgroundTasks = setTaskStatus(backgroundTasks, id, 'done');
        }
        publish();
        startupLoggerTaskDone(id);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Startup task failed';
        if (isCritical) {
          criticalTasks = setTaskStatus(criticalTasks, id, 'error', { error: errMsg });
        } else {
          backgroundTasks = setTaskStatus(backgroundTasks, id, 'error', { error: errMsg });
        }
        publish();
        startupLoggerTaskError(id, errMsg);
      }
    };

    const markCfgReady = async () => {
      await waitForAuraDatabase();
      const db = window.getDB?.();
      if (!db) throw new Error('window.getDB unavailable');
      try { loadTaskCategoryConfig(db as never); } catch { /* ignore */ }
      cfgReady = true;
    };

    publish();

    const run = async () => {
      const date = todayIsoDate();

      // ── PHASE 1: Critical tasks (parallel where possible) ──────────────────

      const dbPromise = runTask('db', () => waitForAuraDatabase(), DB_TIMEOUT_MS, true);

      const fontPromise = runTask('fonts', async () => {
        ensureAuraFontsStylesheet();
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await withTimeout(document.fonts.ready, FONT_TIMEOUT_MS, 'Fonts');
        }
      }, FONT_TIMEOUT_MS + 500, true);

      const manifestPromise = runTask('icons-manifest', async () => {
        const manifest = await withTimeout(loadIconsManifest(), MANIFEST_TIMEOUT_MS, 'Icon manifest');
        manifestIcons = new Set(manifest.icons);
      }, MANIFEST_TIMEOUT_MS + 1000, true);

      // Wait for DB before bootstrap + nav
      await dbPromise;

      if (!alive) return;

      const db = window.getDB?.();
      if (!db) throw new Error('Database not ready after startup task');

      // Apply appearance scales immediately so the loading screen correct size
      try {
        const settings = (db.getAppSettings?.() ?? {}) as AuraRow;
        const { appScale, textScale } = readAppearanceScaleSettings(settings);
        applyAppearanceScales(appScale, textScale);
      } catch { /* non-critical */ }

      const navPromise = runTask('nav-order', () => loadNavOrderFromDb().then(() => {}), NAV_TIMEOUT_MS, true);
      const cfgReadyPromise = markCfgReady();

      const bootstrapHomePromise = runTask('bootstrap-home', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('home', { date }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS, 'Home bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, home: true };
      }, BOOTSTRAP_TIMEOUT_MS + 500, true);

      const bootstrapSidebarPromise = runTask('bootstrap-sidebar', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('sidebar', { date }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS, 'Sidebar bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, sidebar: true };
      }, BOOTSTRAP_TIMEOUT_MS + 500, true);

      const bootstrapStripPromise = runTask('bootstrap-strip', async () => {
        const payload = await withTimeout(
          prefetchBootstrap('date-strip', { date, rangeDays: 7 }, { cacheMs: 8_000 }),
          BOOTSTRAP_TIMEOUT_MS, 'Date strip bootstrap'
        );
        if (payload) actReadyByScreen = { ...actReadyByScreen, 'date-strip': true };
      }, BOOTSTRAP_TIMEOUT_MS + 500, true);

      // Wait for all critical tasks
      await Promise.allSettled([
        fontPromise,
        manifestPromise,
        navPromise,
        cfgReadyPromise,
        bootstrapHomePromise,
        bootstrapSidebarPromise,
        bootstrapStripPromise,
      ]);

      if (!alive) return;

      // Force all screens ready after critical phase
      cfgReady = true;
      actReadyByScreen = { home: true, rituals: true, sidebar: true, 'date-strip': true };

      // Mark any stuck critical tasks as done
      criticalTasks = criticalTasks.map((t) =>
        t.status === 'done' || t.status === 'error' ? t : { ...t, status: 'done' as const }
      );

      publish();
      startupLoggerPhaseReveal();

      // Reveal the UI
      window.dispatchEvent(new CustomEvent('aura-startup-done'));
      onDone();

      // ── PHASE 2: Background warmup (non-blocking) ──────────────────────────
      if (!alive) return;

      startupLoggerPhaseBackground();

      // Wait for manifest if not done yet
      if (manifestIcons.size === 0) {
        await manifestPromise.catch(() => {});
      }

      await Promise.allSettled([
        runTask('icons-assets', () => preloadCuratedIcons(manifestIcons).then(() => {}), ICONS_ASSETS_TIMEOUT_MS, false),
        runTask('ranks-art', () => preloadRankArt(db), RANKS_TIMEOUT_MS, false),
        runTask('heavy-modals', () => warmHeavyModalSurfaces(db), MODALS_TIMEOUT_MS, false),
        runTask('timer-warmup', () => warmTimerSurfaces(db, date, manifestIcons), TIMER_WARMUP_TIMEOUT_MS, false),
      ]);

      if (!alive) return;

      // Final state
      backgroundTasks = backgroundTasks.map((t) =>
        t.status === 'done' || t.status === 'error' ? t : { ...t, status: 'done' as const }
      );
      setStartupReadiness({
        cfgReady: true,
        actReadyByScreen: { home: true, rituals: true, sidebar: true, 'date-strip': true },
        startupReady: true,
        phase: 'ready',
        progress: 100,
        activeTaskId: null,
        activeTaskLabel: null,
        tasks: allTasks(),
      });

      startupLoggerFinalize();
    };

    void run().catch((error) => {
      if (!alive) return;
      const errMsg = error instanceof Error ? error.message : 'Critical startup failure';
      console.error('[AURA] Critical startup error:', errMsg);

      criticalTasks = criticalTasks.map((t) =>
        t.status === 'running' ? { ...t, status: 'error' as const, error: errMsg } : t
      );

      setStartupReadiness({
        cfgReady: true,
        actReadyByScreen: { home: true, rituals: true, sidebar: true, 'date-strip': true },
        startupReady: true,
        phase: 'ready',
        progress: 100,
        activeTaskId: null,
        activeTaskLabel: null,
        tasks: allTasks(),
      });

      startupLoggerPhaseReveal();
      startupLoggerFinalize();
      window.dispatchEvent(new CustomEvent('aura-startup-done'));
      onDone();
    });

    return () => {
      alive = false;
      criticalTasks = [];
      backgroundTasks = [];
    };
  }, [onDone]);

  return null;
}
