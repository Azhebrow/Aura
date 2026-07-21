/**
 * Adapter for better-sqlite3 to provide AuraDatabase interface
 * Table names match the actual SQLite schema: cfg_* and act_* prefixes
 */

function createDatabaseAdapter(db, _dbPath) {
  _dbPath = _dbPath || '';

  function ensureAmbientMusicColumns(tableName) {
    if (tableName !== 'cfg_ambient_music') return;
    try {
      const columns = db.prepare('PRAGMA table_info(cfg_ambient_music)').all().map((col) => col.name);
      if (!columns.includes('cover_image')) {
        db.prepare('ALTER TABLE cfg_ambient_music ADD COLUMN cover_image TEXT').run();
      }
      if (!columns.includes('level')) {
        db.prepare('ALTER TABLE cfg_ambient_music ADD COLUMN level INTEGER DEFAULT 0').run();
      }
      db.prepare("UPDATE cfg_ambient_music SET id = 'ambient_' || rowid WHERE id IS NULL OR id = ''").run();
      db.prepare(`
        UPDATE cfg_ambient_music
        SET level = rowid
        WHERE level IS NULL
           OR (SELECT COUNT(DISTINCT COALESCE(level, 0)) FROM cfg_ambient_music) <= 1
      `).run();
    } catch { /* silent */ }
  }

  let _goalTimelineColumnsMigrated = false;
  function ensureGoalTimelineColumns() {
    if (_goalTimelineColumnsMigrated) return;
    _goalTimelineColumnsMigrated = true;
    try {
      const goalCols = db.prepare('PRAGMA table_info(cfg_goals)').all().map(c => c.name);
      if (!goalCols.includes('goal_type')) db.prepare("ALTER TABLE cfg_goals ADD COLUMN goal_type TEXT DEFAULT 'standard'").run();
      if (!goalCols.includes('linked_task_id')) db.prepare('ALTER TABLE cfg_goals ADD COLUMN linked_task_id TEXT').run();
      if (!goalCols.includes('timeline_start_date')) db.prepare('ALTER TABLE cfg_goals ADD COLUMN timeline_start_date TEXT').run();
    } catch { /* silent */ }
    try {
      const stageCols = db.prepare('PRAGMA table_info(cfg_goal_stages)').all().map(c => c.name);
      if (!stageCols.includes('threshold_hours')) db.prepare('ALTER TABLE cfg_goal_stages ADD COLUMN threshold_hours REAL').run();
    } catch { /* silent */ }
  }

  let _taskProgressMigrated = false;
  function ensureTaskProgressTable() {
    if (_taskProgressMigrated) return;
    _taskProgressMigrated = true;
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS act_task_progress (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          task_id TEXT NOT NULL,
          value TEXT,
          completed INTEGER DEFAULT 0,
          current_value TEXT,
          selected_list_item TEXT,
          completion_percent REAL DEFAULT 0,
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(date, task_id)
        )
      `).run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_act_task_progress_date ON act_task_progress(date)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_act_task_progress_task ON act_task_progress(task_id)').run();
    } catch { /* silent */ }

    try {
      const legacyRows = db.prepare('SELECT * FROM act_tasks').all();
      const tasks = db.prepare('SELECT id, category_type, level FROM cfg_tasks').all();
      const insert = db.prepare(`
        INSERT OR IGNORE INTO act_task_progress
          (id, date, task_id, value, completed, current_value, selected_list_item, completion_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of legacyRows) {
        const date = String(row.date ?? '');
        if (!date) continue;
        for (const task of tasks) {
          const taskId = String(task.id ?? '');
          const cat = String(task.category_type ?? '');
          const level = String(task.level ?? '');
          if (!taskId || !cat || !level) continue;
          const colVal = `${cat}_${level}_value`;
          const colPct = `${cat}_${level}_completion_percent`;
          const rawValue = row[colVal];
          const rawPct = row[colPct];
          const pct = Number(rawPct ?? 0);
          const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== '';
          const hasPct = Number.isFinite(pct) && Math.abs(pct) > 0.000001;
          if (!hasValue && !hasPct) continue;
          const id = `tp_${date.replace(/-/g, '')}_${taskId}`;
          insert.run(id, date, taskId, rawValue ?? null, pct >= 100 ? 1 : 0, rawValue ?? null, null, Number.isFinite(pct) ? pct : 0);
        }
      }
    } catch { /* legacy table may not exist */ }
  }

  function accountExists(accountId) {
    if (!accountId) return false;
    try {
      return Boolean(db.prepare('SELECT id FROM cfg_accounts WHERE id = ? LIMIT 1').get(accountId));
    } catch {
      return false;
    }
  }

  function updateAccountBalance(accountId, delta) {
    if (!accountId || !Number.isFinite(delta) || delta === 0) return;
    db.prepare('UPDATE cfg_accounts SET balance = COALESCE(balance, 0) + ? WHERE id = ?').run(delta, accountId);
  }

  function validateTransaction(tx) {
    const type = String(tx?.type ?? 'expense');
    const amount = Number(tx?.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Transaction amount must be positive');
    if (type === 'transfer') {
      const fromId = String(tx?.from_id ?? '');
      const toId = String(tx?.to_id ?? '');
      if (!fromId || !toId) throw new Error('Transfer requires both accounts');
      if (fromId === toId) throw new Error('Transfer accounts must differ');
      if (!accountExists(fromId) || !accountExists(toId)) throw new Error('Transfer account not found');
      return;
    }
    const accountId = String(tx?.account_id ?? '');
    if (!accountId) throw new Error('Transaction account is required');
    if (!accountExists(accountId)) throw new Error('Transaction account not found');
  }

  function applyTransactionBalance(tx, direction) {
    if (!tx) return;
    const type = String(tx.type ?? 'expense');
    const amount = Number(tx.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (type === 'income') {
      updateAccountBalance(String(tx.account_id ?? ''), amount * direction);
    } else if (type === 'transfer') {
      updateAccountBalance(String(tx.from_id ?? ''), -amount * direction);
      updateAccountBalance(String(tx.to_id ?? ''), amount * direction);
    } else {
      updateAccountBalance(String(tx.account_id ?? ''), -amount * direction);
    }
  }

  // ─── Core day-progress computation ─────────────────────────────────────────
  // Single source of truth: reads from act_task_progress, act_timer_sessions,
  // act_rituals_morning/evening. Never reads from act_task_completions.
  function computeDayProgress(date) {
    ensureTaskProgressTable();
    const CATEGORIES = ['rituals', 'time', 'body', 'deps'];
    const categoryPercents = {};

    for (const cat of CATEGORIES) {
      try {
        const tasks = db.prepare(
          'SELECT id, level, task_type, cfg_target_hours, ritual_type FROM cfg_tasks WHERE category_type = ? ORDER BY level ASC'
        ).all(cat);
        if (!tasks.length) { categoryPercents[cat] = 0; continue; }
        let sum = 0;
        for (const t of tasks) {
          let pct = 0;
          const taskType = String(t.task_type ?? '');
          if (taskType === 'timer') {
            const targetHours = Number(t.cfg_target_hours) || 0;
            if (targetHours > 0) {
              try {
                const r = db.prepare('SELECT SUM(duration) as total FROM act_timer_sessions WHERE task_id = ? AND date = ?').get(String(t.id), date);
                pct = Math.min(100, (Number(r?.total ?? 0) / 3600 / targetHours) * 100);
              } catch { pct = 0; }
            }
          } else if (taskType === 'ritual') {
            const ritualType = String(t.ritual_type ?? 'sunrise');
            const isEvening = ritualType === 'sunset' || ritualType === 'evening';
            const table = isEvening ? 'act_rituals_evening' : 'act_rituals_morning';
            const cfgTable = isEvening ? 'cfg_rituals_evening' : 'cfg_rituals_morning';
            try {
              const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM ${cfgTable} WHERE active != 0`).get();
              const total = Number(totalRow?.cnt ?? 0);
              if (total > 0) {
                // Only count completions for rituals that still exist in the active config.
                // Without this JOIN, orphaned ritual entries (deleted from config but
                // still in act_rituals_*) would inflate the completion count.
                const doneRow = db.prepare(
                  `SELECT COUNT(*) as cnt FROM ${table} a
                   INNER JOIN ${cfgTable} c ON c.id = a.ritual_id AND c.active != 0
                   WHERE a.date = ? AND a.completed = 1`
                ).get(date);
                pct = Math.min(100, (Number(doneRow?.cnt ?? 0) / total) * 100);
              }
            } catch { pct = 0; }
          } else {
            const progress = db.prepare('SELECT completion_percent FROM act_task_progress WHERE date = ? AND task_id = ? LIMIT 1').get(date, String(t.id));
            const raw = Number(progress?.completion_percent ?? 0);
            pct = Number.isFinite(raw) ? raw : 0;
          }
          sum += pct;
        }
        categoryPercents[cat] = Math.min(100, sum / tasks.length);
      } catch { categoryPercents[cat] = 0; }
    }

    const vals = Object.values(categoryPercents).filter(v => Number.isFinite(v));
    const completionPercent = vals.length > 0
      ? Math.min(100, vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;

    return { categoryPercents, completionPercent };
  }

  function persistDayAggregates(date, categoryPercents, completionPercent) {
    try {
      const tcRow = db.prepare('SELECT id FROM act_task_completions WHERE date = ? LIMIT 1').get(date);
      if (tcRow) {
        db.prepare(
          'UPDATE act_task_completions SET rituals_percent=?,time_percent=?,body_percent=?,deps_percent=? WHERE date=?'
        ).run(categoryPercents.rituals, categoryPercents.time, categoryPercents.body, categoryPercents.deps, date);
      } else {
        const tcId = 'tc_' + date.replace(/-/g, '');
        db.prepare(
          'INSERT OR IGNORE INTO act_task_completions (id,date,rituals_percent,time_percent,body_percent,deps_percent) VALUES (?,?,?,?,?,?)'
        ).run(tcId, date, categoryPercents.rituals, categoryPercents.time, categoryPercents.body, categoryPercents.deps);
      }
    } catch { /* silent */ }

    try {
      const prevCumulative = (() => {
        try {
          const r = db.prepare('SELECT cumulative_points FROM act_daily_points WHERE date < ? ORDER BY date DESC LIMIT 1').get(date);
          return Number(r?.cumulative_points ?? 0);
        } catch { return 0; }
      })();
      // daily_points: formula 2×completion − 100 → 0% = −100, 50% = 0, 100% = +100
      const dailyPoints = Math.round(2 * completionPercent - 100);
      // Накопленные очки ранга не могут быть отрицательными — минимум 0.
      const cumulative  = Math.max(0, prevCumulative + dailyPoints);
      const dpRow = db.prepare('SELECT id FROM act_daily_points WHERE date = ? LIMIT 1').get(date);
      if (dpRow) {
        db.prepare('UPDATE act_daily_points SET completion_percent=?,daily_points=?,cumulative_points=? WHERE date=?')
          .run(completionPercent, dailyPoints, cumulative, date);
      } else {
        const dpId = 'dp_' + date.replace(/-/g, '');
        db.prepare(
          'INSERT OR IGNORE INTO act_daily_points (id,date,completion_percent,daily_points,cumulative_points) VALUES (?,?,?,?,?)'
        ).run(dpId, date, completionPercent, dailyPoints, cumulative);
      }
    } catch { /* silent */ }
  }

  function recomputePointsCumulative() {
    try {
      const rows = db.prepare(
        'SELECT date, completion_percent, daily_points, cumulative_points FROM act_daily_points ORDER BY date ASC'
      ).all();
      const updateStmt = db.prepare(
        'UPDATE act_daily_points SET daily_points=?, cumulative_points=? WHERE date=?'
      );
      let running = 0;
      for (const row of rows) {
        const pct = Number(row.completion_percent ?? 0);
        const daily = Math.round(2 * pct - 100);
        running = Math.max(0, running + daily);
        if (Number(row.daily_points) !== daily || Number(row.cumulative_points) !== running) {
          updateStmt.run(daily, running, row.date);
        }
      }
    } catch { /* silent */ }
  }

  return {
    // ─── Settings ────────────────────────────────────────────────────────────
    getAppSettings() {
      try {
        const row = db.prepare('SELECT * FROM app_settings LIMIT 1').get();
        return row || null;
      } catch { return null; }
    },

    // ─── Generic query methods ────────────────────────────────────────────────
    getAll(tableName, filters = null) {
      try {
        // Before any read of these two aggregate tables, ensure today's row is current.
        if ((tableName === 'act_daily_points' || tableName === 'act_task_completions') && !filters) {
          try {
            const today = new Date().toISOString().slice(0, 10);
            const { categoryPercents, completionPercent } = computeDayProgress(today);
            persistDayAggregates(today, categoryPercents, completionPercent);
          } catch { /* silent */ }
          // Полный пересчёт цепочки очков по всем дням в порядке возрастания даты.
          // daily_points = 2×completion − 100; cumulative_points — бегущая сумма,
          // ограниченная снизу нулём (накопленные очки ранга не могут быть < 0).
          recomputePointsCumulative();
        }
        ensureAmbientMusicColumns(tableName);
        if (tableName === 'act_task_progress') ensureTaskProgressTable();
        let query = `SELECT * FROM ${tableName}`;
        if (filters && Object.keys(filters).length > 0) {
          const conditions = Object.keys(filters).map(k => `${k} = ?`).join(' AND ');
          query += ` WHERE ${conditions}`;
          return db.prepare(query).all(...Object.values(filters)) || [];
        }
        return db.prepare(query).all() || [];
      } catch { return []; }
    },

    getById(tableName, id) {
      try {
        ensureAmbientMusicColumns(tableName);
        if (tableName === 'act_task_progress') ensureTaskProgressTable();
        return db.prepare(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`).get(id);
      } catch { return undefined; }
    },

    create(tableName, data) {
      try {
        ensureAmbientMusicColumns(tableName);
        if (tableName === 'act_task_progress') ensureTaskProgressTable();
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(',');
        db.prepare(`INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(data));
        return true;
      } catch { return false; }
    },

    update(tableName, id, data) {
      try {
        ensureAmbientMusicColumns(tableName);
        if (tableName === 'act_task_progress') ensureTaskProgressTable();
        const keys = Object.keys(data);
        const updates = keys.map(k => `${k} = ?`).join(',');
        db.prepare(`UPDATE ${tableName} SET ${updates} WHERE id = ?`).run(...Object.values(data), id);
      } catch { /* silent */ }
    },

    delete(tableName, id) {
      try {
        db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
        return true;
      } catch { return false; }
    },

    // ─── Transactions (act_transactions) ──────────────────────────────────────
    getTransactions(date) {
      try {
        return db.prepare('SELECT * FROM act_transactions WHERE date = ? ORDER BY id DESC').all(date) || [];
      } catch { return []; }
    },

    getAllTransactions(filters = null) {
      try {
        if (filters && Object.keys(filters).length > 0) {
          const conditions = Object.keys(filters).map(k => `${k} = ?`).join(' AND ');
          return db.prepare(`SELECT * FROM act_transactions WHERE ${conditions} ORDER BY id DESC`).all(...Object.values(filters)) || [];
        }
        return db.prepare('SELECT * FROM act_transactions ORDER BY id DESC').all() || [];
      } catch { return []; }
    },

    getTransactionsBetween(startDate, endDate) {
      try {
        return db.prepare('SELECT * FROM act_transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC').all(startDate, endDate) || [];
      } catch { return []; }
    },

    addTransaction(data) {
      try {
        validateTransaction(data);
        db.transaction(() => {
          const keys = Object.keys(data);
          const placeholders = keys.map(() => '?').join(',');
          db.prepare(`INSERT INTO act_transactions (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(data));
          applyTransactionBalance(data, 1);
        })();
        return true;
      } catch { return false; }
    },

    updateTransaction(transactionId, data) {
      try {
        validateTransaction(data);
        db.transaction(() => {
          const previous = db.prepare('SELECT * FROM act_transactions WHERE id = ? LIMIT 1').get(transactionId);
          if (!previous) throw new Error('Transaction not found');
          applyTransactionBalance(previous, -1);
          const keys = Object.keys(data);
          const updates = keys.map(k => `${k} = ?`).join(',');
          db.prepare(`UPDATE act_transactions SET ${updates} WHERE id = ?`).run(...Object.values(data), transactionId);
          applyTransactionBalance(data, 1);
        })();
        return true;
      } catch { return false; }
    },

    deleteTransaction(transactionId) {
      try {
        db.transaction(() => {
          const previous = db.prepare('SELECT * FROM act_transactions WHERE id = ? LIMIT 1').get(transactionId);
          if (!previous) return;
          applyTransactionBalance(previous, -1);
          db.prepare('DELETE FROM act_transactions WHERE id = ?').run(transactionId);
        })();
        return true;
      } catch { return false; }
    },

    // ─── Diary (act_diary_entries) ────────────────────────────────────────────
    getDiaryEntry(date) {
      try {
        return db.prepare('SELECT * FROM act_diary_entries WHERE date = ? LIMIT 1').get(date);
      } catch { return undefined; }
    },

    getDiaryEntriesByMonth(year, month) {
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        return db.prepare('SELECT * FROM act_diary_entries WHERE date >= ? AND date <= ? ORDER BY date DESC').all(startDate, endDate) || [];
      } catch { return []; }
    },

    getDiaryEntriesBetween(startDate, endDate, options = {}) {
      try {
        let query = 'SELECT * FROM act_diary_entries WHERE date >= ? AND date <= ? ORDER BY date DESC';
        if (options.moodOnly) {
          query = 'SELECT * FROM act_diary_entries WHERE date >= ? AND date <= ? AND mood_id IS NOT NULL ORDER BY date DESC';
        }
        return db.prepare(query).all(startDate, endDate) || [];
      } catch { return []; }
    },

    saveDiaryEntry(entry) {
      try {
        const keys = Object.keys(entry);
        const placeholders = keys.map(() => '?').join(',');
        db.prepare(`INSERT OR REPLACE INTO act_diary_entries (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(entry));
      } catch { /* silent */ }
    },

    deleteDiaryEntry(date) {
      try {
        db.prepare('DELETE FROM act_diary_entries WHERE date = ?').run(date);
      } catch { /* silent */ }
    },

    // ─── Nutrition (act_nutrition_entries) ────────────────────────────────────
    getNutritionEntries(date) {
      try {
        return db.prepare('SELECT * FROM act_nutrition_entries WHERE date = ? ORDER BY id DESC').all(date) || [];
      } catch { return []; }
    },

    // ─── Rituals (act_rituals_morning / act_rituals_evening) ──────────────────
    getRitualsMorning(date) {
      try {
        return db.prepare('SELECT * FROM act_rituals_morning WHERE date = ? ORDER BY ritual_id').all(date) || [];
      } catch { return []; }
    },

    getRitualsEvening(date) {
      try {
        return db.prepare('SELECT * FROM act_rituals_evening WHERE date = ? ORDER BY ritual_id').all(date) || [];
      } catch { return []; }
    },

    calculateRitualProgress(ritualType, date) {
      try {
        const table = ritualType === 'morning' ? 'act_rituals_morning' : 'act_rituals_evening';
        const cfgTable = ritualType === 'morning' ? 'cfg_rituals_morning' : 'cfg_rituals_evening';
        // Count only against rituals that exist in the active config; ignore orphans.
        const result = db.prepare(
          `SELECT
             (SELECT COUNT(*) FROM ${cfgTable} WHERE active != 0) as total,
             (SELECT COUNT(*) FROM ${table} a
                INNER JOIN ${cfgTable} c ON c.id = a.ritual_id AND c.active != 0
                WHERE a.date = ? AND a.completed = 1) as completed`
        ).get(date);
        if (!result || result.total === 0) return null;
        return Math.round((result.completed / result.total) * 100);
      } catch { return null; }
    },

    // ─── Timer sessions (act_timer_sessions) ──────────────────────────────────
    getTimerSessions(date) {
      try {
        return db.prepare('SELECT * FROM act_timer_sessions WHERE date = ? ORDER BY id DESC').all(date) || [];
      } catch { return []; }
    },

    addTimerSession(session) {
      try {
        const keys = Object.keys(session);
        const placeholders = keys.map(() => '?').join(',');
        db.prepare(`INSERT INTO act_timer_sessions (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(session));
        if (session.date) this.recomputeDailyAggregates(session.date);
      } catch { /* silent */ }
    },

    updateTimerSession(sessionId, data) {
      try {
        const keys = Object.keys(data);
        const updates = keys.map(k => `${k} = ?`).join(',');
        db.prepare(`UPDATE act_timer_sessions SET ${updates} WHERE id = ?`).run(...Object.values(data), sessionId);
        if (data.date) this.recomputeDailyAggregates(data.date);
      } catch { /* silent */ }
    },

    deleteTimerSession(sessionId) {
      try {
        db.prepare('DELETE FROM act_timer_sessions WHERE id = ?').run(sessionId);
      } catch { /* silent */ }
    },

    // NOTE: API signature is (date, taskId) — date first, matching types/aura.ts
    getTaskTimerTotal(date, taskId) {
      try {
        const result = db.prepare('SELECT SUM(duration) as total FROM act_timer_sessions WHERE task_id = ? AND date = ?').get(taskId, date);
        return result?.total || 0;
      } catch { return 0; }
    },

    // ─── Daily task progress (act_task_progress, keyed by date + task_id) ─────
    /**
     * Reads task progress from act_task_progress using a stable task_id.
     * This replaces the legacy act_tasks category_level columns, which broke
     * when cfg task order changed.
     */
    getTaskProgress(taskId, date) {
      try {
        ensureTaskProgressTable();
        const row = db.prepare('SELECT * FROM act_task_progress WHERE date = ? AND task_id = ? LIMIT 1').get(date, taskId);
        const pct = Number(row?.completion_percent ?? 0);
        const val = row?.current_value ?? row?.value ?? null;
        return {
          value: val,
          completed: Number(row?.completed ?? 0) || (pct >= 100 ? 1 : 0),
          current_value: val,
          selected_list_item: row?.selected_list_item ?? null,
          completion_percent: Number.isFinite(pct) ? pct : 0,
        };
      } catch { return null; }
    },

    /**
     * Writes task progress to act_task_progress keyed by date + task_id.
     */
    saveTaskProgress(taskId, date, data) {
      try {
        ensureTaskProgressTable();
        const task = db.prepare('SELECT * FROM cfg_tasks WHERE id = ? LIMIT 1').get(taskId);
        if (!task) return;

        const previous = db.prepare('SELECT * FROM act_task_progress WHERE date = ? AND task_id = ? LIMIT 1').get(date, taskId);
        const isExplicitReset = data.completed !== undefined && Number(data.completed) < 1 && data.current_value === undefined && data.value === undefined;
        const nextValue = isExplicitReset
          ? null
          : data.current_value !== undefined
          ? data.current_value
          : data.value !== undefined
            ? data.value
            : previous?.current_value ?? previous?.value ?? null;
        let pct = data.completion_percent !== undefined
          ? Number(data.completion_percent)
          : data.completed !== undefined
            ? (Number(data.completed) >= 1 ? 100 : 0)
            : Number(previous?.completion_percent ?? 0);

        if ((data.current_value !== undefined || data.value !== undefined) && data.completion_percent === undefined && data.completed === undefined) {
          const target = Number(task?.cfg_target_value) || Number(task?.cfg_target_number) || 0;
          if (target > 0) pct = Math.min(100, Math.round((Number(nextValue) / target) * 100));
        }

        pct = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
        const completed = pct >= 100 ? 1 : 0;
        const rowId = `tp_${date.replace(/-/g, '')}_${taskId}`;
        const selected = isExplicitReset
          ? null
          : data.selected_list_item !== undefined ? data.selected_list_item : previous?.selected_list_item ?? null;
        db.prepare(`
          INSERT INTO act_task_progress
            (id, date, task_id, value, completed, current_value, selected_list_item, completion_percent, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(date, task_id) DO UPDATE SET
            value = excluded.value,
            completed = excluded.completed,
            current_value = excluded.current_value,
            selected_list_item = excluded.selected_list_item,
            completion_percent = excluded.completion_percent,
            updated_at = datetime('now')
        `).run(rowId, date, taskId, nextValue ?? null, completed, nextValue ?? null, selected, pct);

        // Recompute aggregated category progress and daily points after any task save.
        this.recomputeDailyAggregates(date);
      } catch { /* silent */ }
    },

    // ─── Goal task progress (act_goal_tasks) ──────────────────────────────────
    saveGoalTaskProgress(taskId, date, data) {
      try {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(',');
        const updates = keys.map(k => `${k} = excluded.${k}`).join(', ');
        db.prepare(
          `INSERT INTO act_goal_tasks (task_id, date, ${keys.join(',')}) VALUES (?, ?, ${placeholders})
           ON CONFLICT(task_id, date) DO UPDATE SET ${updates}`
        ).run(taskId, date, ...Object.values(data));
      } catch {
        try {
          db.prepare(
            `INSERT OR REPLACE INTO act_goal_tasks (task_id, date, ${Object.keys(data).join(',')}) VALUES (?, ?, ${Object.keys(data).map(() => '?').join(',')})`
          ).run(taskId, date, ...Object.values(data));
        } catch { /* silent */ }
      }
    },

    getGoalTaskProgress(taskId, date) {
      try {
        return db.prepare('SELECT * FROM act_goal_tasks WHERE task_id = ? AND date = ? LIMIT 1').get(taskId, date);
      } catch { return null; }
    },

    getGoalTasksProgressByDate(date) {
      try {
        return db.prepare('SELECT * FROM act_goal_tasks WHERE date = ?').all(date) || [];
      } catch { return []; }
    },

    // ─── Daily plans (act_daily_plans) ────────────────────────────────────────
    getDailyPlans(date) {
      try {
        if (date) return db.prepare('SELECT * FROM act_daily_plans WHERE date = ? ORDER BY id').all(date) || [];
        return db.prepare('SELECT * FROM act_daily_plans ORDER BY date DESC, id').all() || [];
      } catch { return []; }
    },

    addDailyPlan(data) {
      try {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(',');
        db.prepare(`INSERT INTO act_daily_plans (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(data));
        return true;
      } catch { return false; }
    },

    // ─── Goals / Stages / Tasks (cfg_goals, cfg_goal_stages, cfg_goal_tasks) ───
    getAllGoals() {
      ensureGoalTimelineColumns();
      try {
        return db.prepare('SELECT * FROM cfg_goals ORDER BY level ASC, id ASC').all() || [];
      } catch { return []; }
    },

    getStagesByGoal(goalId) {
      try {
        return db.prepare('SELECT * FROM cfg_goal_stages WHERE goal_id = ? ORDER BY order_index ASC').all(goalId) || [];
      } catch { return []; }
    },

    getTasksByStage(stageId) {
      try {
        return db.prepare('SELECT * FROM cfg_goal_tasks WHERE stage_id = ? ORDER BY order_index ASC').all(stageId) || [];
      } catch { return []; }
    },

    addGoal(data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`INSERT INTO cfg_goals (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(data));
      } catch { /* silent */ }
    },

    updateGoal(goalId, data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`UPDATE cfg_goals SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`).run(...Object.values(data), goalId);
      } catch { /* silent */ }
    },

    deleteGoal(goalId) {
      try { db.prepare('DELETE FROM cfg_goals WHERE id = ?').run(goalId); } catch { /* silent */ }
    },

    setGoalCompletedAt(goalId, completedAt) {
      try { db.prepare('UPDATE cfg_goals SET completed_at = ? WHERE id = ?').run(completedAt, goalId); } catch { /* silent */ }
    },

    moveGoal(goalId, direction) {
      try {
        const goals = db.prepare('SELECT id, level FROM cfg_goals ORDER BY level ASC').all();
        const idx = goals.findIndex(g => String(g.id) === String(goalId));
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= goals.length) return;
        const a = goals[idx], b = goals[swapIdx];
        db.prepare('UPDATE cfg_goals SET level = ? WHERE id = ?').run(b.level, a.id);
        db.prepare('UPDATE cfg_goals SET level = ? WHERE id = ?').run(a.level, b.id);
      } catch { /* silent */ }
    },

    addStage(data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`INSERT INTO cfg_goal_stages (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(data));
      } catch { /* silent */ }
    },

    updateStage(stageId, data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`UPDATE cfg_goal_stages SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`).run(...Object.values(data), stageId);
      } catch { /* silent */ }
    },

    deleteStage(stageId) {
      try { db.prepare('DELETE FROM cfg_goal_stages WHERE id = ?').run(stageId); } catch { /* silent */ }
    },

    setStageCompletedAt(stageId, completedAt) {
      try { db.prepare('UPDATE cfg_goal_stages SET completed_at = ? WHERE id = ?').run(completedAt, stageId); } catch { /* silent */ }
    },

    moveStage(stageId, direction) {
      try {
        const row = db.prepare('SELECT goal_id FROM cfg_goal_stages WHERE id = ?').get(stageId);
        if (!row) return;
        const stages = db.prepare('SELECT id, order_index FROM cfg_goal_stages WHERE goal_id = ? ORDER BY order_index ASC').all(row.goal_id);
        const idx = stages.findIndex(s => String(s.id) === String(stageId));
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= stages.length) return;
        const a = stages[idx], b = stages[swapIdx];
        db.prepare('UPDATE cfg_goal_stages SET order_index = ? WHERE id = ?').run(b.order_index, a.id);
        db.prepare('UPDATE cfg_goal_stages SET order_index = ? WHERE id = ?').run(a.order_index, b.id);
      } catch { /* silent */ }
    },

    addTask(data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`INSERT INTO cfg_goal_tasks (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(data));
      } catch { /* silent */ }
    },

    updateTask(taskId, data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`UPDATE cfg_goal_tasks SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`).run(...Object.values(data), taskId);
      } catch { /* silent */ }
    },

    deleteTask(taskId) {
      try { db.prepare('DELETE FROM cfg_goal_tasks WHERE id = ?').run(taskId); } catch { /* silent */ }
    },

    setTaskCompletedAt(taskId, completedAt) {
      try { db.prepare('UPDATE cfg_goal_tasks SET completed_at = ? WHERE id = ?').run(completedAt, taskId); } catch { /* silent */ }
    },

    moveTask(taskId, direction) {
      try {
        const row = db.prepare('SELECT stage_id FROM cfg_goal_tasks WHERE id = ?').get(taskId);
        if (!row) return;
        const tasks = db.prepare('SELECT id, order_index FROM cfg_goal_tasks WHERE stage_id = ? ORDER BY order_index ASC').all(row.stage_id);
        const idx = tasks.findIndex(t => String(t.id) === String(taskId));
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= tasks.length) return;
        const a = tasks[idx], b = tasks[swapIdx];
        db.prepare('UPDATE cfg_goal_tasks SET order_index = ? WHERE id = ?').run(b.order_index, a.id);
        db.prepare('UPDATE cfg_goal_tasks SET order_index = ? WHERE id = ?').run(a.order_index, b.id);
      } catch { /* silent */ }
    },

    getTaskTimerTotalSince(taskId, startDate) {
      try {
        const result = db.prepare('SELECT SUM(duration) as total FROM act_timer_sessions WHERE task_id = ? AND date >= ?').get(taskId, startDate);
        return result?.total || 0;
      } catch { return 0; }
    },

    getTimerTasks() {
      try {
        return db.prepare("SELECT id, title, icon, color FROM cfg_tasks WHERE task_type = 'timer' ORDER BY level ASC").all() || [];
      } catch { return []; }
    },

    // ─── Save app settings ────────────────────────────────────────────────────
    saveAppSettings(settings) {
      try {
        const keys = Object.keys(settings);
        const placeholders = keys.map(() => '?').join(',');
        const updates = keys.map(k => `${k} = excluded.${k}`).join(', ');
        db.prepare(
          `INSERT INTO app_settings (${keys.join(',')}) VALUES (${placeholders})
           ON CONFLICT(id) DO UPDATE SET ${updates}`
        ).run(...Object.values(settings));
      } catch {
        try {
          // Fallback: UPDATE only (don't insert if no row)
          const { id, ...rest } = settings;
          const keys = Object.keys(rest);
          if (!keys.length) return;
          const updates = keys.map(k => `${k} = ?`).join(', ');
          db.prepare(`UPDATE app_settings SET ${updates} WHERE id = ?`).run(...Object.values(rest), id);
        } catch { /* silent */ }
      }
    },

    // ─── Nutrition CRUD (act_nutrition_entries) ───────────────────────────────
    addNutritionEntry(entry) {
      try {
        const keys = Object.keys(entry);
        db.prepare(`INSERT INTO act_nutrition_entries (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(entry));
      } catch { /* silent */ }
    },

    updateNutritionEntry(entryId, data) {
      try {
        const keys = Object.keys(data);
        db.prepare(`UPDATE act_nutrition_entries SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`).run(...Object.values(data), entryId);
      } catch { /* silent */ }
    },

    deleteNutritionEntry(entryId) {
      try { db.prepare('DELETE FROM act_nutrition_entries WHERE id = ?').run(entryId); } catch { /* silent */ }
    },

    // ─── Ritual status / save (act_rituals_morning/evening) ──────────────────
    getRitualMorningStatus(date, ritualId) {
      try {
        return db.prepare('SELECT * FROM act_rituals_morning WHERE date = ? AND ritual_id = ? LIMIT 1').get(date, ritualId);
      } catch { return null; }
    },

    getRitualEveningStatus(date, ritualId) {
      try {
        return db.prepare('SELECT * FROM act_rituals_evening WHERE date = ? AND ritual_id = ? LIMIT 1').get(date, ritualId);
      } catch { return null; }
    },

    saveRitualMorning(date, ritualId, completed) {
      try {
        db.prepare(
          `INSERT INTO act_rituals_morning (id, date, ritual_id, completed) VALUES (?,?,?,?)
           ON CONFLICT(date, ritual_id) DO UPDATE SET completed = excluded.completed`
        ).run(`${date}_${ritualId}`, date, ritualId, completed ? 1 : 0);
      } catch {
        try {
          db.prepare('INSERT OR REPLACE INTO act_rituals_morning (id, date, ritual_id, completed) VALUES (?,?,?,?)').run(`${date}_${ritualId}`, date, ritualId, completed ? 1 : 0);
        } catch { /* silent */ }
      }
      this.recomputeDailyAggregates(date);
    },

    saveRitualEvening(date, ritualId, completed) {
      try {
        db.prepare(
          `INSERT INTO act_rituals_evening (id, date, ritual_id, completed) VALUES (?,?,?,?)
           ON CONFLICT(date, ritual_id) DO UPDATE SET completed = excluded.completed`
        ).run(`${date}_${ritualId}`, date, ritualId, completed ? 1 : 0);
      } catch {
        try {
          db.prepare('INSERT OR REPLACE INTO act_rituals_evening (id, date, ritual_id, completed) VALUES (?,?,?,?)').run(`${date}_${ritualId}`, date, ritualId, completed ? 1 : 0);
        } catch { /* silent */ }
      }
      this.recomputeDailyAggregates(date);
    },

    // ─── Category progress — computed live from source tables ────────────────
    getCategoryProgress(categoryType, date) {
      try {
        const { categoryPercents } = computeDayProgress(date);
        return categoryPercents[categoryType] ?? null;
      } catch { return null; }
    },

    getCategoryProgresses(date) {
      try {
        const { categoryPercents } = computeDayProgress(date);
        return {
          rituals: categoryPercents.rituals ?? 0,
          time:    categoryPercents.time    ?? 0,
          body:    categoryPercents.body    ?? 0,
          deps:    categoryPercents.deps    ?? 0,
        };
      } catch { return {}; }
    },

    // ─── Tasks by category (cfg_tasks) ───────────────────────────────────────
    getTasksByCategory(categoryType) {
      try {
        return db.prepare('SELECT * FROM cfg_tasks WHERE category_type = ? ORDER BY level ASC, id ASC').all(categoryType) || [];
      } catch { return []; }
    },

    // ─── Daily aggregate recomputation ───────────────────────────────────────
    recomputeDailyAggregates(date) {
      try {
        const { categoryPercents, completionPercent } = computeDayProgress(date);
        persistDayAggregates(date, categoryPercents, completionPercent);
      } catch { /* silent */ }
    },

    // ─── Points (act_daily_points) ────────────────────────────────────────────
    getDailyPointsBetween(startDate, endDate) {
      try {
        recomputePointsCumulative();
        return db.prepare('SELECT * FROM act_daily_points WHERE date >= ? AND date <= ? ORDER BY date ASC').all(startDate, endDate) || [];
      } catch { return []; }
    },

    getLastCumulativePointsBefore(date) {
      try {
        const row = db.prepare('SELECT cumulative_points FROM act_daily_points WHERE date < ? ORDER BY date DESC LIMIT 1').get(date);
        return Number(row?.cumulative_points ?? 0);
      } catch { return 0; }
    },

    // Alias for goal task progress
    getGoalTaskProgress(taskId, date) {
      return this.getTaskProgress(taskId, date);
    },

    // ─── Database management (DatabaseManagementDialog) ───────────────────────
    get dbPath() { return _dbPath; },
    get db() { return db; },

    getInfo() {
      try {
        const tableRows = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).all();
        const tables = tableRows.map(row => {
          let rowCount = 0;
          try {
            const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${row.name.replace(/"/g, '""')}"`).get();
            rowCount = Number(countRow?.count ?? 0);
          } catch { rowCount = 0; }
          return { name: row.name, rowCount };
        });
        return { path: _dbPath, tables };
      } catch (e) {
        return { path: _dbPath, tables: [], error: e.message };
      }
    },

    clearDatabase() {
      try {
        const tableRows = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).all();
        const clearAll = db.transaction(() => {
          for (const row of tableRows) {
            db.prepare(`DELETE FROM "${row.name.replace(/"/g, '""')}"`).run();
          }
        });
        clearAll();
      } catch { /* silent */ }
    },

    close() {
      try { db.close(); } catch { /* silent */ }
    },
  };
}

module.exports = { createDatabaseAdapter };
