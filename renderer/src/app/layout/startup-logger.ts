/**
 * AURA Startup Debug Logger
 * Выводит детальные тайминги загрузки в консоль ТОЛЬКО в dev-сборке.
 * В проде все функции — no-op (import.meta.env.DEV === false), чтобы не
 * засорять консоль установленного приложения.
 */

// Vite подставляет это значение на этапе сборки; в проде ветки с логами
// полностью вырезаются минификатором (dead-code elimination).
const DEV = import.meta.env.DEV;

type TaskEntry = {
  id: string;
  label: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'done' | 'error' | 'skipped';
  error?: string;
};

const entries = new Map<string, TaskEntry>();
let appStartedAt = Date.now();
let phaseRevealAt: number | null = null;

export function startupLoggerInit() {
  if (!DEV) return;
  appStartedAt = Date.now();
  entries.clear();
  phaseRevealAt = null;
  console.group(
    '%c🚀 AURA Startup',
    'color:#a78bfa;font-weight:700;font-size:13px;'
  );
  console.log(
    '%c[AURA] Startup sequence initiated',
    'color:#6d28d9;',
    new Date().toISOString()
  );
}

export function startupLoggerTaskStart(id: string, label: string) {
  if (!DEV) return;
  const entry: TaskEntry = {
    id,
    label,
    startedAt: Date.now(),
    status: 'running',
  };
  entries.set(id, entry);
  const elapsed = entry.startedAt - appStartedAt;
  console.log(
    `%c[AURA] ▶ ${label}`,
    'color:#7c3aed;',
    `(+${elapsed}ms from start)`
  );
}

export function startupLoggerTaskDone(id: string) {
  if (!DEV) return;
  const entry = entries.get(id);
  if (!entry) return;
  entry.endedAt = Date.now();
  entry.status = 'done';
  const elapsed = entry.endedAt - appStartedAt;
  const duration = entry.endedAt - entry.startedAt;
  console.log(
    `%c[AURA] ✅ ${entry.label}`,
    'color:#059669;',
    `${duration}ms  (total +${elapsed}ms)`
  );
}

export function startupLoggerTaskError(id: string, error: string) {
  if (!DEV) return;
  const entry = entries.get(id);
  if (!entry) return;
  entry.endedAt = Date.now();
  entry.status = 'error';
  entry.error = error;
  const elapsed = entry.endedAt - appStartedAt;
  const duration = entry.endedAt - entry.startedAt;
  console.warn(
    `%c[AURA] ❌ ${entry.label}`,
    'color:#dc2626;',
    `${duration}ms  (total +${elapsed}ms)`,
    `| Error: ${error}`
  );
}

export function startupLoggerPhaseReveal() {
  if (!DEV) return;
  phaseRevealAt = Date.now();
  const elapsed = phaseRevealAt - appStartedAt;
  console.log(
    `%c[AURA] 🎬 REVEAL — loading screen dismissed`,
    'color:#d97706;font-weight:600;',
    `+${elapsed}ms from start`
  );
}

export function startupLoggerPhaseBackground() {
  if (!DEV) return;
  const now = Date.now();
  const elapsed = now - appStartedAt;
  console.log(
    `%c[AURA] 🔥 Background warmup phase started`,
    'color:#7c3aed;',
    `+${elapsed}ms from start`
  );
}

export function startupLoggerFinalize() {
  if (!DEV) return;
  const now = Date.now();
  const totalMs = now - appStartedAt;

  console.groupEnd(); // close 🚀 AURA Startup group

  // Summary table
  const rows = [...entries.values()].map((e) => ({
    Task: e.label,
    Status: e.status === 'done' ? '✅' : e.status === 'error' ? '❌' : e.status === 'skipped' ? '⏭' : '⏳',
    'Duration (ms)': e.endedAt != null ? e.endedAt - e.startedAt : '-',
    'Start offset (ms)': e.startedAt - appStartedAt,
    Error: e.error ?? '',
  }));

  console.groupCollapsed(
    `%c[AURA] 📊 Startup complete in ${totalMs}ms`,
    'color:#059669;font-weight:700;font-size:13px;'
  );
  console.table(rows);
  if (phaseRevealAt != null) {
    console.log(
      `%cCritical path (to reveal): ${phaseRevealAt - appStartedAt}ms`,
      'color:#d97706;font-weight:600;'
    );
    console.log(
      `%cBackground phase: ${totalMs - (phaseRevealAt - appStartedAt)}ms`,
      'color:#7c3aed;'
    );
  }
  console.log(
    `%cTotal startup time: ${totalMs}ms`,
    'color:#059669;font-weight:700;'
  );

  // Expose on window for manual inspection
  (window as unknown as Record<string, unknown>).__auraStartupReport = {
    totalMs,
    revealMs: phaseRevealAt != null ? phaseRevealAt - appStartedAt : null,
    tasks: [...entries.values()].map((e) => ({
      id: e.id,
      label: e.label,
      status: e.status,
      durationMs: e.endedAt != null ? e.endedAt - e.startedAt : null,
      startOffsetMs: e.startedAt - appStartedAt,
      error: e.error,
    })),
  };
  console.log('%c[AURA] window.__auraStartupReport available for inspection', 'color:#6b7280;font-size:11px;');
  console.groupEnd();
}
