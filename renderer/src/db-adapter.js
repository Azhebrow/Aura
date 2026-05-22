/**
 * Adapter for better-sqlite3 to provide AuraDatabase interface
 * This wraps the raw SQLite database with methods expected by the application
 */

function createDatabaseAdapter(db) {
  return {
    // Settings
    getAppSettings() {
      try {
        const row = db.prepare('SELECT * FROM app_settings LIMIT 1').get();
        return row || null;
      } catch {
        return null;
      }
    },

    // Generic query methods
    getAll(tableName, filters = null) {
      try {
        let query = `SELECT * FROM ${tableName}`;
        if (filters && Object.keys(filters).length > 0) {
          const conditions = Object.keys(filters).map(k => `${k} = ?`).join(' AND ');
          query += ` WHERE ${conditions}`;
          const values = Object.values(filters);
          return db.prepare(query).all(...values) || [];
        }
        return db.prepare(query).all() || [];
      } catch {
        return [];
      }
    },

    getById(tableName, id) {
      try {
        return db.prepare(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`).get(id);
      } catch {
        return undefined;
      }
    },

    // Create, Update, Delete
    create(tableName, data) {
      try {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(',');
        const query = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
        db.prepare(query).run(...Object.values(data));
        return true;
      } catch {
        return false;
      }
    },

    update(tableName, id, data) {
      try {
        const keys = Object.keys(data);
        const updates = keys.map(k => `${k} = ?`).join(',');
        const query = `UPDATE ${tableName} SET ${updates} WHERE id = ?`;
        db.prepare(query).run(...Object.values(data), id);
      } catch {
        // silent
      }
    },

    delete(tableName, id) {
      try {
        db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
        return true;
      } catch {
        return false;
      }
    },

    // Transactions
    getTransactions(date) {
      try {
        return db.prepare('SELECT * FROM transactions WHERE date = ? ORDER BY id DESC').all(date) || [];
      } catch {
        return [];
      }
    },

    getAllTransactions(filters = null) {
      try {
        let query = 'SELECT * FROM transactions ORDER BY id DESC';
        if (filters && Object.keys(filters).length > 0) {
          const conditions = Object.keys(filters).map(k => `${k} = ?`).join(' AND ');
          query = `SELECT * FROM transactions WHERE ${conditions} ORDER BY id DESC`;
          const values = Object.values(filters);
          return db.prepare(query).all(...values) || [];
        }
        return db.prepare(query).all() || [];
      } catch {
        return [];
      }
    },

    getTransactionsBetween(startDate, endDate) {
      try {
        return db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC')
          .all(startDate, endDate) || [];
      } catch {
        return [];
      }
    },

    addTransaction(data) {
      try {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(',');
        db.prepare(`INSERT INTO transactions (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(data));
      } catch {
        // silent
      }
    },

    updateTransaction(transactionId, data) {
      try {
        const keys = Object.keys(data);
        const updates = keys.map(k => `${k} = ?`).join(',');
        db.prepare(`UPDATE transactions SET ${updates} WHERE id = ?`).run(...Object.values(data), transactionId);
      } catch {
        // silent
      }
    },

    deleteTransaction(transactionId) {
      try {
        db.prepare('DELETE FROM transactions WHERE id = ?').run(transactionId);
      } catch {
        // silent
      }
    },

    // Diary
    getDiaryEntry(date) {
      try {
        return db.prepare('SELECT * FROM diary_entries WHERE date = ? LIMIT 1').get(date);
      } catch {
        return undefined;
      }
    },

    getDiaryEntriesByMonth(year, month) {
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        return db.prepare('SELECT * FROM diary_entries WHERE date >= ? AND date <= ? ORDER BY date DESC')
          .all(startDate, endDate) || [];
      } catch {
        return [];
      }
    },

    getDiaryEntriesBetween(startDate, endDate, options = {}) {
      try {
        let query = 'SELECT * FROM diary_entries WHERE date >= ? AND date <= ? ORDER BY date DESC';
        if (options.moodOnly) {
          query = 'SELECT * FROM diary_entries WHERE date >= ? AND date <= ? AND mood_id IS NOT NULL ORDER BY date DESC';
        }
        return db.prepare(query).all(startDate, endDate) || [];
      } catch {
        return [];
      }
    },

    saveDiaryEntry(entry) {
      try {
        const keys = Object.keys(entry);
        const placeholders = keys.map(() => '?').join(',');
        db.prepare(`INSERT OR REPLACE INTO diary_entries (${keys.join(',')}) VALUES (${placeholders})`).run(...Object.values(entry));
      } catch {
        // silent
      }
    },

    deleteDiaryEntry(date) {
      try {
        db.prepare('DELETE FROM diary_entries WHERE date = ?').run(date);
      } catch {
        // silent
      }
    },

    // Nutrition
    getNutritionEntries(date) {
      try {
        return db.prepare('SELECT * FROM nutrition_entries WHERE date = ? ORDER BY id DESC').all(date) || [];
      } catch {
        return [];
      }
    },

    // Rituals
    getRitualsMorning(date) {
      try {
        return db.prepare('SELECT * FROM ritual_morning WHERE date = ? ORDER BY ritual_id').all(date) || [];
      } catch {
        return [];
      }
    },

    getRitualsEvening(date) {
      try {
        return db.prepare('SELECT * FROM ritual_evening WHERE date = ? ORDER BY ritual_id').all(date) || [];
      } catch {
        return [];
      }
    },

    calculateRitualProgress(ritualType, date) {
      try {
        const table = ritualType === 'morning' ? 'ritual_morning' : 'ritual_evening';
        const result = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed FROM ${table} WHERE date = ?`).get(date);
        if (!result || result.total === 0) return null;
        return Math.round((result.completed / result.total) * 100);
      } catch {
        return null;
      }
    },

    // Stub methods to prevent errors
    getDailyPlans() { return []; },
    addDailyPlan() {},
    getRitualMorningStatus() { return null; },
    getRitualEveningStatus() { return null; },
    saveRitualMorning() {},
    saveRitualEvening() {},
  };
}

module.exports = { createDatabaseAdapter };
