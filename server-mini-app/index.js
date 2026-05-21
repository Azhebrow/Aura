const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const Module = require('module');
const _resolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'better-sqlite3') {
    return _resolveFilename.call(this, path.join(__dirname, '..', 'node_modules', 'better-sqlite3'), parent, isMain, options);
  }
  return _resolveFilename.call(this, request, parent, isMain, options);
};

const getDB = require(path.resolve(__dirname, '../src/system/database/Database.js'));

const app = express();
const PORT = Number(process.env.AURA_API_PORT || 8787);
const HOST = process.env.AURA_API_HOST || '127.0.0.1';
const rendererBuildDir = path.resolve(__dirname, '..', 'renderer-build');
const publicDir = path.resolve(__dirname, '..', 'public');

const metrics = {
  startedAt: Date.now(),
  totalCalls: 0,
  totalErrors: 0,
  totalMs: 0,
  batchRequestsCount: 0,
  batchedOpsCount: 0,
  byMethod: Object.create(null),
};

function getMethodMetrics(method) {
  if (!metrics.byMethod[method]) {
    metrics.byMethod[method] = {
      calls: 0,
      errors: 0,
      totalMs: 0,
    };
  }
  return metrics.byMethod[method];
}

function readMetricsSnapshot() {
  const uptimeMs = Math.max(1, Date.now() - metrics.startedAt);
  const byMethod = Object.entries(metrics.byMethod)
    .map(([method, stat]) => ({
      method,
      calls: stat.calls,
      errors: stat.errors,
      totalMs: Number(stat.totalMs.toFixed(2)),
      avgMs: stat.calls > 0 ? Number((stat.totalMs / stat.calls).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.calls - a.calls);

  return {
    startedAt: metrics.startedAt,
    uptimeMs,
    totalCalls: metrics.totalCalls,
    totalErrors: metrics.totalErrors,
    batchRequestsCount: metrics.batchRequestsCount,
    batchedOpsCount: metrics.batchedOpsCount,
    avgMsPerCall: metrics.totalCalls > 0 ? Number((metrics.totalMs / metrics.totalCalls).toFixed(2)) : 0,
    callsPerMinute: Number(((metrics.totalCalls * 60000) / uptimeMs).toFixed(1)),
    topByCalls: byMethod.slice(0, 20),
    topByTotalMs: [...byMethod].sort((a, b) => b.totalMs - a.totalMs).slice(0, 20),
  };
}

function resetMetrics() {
  metrics.startedAt = Date.now();
  metrics.totalCalls = 0;
  metrics.totalErrors = 0;
  metrics.totalMs = 0;
  metrics.batchRequestsCount = 0;
  metrics.batchedOpsCount = 0;
  metrics.byMethod = Object.create(null);
}

function executeDbCall(method, args) {
  const requestStart = performance.now();
  const methodName = typeof method === 'string' ? method : 'unknown';
  const methodMetrics = getMethodMetrics(methodName);
  try {
    if (!method || typeof method !== 'string') {
      metrics.totalErrors += 1;
      methodMetrics.errors += 1;
      return { status: 400, payload: { ok: false, error: 'Method is required' } };
    }

    const db = getDB();
    if (!db) {
      metrics.totalErrors += 1;
      methodMetrics.errors += 1;
      return { status: 500, payload: { ok: false, error: 'Database is not available' } };
    }

    const fn = db[method];
    if (typeof fn !== 'function') {
      metrics.totalErrors += 1;
      methodMetrics.errors += 1;
      return { status: 404, payload: { ok: false, error: `Unknown DB method: ${method}` } };
    }

    const safeArgs = Array.isArray(args) ? args : [];
    const result = fn.apply(db, safeArgs);
    return { status: 200, payload: { ok: true, result } };
  } catch (error) {
    metrics.totalErrors += 1;
    methodMetrics.errors += 1;
    return {
      status: 500,
      payload: { ok: false, error: error instanceof Error ? error.message : String(error) },
    };
  } finally {
    const elapsed = Math.max(0, performance.now() - requestStart);
    metrics.totalCalls += 1;
    metrics.totalMs += elapsed;
    methodMetrics.calls += 1;
    methodMetrics.totalMs += elapsed;
  }
}

function isActiveRow(row) {
  const active = row?.active;
  return !(active === 0 || active === '0' || active === false || active === 'false');
}

function buildRitualCountsByType(morningCfg, eveningCfg, morningRows, eveningRows) {
  const morningIds = new Set((morningCfg ?? []).filter((row) => row?.id && isActiveRow(row)).map((row) => String(row.id)));
  const eveningIds = new Set((eveningCfg ?? []).filter((row) => row?.id && isActiveRow(row)).map((row) => String(row.id)));
  const countDone = (rows, ids) => (rows ?? []).reduce((acc, row) => {
    const ritualId = String(row?.ritual_id ?? '');
    if (!ritualId || !ids.has(ritualId)) return acc;
    return acc + (Number(row?.completed) === 1 ? 1 : 0);
  }, 0);
  return {
    sunrise: { completed: countDone(morningRows, morningIds), total: morningIds.size },
    sunset: { completed: countDone(eveningRows, eveningIds), total: eveningIds.size },
  };
}

function bootstrapHome(db, date) {
  const cfgTasks = db.getAll('cfg_tasks') ?? [];
  const cfgRitualsMorning = db.getAll('cfg_rituals_morning') ?? [];
  const cfgRitualsEvening = db.getAll('cfg_rituals_evening') ?? [];
  const ritualsMorningRows = db.getRitualsMorning?.(date) ?? [];
  const ritualsEveningRows = db.getRitualsEvening?.(date) ?? [];
  const taskProgressById = {};
  const timerTotalsByTaskId = {};
  for (const task of cfgTasks) {
    const taskId = String(task.id ?? '');
    if (!taskId) continue;
    const taskType = String(task.task_type ?? '');
    if (taskType === 'timer') {
      timerTotalsByTaskId[taskId] = db.getTaskTimerTotal?.(date, taskId) ?? 0;
      taskProgressById[taskId] = null;
    } else if (taskType === 'ritual' || taskType === 'nutrition') {
      taskProgressById[taskId] = null;
    } else {
      taskProgressById[taskId] = db.getTaskProgress?.(taskId, date) ?? null;
    }
  }
  return {
    categoryProgresses: {},
    appSettings: db.getAppSettings?.() ?? null,
    cfgTasks,
    cfgRitualsMorning,
    cfgRitualsEvening,
    ritualsMorningRows,
    ritualsEveningRows,
    ritualCountsByType: buildRitualCountsByType(cfgRitualsMorning, cfgRitualsEvening, ritualsMorningRows, ritualsEveningRows),
    nutritionEntries: db.getNutritionEntries?.(date) ?? [],
    taskProgressById,
    timerTotalsByTaskId,
  };
}

function bootstrapRituals(db, date) {
  const goalsFromAll = db.getAll?.('cfg_goals') ?? [];
  const goals = goalsFromAll.length ? goalsFromAll : (db.getAllGoals?.() ?? []);
  const stages = db.getAll?.('cfg_goal_stages') ?? [];
  const tasks = db.getAll?.('cfg_goal_tasks') ?? [];
  const stagesByGoal = {};
  const tasksByStage = {};
  for (const goal of goals) {
    const goalId = String(goal.id ?? '');
    if (!goalId) continue;
    const goalStages = stages
      .filter((stage) => String(stage.goal_id ?? '') === goalId)
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
    stagesByGoal[goalId] = goalStages.length ? goalStages : (db.getStagesByGoal?.(goalId) ?? []);
    for (const stage of stagesByGoal[goalId]) {
      const stageId = String(stage.id ?? '');
      if (!stageId) continue;
      const stageTasks = tasks
        .filter((task) => String(task.stage_id ?? '') === stageId)
        .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
      tasksByStage[stageId] = stageTasks.length ? stageTasks : (db.getTasksByStage?.(stageId) ?? []);
    }
  }
  return {
    goals,
    stagesByGoal,
    tasksByStage,
    goalProgressRows: db.getGoalTasksProgressByDate?.(date) ?? [],
    cfgRitualsMorning: db.getAll('cfg_rituals_morning') ?? [],
    cfgRitualsEvening: db.getAll('cfg_rituals_evening') ?? [],
    ritualsMorningRows: db.getRitualsMorning?.(date) ?? [],
    ritualsEveningRows: db.getRitualsEvening?.(date) ?? [],
    cfgVows: db.getAll('cfg_vows') ?? [],
    appSettings: db.getAppSettings?.() ?? null,
  };
}

function bootstrapSidebar(db, date) {
  return {
    categoryProgresses: {},
    dailyPointsRows: db.getAll('act_daily_points') ?? [],
    timerSessions: db.getTimerSessions?.(date) ?? [],
    nutritionEntries: db.getNutritionEntries?.(date) ?? [],
    diaryEntry: db.getDiaryEntry?.(date) ?? null,
    transactions: db.getTransactions?.(date) ?? [],
  };
}

function bootstrapDateStrip(db, date, rangeDays = 7) {
  const out = [];
  const dailyPointsRows = db.getAll('act_daily_points') ?? [];
  const dailyByDate = new Map(dailyPointsRows.map((row) => [String(row.date ?? ''), row]));
  const d = new Date(`${date}T00:00:00`);
  for (let i = 0; i < rangeDays; i += 1) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${day}`;
    const daily = dailyByDate.get(ymd);
    const completion = daily && daily.completion_percent != null ? Number(daily.completion_percent) || 0 : 0;
    out.push({
      date: ymd,
      categoryProgresses: {},
      completionPercent: Math.min(100, Math.max(0, completion)),
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
if (fs.existsSync(rendererBuildDir)) {
  app.use(express.static(rendererBuildDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const indexHtml = path.join(rendererBuildDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    return next();
  });
}

app.get('/api/health', (_req, res) => {
  const db = getDB();
  res.json({
    ok: true,
    hasDb: Boolean(db),
    dbPath: db?.dbPath || null,
    mode: 'mini-app-server'
  });
});

app.get('/api/db/methods', (_req, res) => {
  try {
    const db = getDB();
    if (!db) {
      return res.status(500).json({ ok: false, error: 'Database is not available', methods: [] });
    }

    const methods = new Set();
    let cursor = db;
    while (cursor && cursor !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(cursor)) {
        if (key === 'constructor') continue;
        const value = db[key];
        if (typeof value === 'function') methods.add(key);
      }
      cursor = Object.getPrototypeOf(cursor);
    }

    return res.json({ ok: true, methods: Array.from(methods) });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      methods: []
    });
  }
});

app.get('/api/metrics', (_req, res) => {
  res.json({ ok: true, metrics: readMetricsSnapshot() });
});

app.post('/api/metrics/reset', (_req, res) => {
  resetMetrics();
  res.json({ ok: true });
});

app.post('/api/db/call', (req, res) => {
  const payload = req.body || {};
  const { status, payload: response } = executeDbCall(payload.method, payload.args);
  return res.status(status).json(response);
});

app.post('/api/db/batch', (req, res) => {
  const operations = Array.isArray(req.body?.operations) ? req.body.operations : [];
  metrics.batchRequestsCount += 1;
  metrics.batchedOpsCount += operations.length;
  const results = operations.map((operation, index) => {
    const { status, payload } = executeDbCall(operation?.method, operation?.args);
    return { index, status, ...payload };
  });
  res.json({ ok: true, results });
});

app.post('/api/bootstrap/:screen', (req, res) => {
  try {
    const db = getDB();
    if (!db) return res.status(500).json({ ok: false, error: 'Database is not available' });
    const screen = String(req.params.screen || '').toLowerCase();
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10));

    if (screen === 'home') return res.json({ ok: true, data: bootstrapHome(db, date) });
    if (screen === 'rituals') return res.json({ ok: true, data: bootstrapRituals(db, date) });
    if (screen === 'sidebar') return res.json({ ok: true, data: bootstrapSidebar(db, date) });
    if (screen === 'date-strip') {
      const rangeDays = Number(req.body?.rangeDays) || 7;
      return res.json({ ok: true, data: bootstrapDateStrip(db, date, Math.max(3, Math.min(31, rangeDays))) });
    }
    return res.status(404).json({ ok: false, error: `Unknown screen: ${screen}` });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[mini-app-server] listening on http://${HOST}:${PORT}`);
});
