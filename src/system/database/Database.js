const Database = require('better-sqlite3');
const { getDatabasePath } = require('./DBPath.js');
const path = require('path');
const fs = require('fs');

// Импортируем SettingsChangeTracker для отслеживания изменений
let settingsChangeTracker = null;
function getSettingsChangeTracker() {
  if (!settingsChangeTracker) {
    try {
      // Пробуем получить из window (если уже инициализирован)
      if (typeof window !== 'undefined' && window.settingsChangeTracker) {
        settingsChangeTracker = window.settingsChangeTracker;
      } else {
        // Динамический импорт для избежания циклических зависимостей
        // В Electron renderer процессе используем require
        const trackerPath = path.join(__dirname, '..', 'services', 'SettingsChangeTracker.js');
        const trackerModule = require(trackerPath);
        settingsChangeTracker = trackerModule.default || trackerModule;
      }
    } catch (e) {
      console.warn('[DB] SettingsChangeTracker недоступен:', e.message);
      // Fallback: создаем заглушку
      settingsChangeTracker = { markChanged: () => {}, clearChanges: () => {}, getHasChanges: () => false };
    }
  }
  return settingsChangeTracker;
}

// Пресеты будут загружены динамически в loadPresets()

class DB {
  constructor(dbPath = null) {
    try {
      // Используем централизованную функцию для получения пути
      const finalDbPath = dbPath || getDatabasePath();
      console.log('[DB] Инициализация базы данных:', finalDbPath);
      
      // Инициализируем базу данных
      this.db = new Database(finalDbPath);
      this.db.pragma('journal_mode = WAL');
      
      // Сохраняем путь для отладки
      this.dbPath = finalDbPath;
      
      // Инициализируем базу данных
      this.init();
    } catch (e) {
      console.error('[DB] Ошибка инициализации:', e);
      console.error('[DB] Stack:', e.stack);
      throw e;
    }
  }

  init() {
    try {
      console.log('[DB] Инициализация базы данных...');
      // Создаем таблицы CFG
      this.createCfgTables();
      console.log('[DB] CFG таблицы созданы');
      
      // Создаем ACT таблицы
      this.createActTables();
      console.log('[DB] ACT таблицы созданы');
      
      // Выполняем миграции
      this.migrateTables();
      
      // Сканируем ambient файлы при инициализации
      this.scanAmbientFiles();
      
      // Загружаем пресеты если нужно
      if (this.shouldLoadPresets()) {
        this.loadPresets();
      }
      
      // Автоматически присваиваем группы пресетам без группы
      this.assignGroupsToPresetsWithoutGroup();
      
      console.log('[DB] Инициализация завершена');
    } catch (e) {
      console.error('[DB] Ошибка инициализации:', e);
      throw e;
    }
  }

  migrateTables() {
    try {
      // Миграция: добавление колонок completion_percent в act_tasks
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(act_tasks)`).all();
        const columnNames = tableInfo.map(col => col.name);
        
        const categories = ['rituals', 'time', 'body', 'deps'];
        const levels = [0, 1, 2];
        
        for (const category of categories) {
          for (const level of levels) {
            const columnName = `${category}_${level}_completion_percent`;
            if (!columnNames.includes(columnName)) {
              console.log(`[DB] Добавляем колонку ${columnName} в act_tasks...`);
              this.db.exec(`ALTER TABLE act_tasks ADD COLUMN ${columnName} REAL`);
            }
          }
        }
      } catch (e) {
        console.warn('[DB] Ошибка при добавлении колонок completion_percent:', e);
      }
      
      // Миграция: перенос транзакций из act_daily_activities в act_transactions
      try {
        const oldTableExists = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='act_daily_activities'
        `).get();
        
        if (oldTableExists) {
          const newTableExists = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='act_transactions'
          `).get();
          
          if (newTableExists) {
            // Проверяем, есть ли уже транзакции в новой таблице
            const existingCount = this.db.prepare(`SELECT COUNT(*) as count FROM act_transactions`).get().count;
            
            if (existingCount === 0) {
              // Переносим транзакции только если новая таблица пуста
              const oldData = this.db.prepare(`
                SELECT date, transactions_json 
                FROM act_daily_activities 
                WHERE transactions_json IS NOT NULL AND transactions_json != '' AND transactions_json != '[]'
              `).all();
              
              if (oldData.length > 0) {
                console.log('[DB] Миграция транзакций из act_daily_activities...');
                let migrated = 0;
                
                oldData.forEach(row => {
                  try {
                    const transactions = JSON.parse(row.transactions_json);
                    if (Array.isArray(transactions) && transactions.length > 0) {
                      transactions.forEach(txn => {
                        // Убеждаемся, что у транзакции есть date
                        if (!txn.date) {
                          txn.date = row.date;
                        }
                        // Убеждаемся, что есть id
                        if (!txn.id) {
                          txn.id = `txn_${txn.date.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        }
                        // Сохраняем транзакцию в новую таблицу
                        this.addTransaction(txn);
                        migrated++;
                      });
                    }
                  } catch (e) {
                    console.warn(`[DB] Ошибка миграции транзакций для ${row.date}:`, e.message);
                  }
                });
                
                console.log(`[DB] Мигрировано транзакций: ${migrated}`);
              }
            }
            
            // Удаляем старую таблицу act_daily_activities после миграции
            console.log('[DB] Удаление таблицы act_daily_activities...');
            this.db.exec(`DROP TABLE IF EXISTS act_daily_activities`);
            console.log('[DB] Таблица act_daily_activities удалена');
          }
        }
      } catch (e) {
        console.warn('[DB] Ошибка миграции транзакций:', e.message);
      }

      // Миграция: перенос записей дневника из act_daily_activities в act_diary_entries
      try {
        const oldTableExists = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='act_daily_activities'
        `).get();
        
        if (oldTableExists) {
          const newTableExists = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='act_diary_entries'
          `).get();
          
          if (newTableExists) {
            // Проверяем, есть ли уже записи в новой таблице
            const existingCount = this.db.prepare(`SELECT COUNT(*) as count FROM act_diary_entries`).get().count;
            
            if (existingCount === 0) {
              // Переносим записи только если новая таблица пуста
              const oldData = this.db.prepare(`
                SELECT date, diary_entry_json 
                FROM act_daily_activities 
                WHERE diary_entry_json IS NOT NULL AND diary_entry_json != '' AND diary_entry_json != 'null'
              `).all();
              
              if (oldData.length > 0) {
                console.log('[DB] Миграция записей дневника из act_daily_activities...');
                let migrated = 0;
                
                oldData.forEach(row => {
                  try {
                    const diaryEntry = JSON.parse(row.diary_entry_json);
                    if (diaryEntry && (diaryEntry.text || diaryEntry.mood_id || diaryEntry.category_id)) {
                      const id = `diary_${row.date.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      this.saveDiaryEntry({
                        id: id,
                        date: row.date,
                        mood_id: diaryEntry.mood_id || null,
                        category_id: diaryEntry.category_id || null,
                        text: diaryEntry.text || null
                      });
                      migrated++;
                    }
                  } catch (e) {
                    console.warn(`[DB] Ошибка миграции записи дневника для ${row.date}:`, e.message);
                  }
                });
                
                console.log(`[DB] Мигрировано записей дневника: ${migrated}`);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DB] Ошибка миграции записей дневника:', e.message);
      }

      // Миграция: добавление поля description в cfg_vows
      try {
        const tableInfo = this.db.prepare(`
          PRAGMA table_info(cfg_vows)
        `).all();
        
        const hasDescription = tableInfo.some(col => col.name === 'description');
        
        if (!hasDescription) {
          console.log('[DB] Добавление поля description в cfg_vows...');
          this.db.exec(`ALTER TABLE cfg_vows ADD COLUMN description TEXT`);
          console.log('[DB] Поле description добавлено в cfg_vows');
        }
      } catch (e) {
        console.warn('[DB] Ошибка миграции cfg_vows:', e.message);
      }

      // Удаляем неиспользуемые таблицы
      const tablesToRemove = ['cfg_moods', 'cfg_leisure'];
      tablesToRemove.forEach(tableName => {
        try {
          const tableExists = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name=?
          `).get(tableName);
          if (tableExists) {
            console.log(`[DB] Удаление неиспользуемой таблицы: ${tableName}`);
            this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
            console.log(`[DB] Таблица ${tableName} удалена`);
          }
        } catch (e) {
          console.warn(`[DB] Предупреждение при удалении таблицы ${tableName}:`, e.message);
        }
      });

      // Проверяем наличие таблицы cfg_leisure_tasks
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='cfg_leisure_tasks'
      `).get();
      
      if (!tableExists) {
        // Таблица будет создана в createCfgTables
        return;
      }
      
      // Получаем информацию о колонках таблицы
      const tableInfo = this.db.prepare(`
        PRAGMA table_info(cfg_leisure_tasks)
      `).all();
      
      const columnNames = tableInfo.map(col => col.name);
      
      // Проверяем и добавляем недостающие колонки
      if (!columnNames.includes('leisure_type')) {
        console.log('[DB] Добавление колонки leisure_type в cfg_leisure_tasks...');
        this.db.exec(`
          ALTER TABLE cfg_leisure_tasks 
          ADD COLUMN leisure_type TEXT DEFAULT 'filling'
        `);
        this.db.exec(`
          UPDATE cfg_leisure_tasks 
          SET leisure_type = 'filling' 
          WHERE leisure_type IS NULL
        `);
      }
      
      if (!columnNames.includes('task_type')) {
        console.log('[DB] Добавление колонки task_type в cfg_leisure_tasks...');
        this.db.exec(`
          ALTER TABLE cfg_leisure_tasks 
          ADD COLUMN task_type TEXT
        `);
      }
      
      if (!columnNames.includes('cfg_target_value')) {
        console.log('[DB] Добавление колонки cfg_target_value в cfg_leisure_tasks...');
        this.db.exec(`
          ALTER TABLE cfg_leisure_tasks 
          ADD COLUMN cfg_target_value REAL
        `);
      }
      
      if (!columnNames.includes('cfg_unit')) {
        console.log('[DB] Добавление колонки cfg_unit в cfg_leisure_tasks...');
        this.db.exec(`
          ALTER TABLE cfg_leisure_tasks 
          ADD COLUMN cfg_unit TEXT
        `);
      }
      
      if (!columnNames.includes('cfg_target_hours')) {
        console.log('[DB] Добавление колонки cfg_target_hours в cfg_leisure_tasks...');
        this.db.exec(`
          ALTER TABLE cfg_leisure_tasks 
          ADD COLUMN cfg_target_hours REAL
        `);
      }
      
      if (!columnNames.includes('is_optional')) {
        console.log('[DB] Добавление колонки is_optional в cfg_leisure_tasks...');
        this.db.exec(`
          ALTER TABLE cfg_leisure_tasks 
          ADD COLUMN is_optional INTEGER DEFAULT 0
        `);
      }

      // Миграция: добавление usage_count в категории доходов и расходов
      try {
        const incomeTableInfo = this.db.prepare(`PRAGMA table_info(cfg_income_categories)`).all();
        const incomeColumnNames = incomeTableInfo.map(col => col.name);
        if (!incomeColumnNames.includes('usage_count')) {
          console.log('[DB] Добавление колонки usage_count в cfg_income_categories...');
          this.db.exec(`
            ALTER TABLE cfg_income_categories 
            ADD COLUMN usage_count INTEGER DEFAULT 0
          `);
        }

        const expenseTableInfo = this.db.prepare(`PRAGMA table_info(cfg_expense_categories)`).all();
        const expenseColumnNames = expenseTableInfo.map(col => col.name);
        if (!expenseColumnNames.includes('usage_count')) {
          console.log('[DB] Добавление колонки usage_count в cfg_expense_categories...');
          this.db.exec(`
            ALTER TABLE cfg_expense_categories 
            ADD COLUMN usage_count INTEGER DEFAULT 0
          `);
        }
        if (!expenseColumnNames.includes('type')) {
          console.log('[DB] Добавление колонки type в cfg_expense_categories...');
          this.db.exec(`
            ALTER TABLE cfg_expense_categories 
            ADD COLUMN type TEXT
          `);
        }
        if (!expenseColumnNames.includes('description')) {
          console.log('[DB] Добавление колонки description в cfg_expense_categories...');
          this.db.exec(`
            ALTER TABLE cfg_expense_categories 
            ADD COLUMN description TEXT
          `);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении колонок в cfg_expense_categories:', e.message);
      }
      
      // Миграция: добавление колонки config в cfg_tasks
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(cfg_tasks)`).all();
        const hasConfig = tableInfo.some(col => col.name === 'config');
        
        if (!hasConfig) {
          console.log('[DB] Добавление колонки config в cfg_tasks...');
          this.db.exec(`
            ALTER TABLE cfg_tasks 
            ADD COLUMN config TEXT
          `);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении config:', e.message);
      }
      
      // Миграция: добавление колонок type и target в cfg_accounts
      try {
        const accountsTableInfo = this.db.prepare(`PRAGMA table_info(cfg_accounts)`).all();
        const accountsColumnNames = accountsTableInfo.map(col => col.name);
        
        if (!accountsColumnNames.includes('type')) {
          console.log('[DB] Добавление колонки type в cfg_accounts...');
          this.db.exec(`
            ALTER TABLE cfg_accounts 
            ADD COLUMN type TEXT DEFAULT 'regular'
          `);
        }
        
        if (!accountsColumnNames.includes('target')) {
          console.log('[DB] Добавление колонки target в cfg_accounts...');
          this.db.exec(`
            ALTER TABLE cfg_accounts 
            ADD COLUMN target REAL
          `);
        }

        if (!accountsColumnNames.includes('home_visible')) {
          console.log('[DB] Добавление колонки home_visible в cfg_accounts...');
          this.db.exec(`
            ALTER TABLE cfg_accounts 
            ADD COLUMN home_visible INTEGER DEFAULT 1
          `);
          this.db.exec(`
            UPDATE cfg_accounts
            SET home_visible = 1
            WHERE home_visible IS NULL
          `);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении type и target в cfg_accounts:', e.message);
      }

      // Миграция: добавление колонки completed_at в cfg_goals
      try {
        const goalsTableInfo = this.db.prepare(`PRAGMA table_info(cfg_goals)`).all();
        const goalsColumnNames = goalsTableInfo.map(col => col.name);
        
        if (!goalsColumnNames.includes('completed_at')) {
          console.log('[DB] Добавление колонки completed_at в cfg_goals...');
          this.db.exec(`
            ALTER TABLE cfg_goals 
            ADD COLUMN completed_at DATETIME
          `);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении completed_at в cfg_goals:', e.message);
      }

      // Миграция: описание задач целей (cfg_goal_tasks)
      try {
        const goalTasksInfo = this.db.prepare(`PRAGMA table_info(cfg_goal_tasks)`).all();
        const goalTasksColumns = goalTasksInfo.map(col => col.name);
        if (!goalTasksColumns.includes('description')) {
          console.log('[DB] Добавление колонки description в cfg_goal_tasks...');
          this.db.exec(`ALTER TABLE cfg_goal_tasks ADD COLUMN description TEXT`);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении description в cfg_goal_tasks:', e.message);
      }

      // Миграция: completed_at для этапов и задач целей
      try {
        const stagesInfo = this.db.prepare(`PRAGMA table_info(cfg_goal_stages)`).all();
        const stagesCols = stagesInfo.map((c) => c.name);
        if (!stagesCols.includes('completed_at')) {
          console.log('[DB] Добавление колонки completed_at в cfg_goal_stages...');
          this.db.exec(`ALTER TABLE cfg_goal_stages ADD COLUMN completed_at DATETIME`);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении completed_at в cfg_goal_stages:', e.message);
      }
      try {
        const tasksInfo2 = this.db.prepare(`PRAGMA table_info(cfg_goal_tasks)`).all();
        const tasksCols2 = tasksInfo2.map((c) => c.name);
        if (!tasksCols2.includes('completed_at')) {
          console.log('[DB] Добавление колонки completed_at в cfg_goal_tasks...');
          this.db.exec(`ALTER TABLE cfg_goal_tasks ADD COLUMN completed_at DATETIME`);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении completed_at в cfg_goal_tasks:', e.message);
      }
      // Миграция: нормализация старых/невалидных имен иконок в целях
      try {
        const goalIconFixes = [
          ['code-2', 'target'],
          ['music-2', 'music'],
          ['hand', 'activity'],
          ['book-a', 'book-open'],
          ['mic-2', 'mic'],
          ['message-square', 'message-circle'],
          ['monitor-play', 'book-open'],
          ['swords', 'target'],
          ['settings', 'cog'],
          ['github', 'laptop'],
          ['university', 'graduation-cap'],
          ['book-open-check', 'book-open'],
          ['bot', 'cpu'],
          ['school', 'graduation-cap'],
          ['flask-conical', 'book-open'],
          ['database', 'file-text'],
          ['chart-column', 'chart-line'],
          ['user-circle', 'users'],
          ['badge-check', 'check'],
          ['tuner', 'music'],
          ['play-circle', 'play'],
          ['music-3', 'music'],
          ['list-music', 'music'],
          ['clock-3', 'clock'],
          ['grip', 'activity'],
          ['tablet-smartphone', 'laptop'],
          ['file-music', 'file-text'],
          ['disc-3', 'music'],
          ['ear', 'headphones'],
          ['video', 'clapperboard'],
          ['guitar', 'music'],
          ['upload', 'arrow-up'],
          ['bird', 'languages'],
          ['radio', 'headphones'],
          ['notebook-tabs', 'notebook'],
          ['tv', 'clapperboard'],
          ['smartphone', 'laptop'],
          ['briefcase-business', 'briefcase'],
          ['podcast', 'headphones'],
          ['messages-square', 'message-circle'],
          ['library', 'book'],
          ['file-pen-line', 'pen-line'],
        ];
        const updateGoalIcon = this.db.prepare(`UPDATE cfg_goals SET icon = ? WHERE icon = ?`);
        const updateStageIcon = this.db.prepare(`UPDATE cfg_goal_stages SET icon = ? WHERE icon = ?`);
        const updateTaskIcon = this.db.prepare(`UPDATE cfg_goal_tasks SET icon = ? WHERE icon = ?`);
        for (const [fromIcon, toIcon] of goalIconFixes) {
          updateGoalIcon.run(toIcon, fromIcon);
          updateStageIcon.run(toIcon, fromIcon);
          updateTaskIcon.run(toIcon, fromIcon);
        }
      } catch (e) {
        console.warn('[DB] Предупреждение при нормализации иконок целей:', e.message);
      }
      try {
        const moodsInfo = this.db.prepare(`PRAGMA table_info(cfg_diary_moods)`).all();
        const moodsCols = moodsInfo.map((c) => c.name);
        if (!moodsCols.includes('title')) {
          console.log('[DB] Добавление колонки title в cfg_diary_moods...');
          this.db.exec(`ALTER TABLE cfg_diary_moods ADD COLUMN title TEXT`);
        }
        if (!moodsCols.includes('color')) {
          console.log('[DB] Добавление колонки color в cfg_diary_moods...');
          this.db.exec(`ALTER TABLE cfg_diary_moods ADD COLUMN color TEXT`);
        }
        this.db.exec(`
          UPDATE cfg_diary_moods
          SET title = CASE level
            WHEN 1 THEN 'Тяжело'
            WHEN 2 THEN 'Ниже нормы'
            WHEN 3 THEN 'Ровно'
            WHEN 4 THEN 'Хорошо'
            WHEN 5 THEN 'Отлично'
            ELSE COALESCE(title, 'Уровень ' || level)
          END
          WHERE title IS NULL OR TRIM(title) = ''
        `);
        this.db.exec(`
          UPDATE cfg_diary_moods
          SET color = CASE level
            WHEN 1 THEN '#ef4444'
            WHEN 2 THEN '#f97316'
            WHEN 3 THEN '#f59e0b'
            WHEN 4 THEN '#22c55e'
            WHEN 5 THEN '#3b82f6'
            ELSE color
          END
          WHERE color IS NULL OR TRIM(color) = ''
        `);
      } catch (e) {
        console.warn('[DB] Предупреждение при добавлении title/color в cfg_diary_moods:', e.message);
      }

      // Миграция колонок app_settings
      this.migrateAppSettingsColumns();
      
      // Миграция: добавление колонки group в cfg_nutrition_products
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(cfg_nutrition_products)`).all();
        const columnNames = tableInfo.map(col => col.name);
        
        if (!columnNames.includes('group')) {
          console.log('[DB] Добавляем колонку group в cfg_nutrition_products...');
          this.db.exec(`ALTER TABLE cfg_nutrition_products ADD COLUMN \`group\` TEXT`);
        }
      } catch (e) {
        console.warn('[DB] Ошибка при добавлении колонки group в cfg_nutrition_products:', e);
      }
      
      // Миграция: добавление колонки group в cfg_nutrition_presets
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(cfg_nutrition_presets)`).all();
        const columnNames = tableInfo.map(col => col.name);
        
        if (!columnNames.includes('group')) {
          console.log('[DB] Добавляем колонку group в cfg_nutrition_presets...');
          this.db.exec(`ALTER TABLE cfg_nutrition_presets ADD COLUMN \`group\` TEXT`);
        }
      } catch (e) {
        console.warn('[DB] Ошибка при добавлении колонки group в cfg_nutrition_presets:', e);
      }

      // Миграция: старые группы продуктов → новые (Белки, Жиры, Углеводы, Блюда)
      try {
        const updateGroup = (table) => {
          this.db.prepare(`
            UPDATE ${table}
            SET \`group\` = CASE \`group\`
              WHEN 'poultry' THEN 'proteins'
              WHEN 'seafood' THEN 'proteins'
              WHEN 'legumes' THEN 'proteins'
              WHEN 'dairy' THEN 'proteins'
              WHEN 'grains_whole' THEN 'carbs'
              WHEN 'grains_refined' THEN 'carbs'
              WHEN 'roots' THEN 'carbs'
              WHEN 'leafy' THEN 'carbs'
              WHEN 'fruits' THEN 'carbs'
              WHEN 'extras' THEN 'dishes'
              ELSE \`group\`
            END
            WHERE \`group\` IN ('poultry','seafood','legumes','dairy','grains_whole','grains_refined','roots','leafy','fruits','extras')
          `).run();
        };
        const tables = ['cfg_nutrition_products', 'cfg_nutrition_presets'];
        tables.forEach(t => {
          try {
            this.db.prepare(`SELECT 1 FROM ${t} LIMIT 1`).get();
            updateGroup(t);
          } catch (err) {
            if (!err.message || !err.message.includes('no such table')) console.warn(`[DB] Миграция групп питания ${t}:`, err.message);
          }
        });
      } catch (e) {
        console.warn('[DB] Ошибка миграции групп продуктов:', e.message);
      }
    } catch (e) {
      // Если таблицы нет, это нормально - она будет создана в createCfgTables
      if (e.message && e.message.includes('no such table')) {
        return;
      }
      console.error('[DB] Ошибка миграции таблиц:', e);
    }
  }

  createCfgTables() {
    try {
      // cfg_tasks
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          task_type TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          cfg_target_value REAL,
          cfg_unit TEXT,
          cfg_target_hours REAL,
          ritual_type TEXT,
          is_optional INTEGER DEFAULT 0,
          category_type TEXT NOT NULL,
          level INTEGER DEFAULT 0,
          config TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_accounts
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_accounts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          balance REAL DEFAULT 0,
          type TEXT DEFAULT 'regular',
          target REAL,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_income_categories
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_income_categories (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          level INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_expense_categories
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_expense_categories (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          type TEXT,
          description TEXT,
          level INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_vows
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_vows (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          color TEXT,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_diary_categories
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_diary_categories (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_diary_moods (настроения дневника)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_diary_moods (
          id TEXT PRIMARY KEY,
          level INTEGER NOT NULL,
          title TEXT,
          color TEXT,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_leisure_tasks (задачи досуга)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_leisure_tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          task_type TEXT,
          icon TEXT,
          color TEXT,
          leisure_type TEXT NOT NULL,
          cfg_target_value REAL,
          cfg_unit TEXT,
          cfg_target_hours REAL,
          is_optional INTEGER DEFAULT 0,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_rituals_morning
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_rituals_morning (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          active INTEGER DEFAULT 1,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_rituals_evening
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_rituals_evening (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          active INTEGER DEFAULT 1,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_goals (цели)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_goals (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          color TEXT,
          level INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_goal_stages (этапы целей)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_goal_stages (
          id TEXT PRIMARY KEY,
          goal_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          order_index INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_goal_tasks (задачи этапов)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_goal_tasks (
          id TEXT PRIMARY KEY,
          stage_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          task_type TEXT NOT NULL,
          target_value REAL,
          unit TEXT,
          order_index INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_ambient_music (ambient музыка)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_ambient_music (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#3b82f6',
          icon TEXT,
          file_name TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      
      // Добавляем колонку updated_at если её нет (для существующих таблиц)
      try {
        const ambientTableInfo = this.db.prepare(`PRAGMA table_info(cfg_ambient_music)`).all();
        const hasUpdatedAt = ambientTableInfo.some(col => col.name === 'updated_at');
        if (!hasUpdatedAt) {
          this.db.exec(`ALTER TABLE cfg_ambient_music ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`);
          console.log('[DB] Добавлена колонка updated_at в cfg_ambient_music');
        }
      } catch (e) {
        console.warn('[DB] Ошибка проверки/добавления колонки updated_at в cfg_ambient_music:', e);
      }

      // cfg_nutrition_products (продукты питания)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_nutrition_products (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          \`group\` TEXT,
          portion_weight REAL NOT NULL,
          calories_per_100g REAL NOT NULL,
          proteins_per_100g REAL NOT NULL,
          fats_per_100g REAL NOT NULL,
          carbs_per_100g REAL NOT NULL,
          level INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // cfg_nutrition_presets (пресеты продуктов)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cfg_nutrition_presets (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          \`group\` TEXT,
          products TEXT NOT NULL,
          level INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // app_settings (настройки приложения)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id TEXT PRIMARY KEY,
          currency TEXT DEFAULT 'RUB',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // backup_history (история автоматических бэкапов)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS backup_history (
          id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          created_at DATETIME NOT NULL
        )
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_backup_history_created_at 
        ON backup_history(created_at DESC)
      `);
    } catch (e) {
      console.error('[DB] Ошибка создания CFG таблиц:', e);
      throw e;
    }
  }

  createActTables() {
    try {
      // Проверяем и пересоздаем act_tasks, если структура устарела
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(act_tasks)`).all();
        const hasOldStructure = tableInfo.some(col => col.name === 'task_id');
        if (hasOldStructure) {
          console.log('[DB] Обнаружена старая структура act_tasks, пересоздаем таблицу...');
          this.db.exec(`DROP TABLE IF EXISTS act_tasks`);
          console.log('[DB] Старая таблица act_tasks удалена');
        }
      } catch (e) {
        // Таблица не существует, это нормально
      }
      // act_transactions (отдельная таблица для транзакций)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_transactions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          account_id TEXT,
          from_id TEXT,
          to_id TEXT,
          category_id TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Индексы для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON act_transactions(date)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON act_transactions(type)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_transactions_account ON act_transactions(account_id)
      `);

      // act_diary_entries (отдельная таблица для записей дневника)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_diary_entries (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL UNIQUE,
          mood_id TEXT,
          category_id TEXT,
          text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Индексы для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON act_diary_entries(date)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_diary_entries_category ON act_diary_entries(category_id)
      `);

      // act_daily_plans (планы на день)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_daily_plans (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Индексы для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON act_daily_plans(date)
      `);

      // act_goal_tasks (прогресс выполнения задач целей)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_goal_tasks (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          date TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          current_value REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(task_id, date)
        )
      `);

      // Индексы для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_goal_tasks_task_date ON act_goal_tasks(task_id, date)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_goal_tasks_date ON act_goal_tasks(date)
      `);

      // act_tasks (прогресс выполнения задач категорий) - новая структура: одна запись на день
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_tasks (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL UNIQUE,
          rituals_0_value REAL,
          rituals_1_value REAL,
          rituals_2_value REAL,
          rituals_0_completion_percent REAL,
          rituals_1_completion_percent REAL,
          rituals_2_completion_percent REAL,
          time_0_value REAL,
          time_1_value REAL,
          time_2_value REAL,
          time_0_completion_percent REAL,
          time_1_completion_percent REAL,
          time_2_completion_percent REAL,
          body_0_value REAL,
          body_1_value REAL,
          body_2_value REAL,
          body_0_completion_percent REAL,
          body_1_completion_percent REAL,
          body_2_completion_percent REAL,
          deps_0_value REAL,
          deps_1_value REAL,
          deps_2_value REAL,
          deps_0_completion_percent REAL,
          deps_1_completion_percent REAL,
          deps_2_completion_percent REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Индекс для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON act_tasks(date)
      `);

      // act_task_completions (процент выполнения категорий)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_task_completions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL UNIQUE,
          rituals_percent REAL DEFAULT 0,
          time_percent REAL DEFAULT 0,
          body_percent REAL DEFAULT 0,
          deps_percent REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Индекс для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_task_completions_date ON act_task_completions(date)
      `);

      // act_rituals_morning (выполненные утренние ритуалы)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_rituals_morning (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          ritual_id TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, ritual_id)
        )
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_rituals_morning_date ON act_rituals_morning(date)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_rituals_morning_ritual ON act_rituals_morning(ritual_id)
      `);

      // act_rituals_evening (выполненные вечерние ритуалы)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_rituals_evening (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          ritual_id TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, ritual_id)
        )
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_rituals_evening_date ON act_rituals_evening(date)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_rituals_evening_ritual ON act_rituals_evening(ritual_id)
      `);

      // act_timer_sessions (сессии таймера)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_timer_sessions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          task_id TEXT NOT NULL,
          duration INTEGER NOT NULL,
          timer_type TEXT NOT NULL,
          target_duration INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_timer_sessions_date ON act_timer_sessions(date)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_timer_sessions_task ON act_timer_sessions(task_id)
      `);

      // act_daily_points (очки по дням)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_daily_points (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL UNIQUE,
          completion_percent REAL DEFAULT 0,
          daily_points REAL DEFAULT 0,
          cumulative_points REAL DEFAULT 0,
          is_fixed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Индекс для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_points_date ON act_daily_points(date)
      `);

      // act_nutrition_entries (записи о съеденных продуктах)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS act_nutrition_entries (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          product_id TEXT,
          preset_id TEXT,
          portions REAL NOT NULL,
          total_calories REAL NOT NULL,
          total_proteins REAL NOT NULL,
          total_fats REAL NOT NULL,
          total_carbs REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Индекс для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_nutrition_entries_date ON act_nutrition_entries(date)
      `);
    } catch (e) {
      console.error('[DB] Ошибка создания ACT таблиц:', e);
      throw e;
    }
  }

  scanAmbientFiles() {
    try {
      const AmbientManager = require('../../utils/AmbientManager.js');
      const files = AmbientManager.scanAmbientFiles();
      // Сохраняем список файлов в памяти
      this.availableAmbientFiles = files;
      console.log(`[DB] Сканирование ambient файлов завершено. Найдено: ${files.length}`);
      return files;
    } catch (e) {
      console.warn('[DB] Ошибка сканирования ambient файлов:', e);
      this.availableAmbientFiles = [];
      return [];
    }
  }

  shouldLoadPresets() {
    try {
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM cfg_accounts
      `).get();
      return result.count === 0;
    } catch (e) {
      console.error('[DB] Ошибка проверки пресетов:', e);
      return true; // Если ошибка, загружаем пресеты
    }
  }

  loadPresets() {
    try {
      console.log('[DB] Загрузка пресетов...');
      
      // Простая загрузка через require
      const presetsModule = require('./presets.js');
      const presets = presetsModule.PRESETS || (presetsModule.default && presetsModule.default.PRESETS) || presetsModule || {};
      
      if (!presets || Object.keys(presets).length === 0) {
        throw new Error('Пресеты пусты');
      }
      
      console.log('[DB] Пресеты загружены, категорий:', Object.keys(presets).length);
      
      // Загружаем все категории пресетов
      if (presets.ritualsMorning && presets.ritualsMorning.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_rituals_morning 
          (id, title, description, icon, active, level)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.ritualsMorning.forEach((item, index) => {
          try {
            if (!item.id) {
              console.error(`[DB] Ритуал ${index} не имеет ID:`, item);
              return;
            }
            stmt.run(item.id, item.title || '', item.description || null, item.icon || null, item.active !== undefined ? item.active : 1, item.level || 0);
            inserted++;
          } catch (e) {
            console.error(`[DB] Ошибка вставки ритуала ${item.id || index}:`, e.message);
            console.error(`[DB] Данные ритуала:`, JSON.stringify(item));
          }
        });
        console.log(`[DB] Загружено утренних ритуалов: ${inserted} из ${presets.ritualsMorning.length}`);
      } else {
        console.warn('[DB] Нет данных для утренних ритуалов');
      }

      // Вечерние ритуалы
      if (presets.ritualsEvening && presets.ritualsEvening.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_rituals_evening 
          (id, title, description, icon, active, level)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.ritualsEvening.forEach(item => {
          try {
            stmt.run(item.id, item.title, item.description || null, item.icon || null, item.active !== undefined ? item.active : 1, item.level || 0);
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки ритуала ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено вечерних ритуалов: ${inserted} из ${presets.ritualsEvening.length}`);
      } else {
        console.warn('[DB] Нет данных для вечерних ритуалов');
      }

      // Обеты
      if (presets.vows && presets.vows.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_vows 
          (id, title, description, icon, color, level)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.vows.forEach(item => {
          try {
            stmt.run(item.id, item.title || '', item.description || null, item.icon || null, item.color || null, item.level || 0);
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки обета ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено обетов: ${inserted} из ${presets.vows.length}`);
      } else {
        console.warn('[DB] Нет данных для обетов');
      }

      // Цели
      if (presets.goals && presets.goals.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_goals 
          (id, title, description, icon, color, level)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.goals.forEach(item => {
          try {
            stmt.run(item.id, item.title || '', item.description || null, item.icon || null, item.color || null, item.level || 0);
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки цели ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено целей: ${inserted} из ${presets.goals.length}`);
      } else {
        console.warn('[DB] Нет данных для целей');
      }

      // Этапы целей
      if (presets.goalStages && presets.goalStages.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_goal_stages 
          (id, goal_id, title, description, icon, order_index, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.goalStages.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.goal_id || '',
              item.title || '',
              item.description || null,
              item.icon || null,
              item.order_index || 0,
              item.completed_at ?? null
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки этапа ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено этапов: ${inserted} из ${presets.goalStages.length}`);
      } else {
        console.warn('[DB] Нет данных для этапов целей');
      }

      // Задачи этапов
      if (presets.goalTasks && presets.goalTasks.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_goal_tasks 
          (id, stage_id, title, description, icon, task_type, target_value, unit, order_index, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.goalTasks.forEach(item => {
          try {
            const taskType = item.task_type || 'checkbox';
            const targetValue = taskType === 'number' ? (item.target_value ?? 1) : (item.target_value ?? null);
            const unit = taskType === 'number' ? (item.unit || 'шт') : (item.unit || null);
            stmt.run(
              item.id, 
              item.stage_id || '', 
              item.title || '', 
              item.description || `Критерий выполнения: ${item.title || 'задача'}.`,
              item.icon || null, 
              taskType,
              targetValue,
              unit,
              item.order_index || 0,
              item.completed_at ?? null
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки задачи ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено задач: ${inserted} из ${presets.goalTasks.length}`);
      } else {
        console.warn('[DB] Нет данных для задач этапов');
      }

      // Категории дневника
      if (presets.diaryCategories && presets.diaryCategories.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_diary_categories 
          (id, title, icon, color, level)
          VALUES (?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.diaryCategories.forEach(item => {
          try {
            stmt.run(item.id, item.title || '', item.icon || null, item.color || null, item.level || 0);
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки категории дневника ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено категорий дневника: ${inserted} из ${presets.diaryCategories.length}`);
      } else {
        console.warn('[DB] Нет данных для категорий дневника');
      }

      // Настроения дневника
      if (presets.diaryMoods && presets.diaryMoods.length > 0) {
        console.log(`[DB] Загрузка настроений: найдено ${presets.diaryMoods.length} элементов`);
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_diary_moods 
          (id, level, title, color, icon)
          VALUES (?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.diaryMoods.forEach((item, index) => {
          try {
            if (!item.id) {
              console.error(`[DB] Настроение ${index} не имеет ID:`, item);
              return;
            }
            stmt.run(item.id, item.level || 0, item.title || null, item.color || null, item.icon || null);
            inserted++;
          } catch (e) {
            console.error(`[DB] Ошибка вставки настроения ${item.id || index}:`, e.message);
            console.error(`[DB] Данные настроения:`, JSON.stringify(item));
          }
        });
        console.log(`[DB] Загружено настроений: ${inserted} из ${presets.diaryMoods.length}`);
      } else {
        console.warn('[DB] Нет данных для настроений. presets.diaryMoods:', presets.diaryMoods);
      }

      // Счета
      if (presets.accounts && presets.accounts.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_accounts 
          (id, title, icon, color, balance, type, target, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.accounts.forEach(item => {
          try {
            stmt.run(
              item.id, 
              item.title || '', 
              item.icon || null, 
              item.color || null, 
              item.balance || 0,
              item.type || 'regular',
              item.target || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки счета ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено счетов: ${inserted} из ${presets.accounts.length}`);
      } else {
        console.warn('[DB] Нет данных для счетов');
      }

      // Категории доходов
      if (presets.incomeCategories && presets.incomeCategories.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_income_categories 
          (id, title, icon, color, level)
          VALUES (?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.incomeCategories.forEach(item => {
          try {
            stmt.run(item.id, item.title || '', item.icon || null, item.color || null, item.level || 0);
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки категории дохода ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено категорий доходов: ${inserted} из ${presets.incomeCategories.length}`);
      } else {
        console.warn('[DB] Нет данных для категорий доходов');
      }

      // Категории расходов
      if (presets.expenseCategories && presets.expenseCategories.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_expense_categories 
          (id, title, icon, color, level)
          VALUES (?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.expenseCategories.forEach(item => {
          try {
            stmt.run(item.id, item.title || '', item.icon || null, item.color || null, item.level || 0);
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки категории расхода ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено категорий расходов: ${inserted} из ${presets.expenseCategories.length}`);
      } else {
        console.warn('[DB] Нет данных для категорий расходов');
      }

      // Продукты питания
      if (presets.nutritionProducts && presets.nutritionProducts.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_nutrition_products 
          (id, title, icon, color, \`group\`, portion_weight, calories_per_100g, proteins_per_100g, fats_per_100g, carbs_per_100g, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.nutritionProducts.forEach(item => {
          try {
            // Если group не указан, используем цвет для определения группы (для обратной совместимости)
            let groupValue = item.group || null;
            if (!groupValue && item.color) {
              // Автоматическое сопоставление по цвету (для миграции существующих данных)
              groupValue = this.inferGroupFromColor(item.color, item.title);
            }
            
            stmt.run(
              item.id,
              item.title || '',
              item.icon || null,
              item.color || null,
              groupValue,
              item.portion_weight || 100,
              item.calories_per_100g || 0,
              item.proteins_per_100g || 0,
              item.fats_per_100g || 0,
              item.carbs_per_100g || 0,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки продукта питания ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено продуктов питания: ${inserted} из ${presets.nutritionProducts.length}`);
      } else {
        console.warn('[DB] Нет данных для продуктов питания');
      }

      // Ambient музыка
      if (presets.ambientMusic && presets.ambientMusic.length > 0) {
        console.log(`[DB] Загрузка ambient музыки: найдено ${presets.ambientMusic.length} элементов`);
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_ambient_music 
          (id, name, color, icon, file_name)
          VALUES (?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.ambientMusic.forEach((item, index) => {
          try {
            if (!item.id) {
              console.error(`[DB] Ambient музыка ${index} не имеет ID:`, item);
              return;
            }
            stmt.run(
              item.id,
              item.name || '',
              item.color || '#3b82f6',
              item.icon || null,
              item.file_name || ''
            );
            inserted++;
          } catch (e) {
            console.error(`[DB] Ошибка вставки ambient музыки ${item.id || index}:`, e.message);
            console.error(`[DB] Данные ambient музыки:`, JSON.stringify(item));
          }
        });
        console.log(`[DB] Загружено ambient музыки: ${inserted} из ${presets.ambientMusic.length}`);
      } else {
        console.warn('[DB] Нет данных для ambient музыки. presets.ambientMusic:', presets.ambientMusic);
      }

      // Задачи ритуалов
      if (presets.tasksRituals && presets.tasksRituals.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_tasks 
          (id, title, task_type, icon, category_type, ritual_type, config, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.tasksRituals.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.title || '',
              item.task_type || 'checkbox',
              item.icon || null,
              item.category_type || 'rituals',
              item.ritual_type || null,
              item.config || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки задачи ритуала ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено задач ритуалов: ${inserted} из ${presets.tasksRituals.length}`);
      } else {
        console.warn('[DB] Нет данных для задач ритуалов');
      }

      // Задачи времени
      if (presets.tasksTime && presets.tasksTime.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_tasks 
          (id, title, task_type, icon, category_type, cfg_target_hours, config, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.tasksTime.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.title || '',
              item.task_type || 'timer',
              item.icon || null,
              item.category_type || 'time',
              item.cfg_target_hours || null,
              item.config || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки задачи времени ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено задач времени: ${inserted} из ${presets.tasksTime.length}`);
      } else {
        console.warn('[DB] Нет данных для задач времени');
      }

      // Задачи тела
      if (presets.tasksBody && presets.tasksBody.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_tasks 
          (id, title, task_type, icon, category_type, cfg_target_value, cfg_unit, cfg_target_hours, ritual_type, config, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.tasksBody.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.title || '',
              item.task_type || 'number',
              item.icon || null,
              item.category_type || 'body',
              item.cfg_target_value || null,
              item.cfg_unit || null,
              item.cfg_target_hours || null,
              item.ritual_type || null,
              item.config || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки задачи тела ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено задач тела: ${inserted} из ${presets.tasksBody.length}`);
      } else {
        console.warn('[DB] Нет данных для задач тела');
      }

      // Задачи зависимостей
      if (presets.tasksDeps && presets.tasksDeps.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_tasks 
          (id, title, task_type, icon, category_type, config, level)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.tasksDeps.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.title || '',
              item.task_type || 'checkbox',
              item.icon || null,
              item.category_type || 'deps',
              item.config || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки задачи зависимости ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено задач зависимостей: ${inserted} из ${presets.tasksDeps.length}`);
      } else {
        console.warn('[DB] Нет данных для задач зависимостей');
      }

      // Досуг - наполнение
      if (presets.leisureFilling && presets.leisureFilling.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_leisure_tasks 
          (id, title, task_type, icon, color, leisure_type, cfg_target_hours, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.leisureFilling.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.title || '',
              item.task_type || 'timer',
              item.icon || null,
              item.color || null,
              'filling',
              item.cfg_target_hours || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки досуга (наполнение) ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено досуга (наполнение): ${inserted} из ${presets.leisureFilling.length}`);
      } else {
        console.warn('[DB] Нет данных для досуга (наполнение)');
      }

      // Досуг - эскапизм
      if (presets.leisureEscape && presets.leisureEscape.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO cfg_leisure_tasks 
          (id, title, task_type, icon, color, leisure_type, cfg_target_hours, level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        let inserted = 0;
        presets.leisureEscape.forEach(item => {
          try {
            stmt.run(
              item.id,
              item.title || '',
              item.task_type || 'timer',
              item.icon || null,
              item.color || null,
              'escape',
              item.cfg_target_hours || null,
              item.level || 0
            );
            inserted++;
          } catch (e) {
            console.warn(`[DB] Ошибка вставки досуга (эскапизм) ${item.id}:`, e.message);
          }
        });
        console.log(`[DB] Загружено досуга (эскапизм): ${inserted} из ${presets.leisureEscape.length}`);
      } else {
        console.warn('[DB] Нет данных для досуга (эскапизм)');
      }

      // Подсчитываем общее количество загруженных элементов
      let totalLoaded = 0;
      const categories = [
        'ritualsMorning', 'ritualsEvening', 'vows', 'diaryCategories', 'diaryMoods',
        'accounts', 'incomeCategories', 'expenseCategories', 'tasksRituals',
        'tasksTime', 'tasksBody', 'tasksDeps', 'leisureFilling', 'leisureEscape',
        'ambientMusic'
      ];
      
      categories.forEach(cat => {
        if (presets[cat] && Array.isArray(presets[cat])) {
          totalLoaded += presets[cat].length;
        }
      });
      
      console.log(`[DB] Пресеты загружены. Всего элементов: ${totalLoaded}`);
      
      // Проверяем, что все таблицы заполнены
      const tableChecks = [
        { name: 'cfg_rituals_morning', expected: (presets.ritualsMorning && presets.ritualsMorning.length) || 0 },
        { name: 'cfg_rituals_evening', expected: (presets.ritualsEvening && presets.ritualsEvening.length) || 0 },
        { name: 'cfg_vows', expected: (presets.vows && presets.vows.length) || 0 },
        { name: 'cfg_diary_categories', expected: (presets.diaryCategories && presets.diaryCategories.length) || 0 },
        { name: 'cfg_diary_moods', expected: (presets.diaryMoods && presets.diaryMoods.length) || 0 },
        { name: 'cfg_accounts', expected: (presets.accounts && presets.accounts.length) || 0 },
        { name: 'cfg_income_categories', expected: (presets.incomeCategories && presets.incomeCategories.length) || 0 },
        { name: 'cfg_expense_categories', expected: (presets.expenseCategories && presets.expenseCategories.length) || 0 },
        { name: 'cfg_tasks', expected: ((presets.tasksRituals && presets.tasksRituals.length) || 0) + ((presets.tasksTime && presets.tasksTime.length) || 0) + ((presets.tasksBody && presets.tasksBody.length) || 0) + ((presets.tasksDeps && presets.tasksDeps.length) || 0) },
        { name: 'cfg_leisure_tasks', expected: ((presets.leisureFilling && presets.leisureFilling.length) || 0) + ((presets.leisureEscape && presets.leisureEscape.length) || 0) },
        { name: 'cfg_ambient_music', expected: (presets.ambientMusic && presets.ambientMusic.length) || 0 }
      ];
      
      console.log('[DB] Проверка заполнения таблиц:');
      tableChecks.forEach(check => {
        try {
          const actual = this.db.prepare(`SELECT COUNT(*) as count FROM ${check.name}`).get().count;
          const status = actual === check.expected ? '✅' : '❌';
          console.log(`[DB] ${status} ${check.name}: ${actual} из ${check.expected} ожидаемых`);
        } catch (e) {
          console.warn(`[DB] ⚠️ Не удалось проверить ${check.name}:`, e.message);
        }
      });

      // Устанавливаем дефолтные настройки ambient музыки, если они еще не установлены
      try {
        const settings = this.getAppSettings();
        if (settings) {
          let needsUpdate = false;
          const updates = {};

          // Дефолт для таймера - классика для фокуса (id: 1)
          if (!settings.ambient_default_timer && presets.ambientMusic && presets.ambientMusic.length > 0) {
            const timerAmbient = presets.ambientMusic.find(a => a.id === 1) || presets.ambientMusic[0];
            updates.ambient_default_timer = timerAmbient.id;
            needsUpdate = true;
          }

          // Дефолт для секундомера - темная фантазия (id: 7)
          if (!settings.ambient_default_stopwatch && presets.ambientMusic && presets.ambientMusic.length > 0) {
            const stopwatchAmbient = presets.ambientMusic.find(a => a.id === 7) || presets.ambientMusic[presets.ambientMusic.length - 1];
            updates.ambient_default_stopwatch = stopwatchAmbient.id;
            needsUpdate = true;
          }

          // Дефолт для перерыва - дождь для отдыха (id: 2)
          if (!settings.ambient_default_break && presets.ambientMusic && presets.ambientMusic.length > 0) {
            const breakAmbient = presets.ambientMusic.find(a => a.id === 2) || presets.ambientMusic[1] || presets.ambientMusic[0];
            updates.ambient_default_break = breakAmbient.id;
            needsUpdate = true;
          }

          if (needsUpdate) {
            this.saveAppSettings({ ...settings, ...updates });
            console.log('[DB] Установлены дефолтные настройки ambient музыки:', updates);
          }
        }
      } catch (e) {
        console.warn('[DB] Ошибка установки дефолтных настроек ambient музыки:', e.message);
      }
    } catch (e) {
      console.error('[DB] Ошибка загрузки пресетов:', e);
      console.error('[DB] Stack:', e.stack);
      throw e;
    }
  }

  loadPresetsFromFile() {
    try {
      const presetsPath = path.join(__dirname, 'presets.js');
      
      if (!fs.existsSync(presetsPath)) {
        console.warn('[DB] Файл presets.js не найден:', presetsPath);
        return {};
      }
      
      const presetsCode = fs.readFileSync(presetsPath, 'utf8');
      
      // Преобразуем ES6 модуль в CommonJS формат
      // Заменяем export const PRESETS на const PRESETS =
      let convertedCode = presetsCode;
      
      // Удаляем export const PRESETS = и заменяем на const PRESETS =
      convertedCode = convertedCode.replace(/export\s+const\s+PRESETS\s*=/g, 'const PRESETS =');
      
      // Удаляем все другие export statements если есть
      convertedCode = convertedCode.replace(/export\s+/g, '');
      
      // Добавляем в конец module.exports.PRESETS = PRESETS;
      if (!convertedCode.includes('module.exports')) {
        convertedCode += '\n\nif (typeof module !== "undefined" && module.exports) {\n  module.exports.PRESETS = PRESETS;\n}';
      }
      
      // Создаем контекст для выполнения кода
      const vm = require('vm');
      const context = {
        module: { exports: {} },
        exports: {},
        require: require,
        console: console,
        Date: Date,
        Math: Math,
        Object: Object,
        Array: Array,
        String: String,
        Number: Number,
        Boolean: Boolean,
        JSON: JSON,
        __dirname: __dirname,
        __filename: presetsPath
      };
      
      // Выполняем преобразованный код пресетов
      vm.createContext(context);
      vm.runInContext(convertedCode, context, {
        filename: presetsPath,
        displayErrors: true
      });
      
      // Извлекаем PRESETS
      const presets = context.module.exports.PRESETS || context.exports.PRESETS || context.PRESETS || {};
      
      if (presets && Object.keys(presets).length > 0) {
        console.log('[DB] Пресеты загружены через fs, категорий:', Object.keys(presets).length);
        // Логируем количество элементов в каждой категории
        Object.keys(presets).forEach(key => {
          if (Array.isArray(presets[key])) {
            console.log(`[DB]   ${key}: ${presets[key].length} элементов`);
          }
        });
        return presets;
      }
      
      console.warn('[DB] Пресеты пусты после загрузки через fs');
      return {};
    } catch (e) {
      console.error('[DB] Ошибка загрузки пресетов через fs:', e.message);
      console.error('[DB] Stack:', e.stack);
      return {};
    }
  }

  // Методы для работы с CFG таблицами
  getAll(tableName, filters = null) {
    try {
      // Отладочное логирование
      if (process.env.DEBUG_DB) {
        console.log(`[DB] getAll(${tableName}${filters ? ', filters: ' + JSON.stringify(filters) : ''})`);
      }
      // Проверяем существование таблицы
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(tableName);
      
      if (!tableExists) {
        // Если таблица не существует и это не cfg_leisure_tasks, просто возвращаем пустой массив
        if (tableName !== 'cfg_leisure_tasks') {
          return [];
        }
        console.warn(`[DB] Таблица ${tableName} не существует, создаем...`);
        // Пытаемся создать таблицу если её нет
        if (tableName === 'cfg_leisure_tasks') {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS cfg_leisure_tasks (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              task_type TEXT,
              icon TEXT,
              color TEXT,
              leisure_type TEXT NOT NULL,
              cfg_target_value REAL,
              cfg_unit TEXT,
              cfg_target_hours REAL,
              is_optional INTEGER DEFAULT 0,
              level INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
        } else if (tableName === 'cfg_diary_moods') {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS cfg_diary_moods (
              id TEXT PRIMARY KEY,
              level INTEGER NOT NULL,
              title TEXT,
              color TEXT,
              icon TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }
      }
      
      // Проверяем и добавляем недостающие колонки для существующих таблиц
      if (tableName === 'cfg_leisure_tasks' && tableExists) {
        try {
          const tableInfo = this.db.prepare(`
            PRAGMA table_info(cfg_leisure_tasks)
          `).all();
          
          const hasLeisureType = tableInfo.some(col => col.name === 'leisure_type');
          
          if (!hasLeisureType) {
            console.log('[DB] Добавление колонки leisure_type в cfg_leisure_tasks...');
            this.db.exec(`
              ALTER TABLE cfg_leisure_tasks 
              ADD COLUMN leisure_type TEXT DEFAULT 'filling'
            `);
            this.db.exec(`
              UPDATE cfg_leisure_tasks 
              SET leisure_type = 'filling' 
              WHERE leisure_type IS NULL
            `);
          }
        } catch (migrationError) {
          // Игнорируем ошибки миграции, если колонка уже существует
          if (!migrationError.message.includes('duplicate column') && !migrationError.message.includes('no such table')) {
            console.warn('[DB] Предупреждение при миграции cfg_leisure_tasks:', migrationError.message);
          }
        }
      }
      
      // Определяем правильный порядок сортировки в зависимости от таблицы
      let orderBy = 'level ASC';
      if (tableName.includes('act_')) {
        orderBy = 'date DESC';
      } else if (tableName === 'cfg_goal_stages' || tableName === 'cfg_goal_tasks') {
        orderBy = 'order_index ASC';
      } else if (tableName === 'app_settings') {
        // Для app_settings используем created_at, так как там нет колонки level
        orderBy = 'created_at DESC';
      } else if (tableName === 'cfg_ambient_music') {
        // Для ambient_music используем name, так как там нет колонки level
        orderBy = 'name ASC';
      }

      if (filters) {
        const conditions = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(filters);
        const stmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE ${conditions} ORDER BY ${orderBy}`);
        return stmt.all(...values);
      } else {
        const stmt = this.db.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`);
        return stmt.all();
      }
    } catch (e) {
      console.error(`[DB] Ошибка получения всех записей из ${tableName}:`, e);
      console.error(`[DB] Stack:`, e.stack);
      return [];
    }
  }

  getById(tableName, id) {
    try {
      if (process.env.DEBUG_DB) {
        console.log(`[DB] getById(${tableName}, ${id})`);
      }
      const stmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      const result = stmt.get(id);
      if (process.env.DEBUG_DB && !result) {
        console.warn(`[DB] ⚠️ Запись ${id} не найдена в ${tableName}`);
      }
      return result;
    } catch (e) {
      console.error(`[DB] ❌ Ошибка получения записи ${id} из ${tableName}:`, e);
      return null;
    }
  }

  create(tableName, data) {
    try {
      // Проверяем, есть ли поле id и нужно ли его генерировать
      let hasId = false;
      let idIsPrimary = false;
      let idIsInteger = false;
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        const idColumn = tableInfo.find(col => col.name === 'id');
        if (idColumn) {
          hasId = true;
          idIsPrimary = idColumn.pk === 1;
          // Проверяем, является ли id INTEGER (что обычно означает AUTOINCREMENT)
          idIsInteger = idColumn.type && idColumn.type.toUpperCase().includes('INTEGER');
        }
      } catch (e) {
        // Игнорируем ошибку проверки
      }
      
      // Для ритуалов устанавливаем active = 1 по умолчанию, если не указано
      if ((tableName === 'cfg_rituals_morning' || tableName === 'cfg_rituals_evening') && data.active === undefined) {
        data.active = 1;
      }
      
      // Если поле id является PRIMARY KEY и не указано в data, генерируем его
      // НО только если это не INTEGER (AUTOINCREMENT таблицы)
      if (hasId && idIsPrimary && !data.id && !idIsInteger) {
        // Специальная логика для ритуалов - используем формат как в пресетах
        if (tableName === 'cfg_rituals_morning') {
          // Генерируем уникальный ID в формате r_morning_N на основе timestamp
          // Используем timestamp для уникальности, но также проверяем существующие ID
          try {
            const existingRituals = this.getAll(tableName);
            const existingIds = new Set(existingRituals.map(r => r.id).filter(Boolean));
            let newId;
            let counter = 0;
            do {
              // Используем timestamp + счетчик для уникальности
              newId = `r_morning_${Date.now()}_${counter}`;
              counter++;
            } while (existingIds.has(newId) && counter < 100);
            data.id = newId;
          } catch (e) {
            // Fallback если не удалось получить существующие ритуалы
            data.id = `r_morning_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          }
        } else if (tableName === 'cfg_rituals_evening') {
          // Аналогично для вечерних ритуалов
          try {
            const existingRituals = this.getAll(tableName);
            const existingIds = new Set(existingRituals.map(r => r.id).filter(Boolean));
            let newId;
            let counter = 0;
            do {
              newId = `r_evening_${Date.now()}_${counter}`;
              counter++;
            } while (existingIds.has(newId) && counter < 100);
            data.id = newId;
          } catch (e) {
            data.id = `r_evening_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          }
        } else {
          // Для остальных таблиц - генерируем ID на основе tableName и timestamp
          const prefix = tableName.replace('cfg_', '').replace('act_', '').substring(0, 8);
          data.id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        console.log(`[DB] Сгенерирован ID для новой записи в ${tableName}: ${data.id}`);
      }
      
      // Для таблиц с INTEGER PRIMARY KEY AUTOINCREMENT удаляем id из data, если он не был явно указан
      if (hasId && idIsPrimary && idIsInteger && !data.id) {
        // Удаляем id из data, чтобы SQLite автоматически сгенерировал его
        delete data.id;
      }
      
      const fields = Object.keys(data);
      // Экранируем зарезервированные слова SQLite (например, 'group')
      // Используем обратные кавычки, как в CREATE TABLE
      const escapedFields = fields.map(field => field === 'group' ? '`group`' : field);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => data[field]);
      
      // Проверяем наличие колонки updated_at
      let hasUpdatedAt = false;
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
      } catch (e) {
        // Игнорируем ошибку проверки
      }
      
      // Формируем SQL запрос в зависимости от наличия колонки updated_at
      let sql, sqlValues;
      if (hasUpdatedAt) {
        sql = `INSERT INTO ${tableName} (${escapedFields.join(', ')}, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP)`;
        sqlValues = values;
      } else {
        sql = `INSERT INTO ${tableName} (${escapedFields.join(', ')}) VALUES (${placeholders})`;
        sqlValues = values;
      }
      
      const stmt = this.db.prepare(sql);
      stmt.run(...sqlValues);
      
      // Отмечаем изменения в БД (кроме служебных таблиц и миграций)
      if (!tableName.includes('backup_history') && !tableName.includes('app_settings')) {
        const tracker = getSettingsChangeTracker();
        if (tracker && tracker.markChanged) {
          tracker.markChanged();
        }
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка создания записи в ${tableName}:`, e);
      throw e;
    }
  }

  update(tableName, id, data) {
    try {
      const fields = Object.keys(data);
      // Экранируем зарезервированные слова SQLite (например, 'group')
      // Используем обратные кавычки, как в CREATE TABLE
      const setClause = fields.map(field => {
        const escapedField = field === 'group' ? '`group`' : field;
        return `${escapedField} = ?`;
      }).join(', ');
      const values = fields.map(field => data[field]);
      values.push(id);
      
      // Проверяем наличие колонки updated_at
      let hasUpdatedAt = false;
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
      } catch (e) {
        // Игнорируем ошибку проверки
      }
      
      // Формируем SQL запрос в зависимости от наличия колонки updated_at
      let sql;
      if (hasUpdatedAt) {
        sql = `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      } else {
        sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
      }
      
      // Временное логирование для отладки
      if (tableName === 'cfg_nutrition_products' || tableName === 'cfg_nutrition_presets') {
        console.log('[DB] SQL запрос:', sql);
        console.log('[DB] Значения:', values);
        console.log('[DB] Поля:', fields);
        console.log('[DB] setClause:', setClause);
      }
      
      const stmt = this.db.prepare(sql);
      stmt.run(...values);
      
      // Отмечаем изменения в БД (кроме служебных таблиц и служебных полей)
      if (!tableName.includes('backup_history')) {
        // Проверяем, обновляются ли только служебные поля (usage_count, updated_at)
        const serviceFields = ['usage_count', 'updated_at', 'created_at'];
        const isOnlyServiceFields = Object.keys(data).every(field => serviceFields.includes(field));
        
        // Не вызываем markChanged() если обновляются только служебные поля
        // (это происходит автоматически при изменении связанных данных)
        if (!isOnlyServiceFields) {
          const tracker = getSettingsChangeTracker();
          if (tracker && tracker.markChanged) {
            tracker.markChanged();
          }
        }
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления записи ${id} в ${tableName}:`, e);
      if (tableName === 'cfg_nutrition_products' || tableName === 'cfg_nutrition_presets') {
        console.error('[DB] Данные для обновления:', data);
        console.error('[DB] Сообщение ошибки:', e.message);
      }
      throw e;
    }
  }

  delete(tableName, id) {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
      stmt.run(id);
      
      // Отмечаем изменения в БД (кроме служебных таблиц)
      if (!tableName.includes('backup_history')) {
        const tracker = getSettingsChangeTracker();
        if (tracker && tracker.markChanged) {
          tracker.markChanged();
        }
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка удаления записи ${id} из ${tableName}:`, e);
      throw e;
    }
  }

  // Методы для работы с транзакциями
  getTransactions(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_transactions 
        WHERE date = ? 
        ORDER BY created_at DESC
      `);
      return stmt.all(date);
    } catch (e) {
      console.error(`[DB] Ошибка получения транзакций за ${date}:`, e);
      return [];
    }
  }

  getAllTransactions(filters = null) {
    try {
      if (filters) {
        const conditions = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(filters);
        const stmt = this.db.prepare(`
          SELECT * FROM act_transactions 
          WHERE ${conditions} 
          ORDER BY date DESC, created_at DESC
        `);
        return stmt.all(...values);
      } else {
        const stmt = this.db.prepare(`
          SELECT * FROM act_transactions 
          ORDER BY date DESC, created_at DESC
        `);
        return stmt.all();
      }
    } catch (e) {
      console.error('[DB] Ошибка получения всех транзакций:', e);
      return [];
    }
  }

  /** Транзакции за диапазон дат (для статистики renderer). */
  getTransactionsBetween(startDate, endDate) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_transactions
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC, created_at ASC
      `);
      return stmt.all(startDate, endDate);
    } catch (e) {
      console.error('[DB] Ошибка getTransactionsBetween:', e);
      return [];
    }
  }

  /** Строки act_daily_points за диапазон (для статистики). */
  getDailyPointsBetween(startDate, endDate) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_daily_points
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `);
      return stmt.all(startDate, endDate);
    } catch (e) {
      console.error('[DB] Ошибка getDailyPointsBetween:', e);
      return [];
    }
  }

  /** Последняя запись cumulative_points строго до указанной даты. */
  getLastCumulativePointsBefore(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT cumulative_points FROM act_daily_points
        WHERE date < ?
        ORDER BY date DESC
        LIMIT 1
      `);
      const row = stmt.get(date);
      return row ? Number(row.cumulative_points) || 0 : 0;
    } catch (e) {
      console.error('[DB] Ошибка getLastCumulativePointsBefore:', e);
      return 0;
    }
  }

  /** Записи дневника за диапазон; options.moodOnly — только с mood_id. */
  getDiaryEntriesBetween(startDate, endDate, options = {}) {
    try {
      const moodOnly = Boolean(options.moodOnly);
      const stmt = this.db.prepare(`
        SELECT * FROM act_diary_entries
        WHERE date >= ? AND date <= ?
        ${moodOnly ? 'AND mood_id IS NOT NULL' : ''}
        ORDER BY date ASC
      `);
      return stmt.all(startDate, endDate);
    } catch (e) {
      console.error('[DB] Ошибка getDiaryEntriesBetween:', e);
      return [];
    }
  }

  getAccountBalance(accountId) {
    if (!accountId) return 0;
    const account = this.getById('cfg_accounts', String(accountId));
    return Number(account?.balance) || 0;
  }

  changeAccountBalance(accountId, delta) {
    if (!accountId) return;
    const id = String(accountId);
    const amountDelta = Number(delta);
    if (!Number.isFinite(amountDelta) || amountDelta === 0) return;
    const current = this.getAccountBalance(id);
    this.update('cfg_accounts', id, { balance: current + amountDelta });
  }

  applyTransactionBalanceDelta(transaction, sign = 1) {
    if (!transaction) return;
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const multiplier = Number(sign) < 0 ? -1 : 1;
    const type = String(transaction.type || 'expense');
    if (type === 'income') {
      this.changeAccountBalance(transaction.account_id, multiplier * amount);
      return;
    }
    if (type === 'transfer') {
      this.changeAccountBalance(transaction.from_id, -multiplier * amount);
      this.changeAccountBalance(transaction.to_id, multiplier * amount);
      return;
    }
    // expense (default)
    this.changeAccountBalance(transaction.account_id, -multiplier * amount);
  }

  addTransaction(transaction) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO act_transactions 
        (id, date, type, amount, account_id, from_id, to_id, category_id, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        transaction.id,
        transaction.date,
        transaction.type,
        transaction.amount,
        transaction.account_id || null,
        transaction.from_id || null,
        transaction.to_id || null,
        transaction.category_id || null,
        transaction.description || null,
        transaction.created_at || new Date().toISOString(),
        transaction.updated_at || new Date().toISOString()
      );

      // Обновляем балансы счетов по новой транзакции.
      this.applyTransactionBalanceDelta(transaction, 1);
      
      // Увеличиваем счетчик использования категории
      if (transaction.category_id && transaction.type !== 'transfer') {
        const tableName = transaction.type === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
        try {
          const category = this.getById(tableName, transaction.category_id);
          if (category) {
            const currentCount = category.usage_count || 0;
            this.update(tableName, transaction.category_id, {
              usage_count: currentCount + 1
            });
          }
        } catch (e) {
          console.warn(`[DB] Не удалось обновить счетчик использования категории ${transaction.category_id}:`, e.message);
        }
      }
      
      console.log(`[DB] Транзакция ${transaction.id} добавлена`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка добавления транзакции ${transaction.id}:`, e);
      throw e;
    }
  }

  updateTransaction(transactionId, data) {
    try {
      // Получаем старую транзакцию для обновления счетчиков
      const oldTransaction = this.getById('act_transactions', transactionId);
      
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      const stmt = this.db.prepare(`
        UPDATE act_transactions 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(...values, transactionId);

      // Для обновления балансов: откатываем старую транзакцию и применяем новую.
      const mergedTransaction = {
        ...(oldTransaction || {}),
        ...data,
      };
      if (oldTransaction) this.applyTransactionBalanceDelta(oldTransaction, -1);
      this.applyTransactionBalanceDelta(mergedTransaction, 1);
      
      // Обновляем счетчики использования категорий
      if (oldTransaction && data.category_id !== undefined && data.type !== undefined) {
        // Уменьшаем счетчик старой категории (если была)
        if (oldTransaction.category_id && oldTransaction.type !== 'transfer') {
          const oldTableName = oldTransaction.type === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
          try {
            const oldCategory = this.getById(oldTableName, oldTransaction.category_id);
            if (oldCategory && oldCategory.usage_count > 0) {
              this.update(oldTableName, oldTransaction.category_id, {
                usage_count: Math.max(0, (oldCategory.usage_count || 0) - 1)
              });
            }
          } catch (e) {
            console.warn(`[DB] Не удалось уменьшить счетчик старой категории:`, e.message);
          }
        }
        
        // Увеличиваем счетчик новой категории (если есть и не перевод)
        if (data.category_id && data.type !== 'transfer') {
          const newTableName = data.type === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
          try {
            const newCategory = this.getById(newTableName, data.category_id);
            if (newCategory) {
              const currentCount = newCategory.usage_count || 0;
              this.update(newTableName, data.category_id, {
                usage_count: currentCount + 1
              });
            }
          } catch (e) {
            console.warn(`[DB] Не удалось увеличить счетчик новой категории:`, e.message);
          }
        }
      }
      
      console.log(`[DB] Транзакция ${transactionId} обновлена`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления транзакции ${transactionId}:`, e);
      throw e;
    }
  }

  deleteTransaction(transactionId) {
    try {
      // Получаем транзакцию перед удалением для обновления счетчиков
      const transaction = this.getById('act_transactions', transactionId);
      
      const stmt = this.db.prepare(`DELETE FROM act_transactions WHERE id = ?`);
      stmt.run(transactionId);

      // При удалении откатываем влияние транзакции на балансы.
      if (transaction) this.applyTransactionBalanceDelta(transaction, -1);
      
      // Уменьшаем счетчик использования категории
      if (transaction && transaction.category_id && transaction.type !== 'transfer') {
        const tableName = transaction.type === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
        try {
          const category = this.getById(tableName, transaction.category_id);
          if (category && category.usage_count > 0) {
            this.update(tableName, transaction.category_id, {
              usage_count: Math.max(0, (category.usage_count || 0) - 1)
            });
          }
        } catch (e) {
          console.warn(`[DB] Не удалось уменьшить счетчик использования категории ${transaction.category_id}:`, e.message);
        }
      }
      
      console.log(`[DB] Транзакция ${transactionId} удалена`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка удаления транзакции ${transactionId}:`, e);
      throw e;
    }
  }

  // Методы для работы с записями питания
  getNutritionEntries(date) {
    try {
      const normalizedDate = this.normalizeDateOnly(date);
      const stmt = this.db.prepare(`
        SELECT * FROM act_nutrition_entries 
        WHERE date = ? 
        ORDER BY created_at ASC
      `);
      return stmt.all(normalizedDate || date);
    } catch (e) {
      console.error('[DB] Ошибка получения записей питания:', e);
      return [];
    }
  }

  getDailyNutrition(date) {
    try {
      const entries = this.getNutritionEntries(this.normalizeDateOnly(date));
      return entries.reduce((total, entry) => {
        total.calories += entry.total_calories || 0;
        total.proteins += entry.total_proteins || 0;
        total.fats += entry.total_fats || 0;
        total.carbs += entry.total_carbs || 0;
        return total;
      }, { calories: 0, proteins: 0, fats: 0, carbs: 0 });
    } catch (e) {
      console.error('[DB] Ошибка получения дневной статистики питания:', e);
      return { calories: 0, proteins: 0, fats: 0, carbs: 0 };
    }
  }

  addNutritionEntry(entry) {
    try {
      const hasProduct = Boolean(entry.product_id);
      const hasPreset = Boolean(entry.preset_id);
      if (hasProduct === hasPreset) {
        throw new Error('Некорректная запись питания: укажите либо product_id, либо preset_id');
      }

      const stmt = this.db.prepare(`
        INSERT INTO act_nutrition_entries 
        (id, date, product_id, preset_id, portions, total_calories, total_proteins, total_fats, total_carbs, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        entry.id,
        entry.date,
        entry.product_id || null,
        entry.preset_id || null,
        entry.portions,
        entry.total_calories,
        entry.total_proteins,
        entry.total_fats,
        entry.total_carbs,
        entry.created_at || new Date().toISOString(),
        entry.updated_at || new Date().toISOString()
      );
      
      // Увеличиваем счетчик использования продукта или пресета
      if (entry.product_id) {
        try {
          const product = this.getById('cfg_nutrition_products', entry.product_id);
          if (product) {
            const currentCount = product.usage_count || 0;
            this.update('cfg_nutrition_products', entry.product_id, {
              usage_count: currentCount + 1
            });
          }
        } catch (e) {
          console.warn(`[DB] Не удалось обновить счетчик использования продукта ${entry.product_id}:`, e.message);
        }
      } else if (entry.preset_id) {
        try {
          const preset = this.getById('cfg_nutrition_presets', entry.preset_id);
          if (preset) {
            const currentCount = preset.usage_count || 0;
            this.update('cfg_nutrition_presets', entry.preset_id, {
              usage_count: currentCount + 1
            });
          }
        } catch (e) {
          console.warn(`[DB] Не удалось обновить счетчик использования пресета ${entry.preset_id}:`, e.message);
        }
      }
      
      console.log(`[DB] Запись питания ${entry.id} добавлена`);
      this.recalculateDerivedProgressForDate(entry.date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка добавления записи питания ${entry.id}:`, e);
      throw e;
    }
  }

  updateNutritionEntry(entryId, data) {
    try {
      const nextHasProduct = Object.prototype.hasOwnProperty.call(data, 'product_id') ? Boolean(data.product_id) : null;
      const nextHasPreset = Object.prototype.hasOwnProperty.call(data, 'preset_id') ? Boolean(data.preset_id) : null;
      if (nextHasProduct !== null || nextHasPreset !== null) {
        const currentEntry = this.getById('act_nutrition_entries', entryId);
        const hasProduct = nextHasProduct !== null ? nextHasProduct : Boolean(currentEntry?.product_id);
        const hasPreset = nextHasPreset !== null ? nextHasPreset : Boolean(currentEntry?.preset_id);
        if (hasProduct === hasPreset) {
          throw new Error('Некорректное обновление записи питания: укажите либо product_id, либо preset_id');
        }
      }

      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      const stmt = this.db.prepare(`
        UPDATE act_nutrition_entries 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(...values, entryId);
      
      console.log(`[DB] Запись питания ${entryId} обновлена`);
      const updated = this.getById('act_nutrition_entries', entryId);
      this.recalculateDerivedProgressForDate(updated?.date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления записи питания ${entryId}:`, e);
      throw e;
    }
  }

  deleteNutritionEntry(entryId) {
    try {
      // Получаем запись перед удалением для обновления счетчиков
      const entry = this.getById('act_nutrition_entries', entryId);
      
      const stmt = this.db.prepare(`DELETE FROM act_nutrition_entries WHERE id = ?`);
      stmt.run(entryId);
      
      // Уменьшаем счетчик использования продукта или пресета
      if (entry) {
        if (entry.product_id) {
          try {
            const product = this.getById('cfg_nutrition_products', entry.product_id);
            if (product && product.usage_count > 0) {
              this.update('cfg_nutrition_products', entry.product_id, {
                usage_count: Math.max(0, (product.usage_count || 0) - 1)
              });
            }
          } catch (e) {
            console.warn(`[DB] Не удалось уменьшить счетчик использования продукта ${entry.product_id}:`, e.message);
          }
        } else if (entry.preset_id) {
          try {
            const preset = this.getById('cfg_nutrition_presets', entry.preset_id);
            if (preset && preset.usage_count > 0) {
              this.update('cfg_nutrition_presets', entry.preset_id, {
                usage_count: Math.max(0, (preset.usage_count || 0) - 1)
              });
            }
          } catch (e) {
            console.warn(`[DB] Не удалось уменьшить счетчик использования пресета ${entry.preset_id}:`, e.message);
          }
        }
      }
      
      console.log(`[DB] Запись питания ${entryId} удалена`);
      this.recalculateDerivedProgressForDate(entry?.date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка удаления записи питания ${entryId}:`, e);
      throw e;
    }
  }

  // Вспомогательный метод для определения группы по названию/цвету (Белки, Жиры, Углеводы, Блюда)
  inferGroupFromColor(color, title) {
    if (!title) return null;
    const titleLower = title.toLowerCase();

    if (titleLower.includes('куриц') || titleLower.includes('грудк') || titleLower.includes('птиц') ||
        titleLower.includes('лосос') || titleLower.includes('тунец') || titleLower.includes('рыб') ||
        titleLower.includes('яйц') || titleLower.includes('молок') || titleLower.includes('сыр') ||
        titleLower.includes('творог') || titleLower.includes('бобов') || titleLower.includes('фасол') || titleLower.includes('чечевиц')) {
      return 'proteins';
    }
    if (titleLower.includes('масл') || titleLower.includes('авокадо') || titleLower.includes('орех')) {
      return 'fats';
    }
    if (titleLower.includes('овсянк') || titleLower.includes('гречк') || titleLower.includes('киноа') ||
        titleLower.includes('рис') || titleLower.includes('макарон') || titleLower.includes('хлеб') ||
        titleLower.includes('картофел') || titleLower.includes('морков') || titleLower.includes('брокколи') ||
        titleLower.includes('шпинат') || titleLower.includes('капуст') || titleLower.includes('огурец') ||
        titleLower.includes('банан') || titleLower.includes('яблок') || titleLower.includes('фрукт') ||
        titleLower.includes('мед') || titleLower.includes('помидор')) {
      return 'carbs';
    }
    return 'dishes';
  }

  // Методы для работы с планами на день
  getDailyPlans(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_daily_plans 
        WHERE date = ? 
        ORDER BY completed ASC, created_at ASC
      `);
      return stmt.all(date);
    } catch (e) {
      console.error(`[DB] Ошибка получения планов на день за ${date}:`, e);
      return [];
    }
  }

  addDailyPlan(plan) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO act_daily_plans 
        (id, date, title, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        plan.id,
        plan.date,
        plan.title,
        plan.completed || 0,
        plan.created_at || new Date().toISOString(),
        plan.updated_at || new Date().toISOString()
      );
      
      console.log(`[DB] План на день ${plan.id} добавлен`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка добавления плана на день ${plan.id}:`, e);
      throw e;
    }
  }

  updateDailyPlan(planId, data) {
    try {
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      const stmt = this.db.prepare(`
        UPDATE act_daily_plans 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(...values, planId);
      
      console.log(`[DB] План на день ${planId} обновлен`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления плана на день ${planId}:`, e);
      throw e;
    }
  }

  deleteDailyPlan(planId) {
    try {
      const stmt = this.db.prepare(`DELETE FROM act_daily_plans WHERE id = ?`);
      stmt.run(planId);
      
      console.log(`[DB] План на день ${planId} удален`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка удаления плана на день ${planId}:`, e);
      throw e;
    }
  }

  // Методы для работы с записями дневника
  getDiaryEntry(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_diary_entries 
        WHERE date = ?
      `);
      return stmt.get(date);
    } catch (e) {
      console.error(`[DB] Ошибка получения записи дневника за ${date}:`, e);
      return null;
    }
  }

  getDiaryEntriesByMonth(year, month) {
    try {
      // Форматируем месяц с ведущим нулем
      const monthStr = String(month).padStart(2, '0');
      const datePattern = `${year}-${monthStr}-%`;
      
      const stmt = this.db.prepare(`
        SELECT * FROM act_diary_entries 
        WHERE date LIKE ?
        ORDER BY date DESC
      `);
      return stmt.all(datePattern);
    } catch (e) {
      console.error(`[DB] Ошибка получения записей дневника за ${year}-${month}:`, e);
      return [];
    }
  }

  saveDiaryEntry(entry) {
    try {
      // Используем INSERT OR REPLACE для обеспечения одной записи на день
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO act_diary_entries 
        (id, date, mood_id, category_id, text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 
          COALESCE((SELECT created_at FROM act_diary_entries WHERE date = ?), CURRENT_TIMESTAMP),
          CURRENT_TIMESTAMP)
      `);
      stmt.run(
        entry.id,
        entry.date,
        entry.mood_id || null,
        entry.category_id || null,
        entry.text || null,
        entry.date // Для COALESCE в created_at
      );
      console.log(`[DB] Запись дневника ${entry.id} сохранена для ${entry.date}`);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка сохранения записи дневника ${entry.id}:`, e);
      throw e;
    }
  }

  deleteDiaryEntry(date) {
    try {
      const stmt = this.db.prepare(`DELETE FROM act_diary_entries WHERE date = ?`);
      stmt.run(date);
      console.log(`[DB] Запись дневника за ${date} удалена`);
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка удаления записи дневника за ${date}:`, e);
      throw e;
    }
  }

  getTransactionById(transactionId) {
    try {
      const stmt = this.db.prepare(`SELECT * FROM act_transactions WHERE id = ?`);
      return stmt.get(transactionId);
    } catch (e) {
      console.error(`[DB] Ошибка получения транзакции ${transactionId}:`, e);
      return null;
    }
  }

  // Методы для работы с утренними ритуалами
  getRitualsMorning(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_rituals_morning 
        WHERE date = ?
      `);
      return stmt.all(date);
    } catch (e) {
      console.error(`[DB] Ошибка получения утренних ритуалов за ${date}:`, e);
      return [];
    }
  }

  getRitualMorningStatus(date, ritualId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_rituals_morning 
        WHERE date = ? AND ritual_id = ?
      `);
      return stmt.get(date, ritualId);
    } catch (e) {
      console.error(`[DB] Ошибка получения статуса утреннего ритуала ${ritualId} за ${date}:`, e);
      return null;
    }
  }

  saveRitualMorning(date, ritualId, completed) {
    try {
      // Проверяем, что ritualId не null и не undefined
      if (!ritualId) {
        throw new Error(`ritualId не может быть null или undefined. Дата: ${date}, completed: ${completed}`);
      }

      const id = `ritual_morning_${date.replace(/-/g, '')}_${ritualId}_${Date.now()}`;
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO act_rituals_morning 
        (id, date, ritual_id, completed, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(id, date, ritualId, completed ? 1 : 0);
      console.log(`[DB] Статус утреннего ритуала ${ritualId} за ${date} сохранен: ${completed ? 'выполнено' : 'не выполнено'}`);
      
      // Обновляем прогресс ritual задач типа 'sunrise' (утренние)
      this.updateRitualTasksProgress('sunrise', date);
      // Каскадный пересчет всех производных метрик дня (включая act_daily_points).
      this.recalculateDerivedProgressForDate(date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка сохранения статуса утреннего ритуала ${ritualId} за ${date}:`, e);
      throw e;
    }
  }

  // Методы для работы с вечерними ритуалами
  getRitualsEvening(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_rituals_evening 
        WHERE date = ?
      `);
      return stmt.all(date);
    } catch (e) {
      console.error(`[DB] Ошибка получения вечерних ритуалов за ${date}:`, e);
      return [];
    }
  }

  getRitualEveningStatus(date, ritualId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_rituals_evening 
        WHERE date = ? AND ritual_id = ?
      `);
      return stmt.get(date, ritualId);
    } catch (e) {
      console.error(`[DB] Ошибка получения статуса вечернего ритуала ${ritualId} за ${date}:`, e);
      return null;
    }
  }

  saveRitualEvening(date, ritualId, completed) {
    try {
      // Проверяем, что ritualId не null и не undefined
      if (!ritualId) {
        throw new Error(`ritualId не может быть null или undefined. Дата: ${date}, completed: ${completed}`);
      }

      const id = `ritual_evening_${date.replace(/-/g, '')}_${ritualId}_${Date.now()}`;
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO act_rituals_evening 
        (id, date, ritual_id, completed, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(id, date, ritualId, completed ? 1 : 0);
      console.log(`[DB] Статус вечернего ритуала ${ritualId} за ${date} сохранен: ${completed ? 'выполнено' : 'не выполнено'}`);
      
      // Обновляем прогресс ritual задач типа 'sunset' (вечерние)
      this.updateRitualTasksProgress('sunset', date);
      // Каскадный пересчет всех производных метрик дня (включая act_daily_points).
      this.recalculateDerivedProgressForDate(date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка сохранения статуса вечернего ритуала ${ritualId} за ${date}:`, e);
      throw e;
    }
  }

  updateRitualTasksProgress(ritualType, date) {
    try {
      // Находим все ritual задачи с соответствующим ritual_type
      const ritualTasks = this.db.prepare(`
        SELECT id, category_type, level FROM cfg_tasks 
        WHERE task_type = 'ritual' AND ritual_type = ?
      `).all(ritualType);

      // Вычисляем процент выполнения ритуалов
      const progress = this.calculateRitualProgress(ritualType, date);

      // Обновляем прогресс для каждой ritual задачи
      for (const task of ritualTasks) {
        const levelSlot = this.normalizeTaskLevelSlot(task.level);
        if (levelSlot == null) continue;
        const columnName = `${task.category_type}_${levelSlot}_value`;
        const completionPercentColumnName = `${task.category_type}_${levelSlot}_completion_percent`;
        this.ensureDayRecord(date);
        this.db.prepare(`
          UPDATE act_tasks SET ${columnName} = ?, ${completionPercentColumnName} = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?
        `).run(progress, progress, date);
      }

      // Пересчитываем прогресс категории
      if (ritualTasks.length > 0) {
        const categoryType = ritualTasks[0].category_type;
        this.calculateCategoryProgress(categoryType, date);
      }
    } catch (e) {
      console.error(`[DB] Ошибка обновления прогресса ritual задач ${ritualType}:`, e);
    }
  }

  // Методы для работы с сессиями таймера
  getTimerSessions(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM act_timer_sessions 
        WHERE date = ?
        ORDER BY created_at DESC
      `);
      return stmt.all(date);
    } catch (e) {
      console.error(`[DB] Ошибка получения сессий таймера за ${date}:`, e);
      return [];
    }
  }

  normalizeDateOnly(value) {
    if (!value) return '';
    const raw = String(value);
    return raw.includes('T') ? raw.split('T')[0] : raw;
  }

  normalizeTaskLevelSlot(level) {
    const n = Number(level);
    if (!Number.isFinite(n)) return 0;
    const slot = Math.floor(n);
    return slot >= 0 && slot <= 2 ? slot : null;
  }

  recalculateDerivedProgressForDate(date) {
    const normalizedDate = this.normalizeDateOnly(date);
    if (!normalizedDate) return;
    try {
      ['rituals', 'time', 'body', 'deps'].forEach((categoryType) => {
        try {
          this.calculateCategoryProgress(categoryType, normalizedDate);
        } catch (error) {
          console.error(`[DB] Ошибка пересчета категории ${categoryType} за ${normalizedDate}:`, error);
        }
      });
      try {
        const PointsService = require('../services/PointsService.js');
        const pointsService = new PointsService(this);
        pointsService.saveDailyPoints(normalizedDate);
      } catch (error) {
        console.error(`[DB] Ошибка пересчета очков за ${normalizedDate}:`, error);
      }
    } catch (error) {
      console.error(`[DB] Ошибка каскадного пересчета за ${normalizedDate}:`, error);
    }
  }

  addTimerSession(session) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO act_timer_sessions 
        (id, date, task_id, duration, timer_type, target_duration, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      stmt.run(
        session.id,
        session.date,
        session.task_id,
        session.duration,
        session.timer_type,
        session.target_duration || null
      );
      this.recalculateDerivedProgressForDate(session.date);
      console.log(`[DB] Сессия таймера ${session.id} добавлена для ${session.date}`);
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка добавления сессии таймера ${session.id}:`, e);
      throw e;
    }
  }

  updateTimerSession(sessionId, data) {
    try {
      const prev = this.db.prepare(`
        SELECT date FROM act_timer_sessions WHERE id = ?
      `).get(sessionId);
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      const stmt = this.db.prepare(`
        UPDATE act_timer_sessions 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(...values, sessionId);
      console.log(`[DB] Сессия таймера ${sessionId} обновлена`);
      const next = this.db.prepare(`
        SELECT date FROM act_timer_sessions WHERE id = ?
      `).get(sessionId);
      this.recalculateDerivedProgressForDate(prev?.date);
      this.recalculateDerivedProgressForDate(next?.date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления сессии таймера ${sessionId}:`, e);
      throw e;
    }
  }

  deleteTimerSession(id) {
    try {
      const prev = this.db.prepare(`
        SELECT date FROM act_timer_sessions WHERE id = ?
      `).get(id);
      const stmt = this.db.prepare(`DELETE FROM act_timer_sessions WHERE id = ?`);
      stmt.run(id);
      console.log(`[DB] Сессия таймера ${id} удалена`);
      this.recalculateDerivedProgressForDate(prev?.date);
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка удаления сессии таймера ${id}:`, e);
      throw e;
    }
  }

  getTaskTimerTotal(date, taskId) {
    try {
      const stmt = this.db.prepare(`
        SELECT SUM(duration) as total FROM act_timer_sessions 
        WHERE date = ? AND task_id = ?
      `);
      const result = stmt.get(date, taskId);
      return result ? (result.total || 0) : 0;
    } catch (e) {
      console.error(`[DB] Ошибка получения суммарного времени задачи ${taskId} за ${date}:`, e);
      return 0;
    }
  }


  // Методы для очистки и перезагрузки пресетов
  clearDatabase() {
    try {
      console.log('[DB] Очистка базы данных...');
      
      // Очищаем все CFG таблицы
      const cfgTables = [
        'cfg_tasks',
        'cfg_accounts',
        'cfg_income_categories',
        'cfg_expense_categories',
        'cfg_vows',
        'cfg_goals',
        'cfg_goal_stages',
        'cfg_goal_tasks',
        'cfg_diary_categories',
        'cfg_diary_moods',
        'cfg_leisure_tasks',
        'cfg_rituals_morning',
        'cfg_rituals_evening',
        'cfg_nutrition_products',
        'cfg_nutrition_presets',
        'cfg_ambient_music' // Фоновая музыка
      ];

      cfgTables.forEach(tableName => {
        try {
          const beforeCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          this.db.exec(`DELETE FROM ${tableName}`);
          const afterCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          console.log(`[DB] ✅ Очищена таблица: ${tableName} (было: ${beforeCount} записей, стало: ${afterCount} записей)`);
        } catch (e) {
          // Игнорируем ошибки для несуществующих таблиц
          if (!e.message.includes('no such table')) {
            console.warn(`[DB] ⚠️ Предупреждение при очистке ${tableName}:`, e.message);
          }
        }
      });

      // Очищаем все ACT таблицы
      const actTables = [
        'act_transactions',
        'act_diary_entries',
        'act_daily_plans',
        'act_goal_tasks',
        'act_tasks',
        'act_task_completions',
        'act_rituals_morning',
        'act_rituals_evening',
        'act_timer_sessions',
        'act_nutrition_entries',
        'act_daily_points' // Очки и прогресс по дням (используется календарем)
      ];

      actTables.forEach(tableName => {
        try {
          const beforeCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          this.db.exec(`DELETE FROM ${tableName}`);
          const afterCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          console.log(`[DB] ✅ Очищена таблица: ${tableName} (было: ${beforeCount} записей, стало: ${afterCount} записей)`);
          
          // Для act_daily_points дополнительно проверяем, что все данные удалены
          if (tableName === 'act_daily_points' && afterCount > 0) {
            console.warn(`[DB] ⚠️ ВНИМАНИЕ: В таблице ${tableName} осталось ${afterCount} записей после очистки!`);
          }
        } catch (e) {
          // Игнорируем ошибки для несуществующих таблиц
          if (!e.message.includes('no such table')) {
            console.warn(`[DB] ⚠️ Предупреждение при очистке ${tableName}:`, e.message);
          }
        }
      });

      // Проверяем, что все таблицы очищены (кроме системных)
      console.log('[DB] Проверка очистки всех таблиц...');
      const allTables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT IN ('app_settings', 'backup_history')
        ORDER BY name
      `).all();
      
      let totalCleared = 0;
      let totalRemaining = 0;
      const tablesWithData = [];
      
      allTables.forEach(table => {
        try {
          const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
          if (count > 0) {
            console.warn(`[DB] ⚠️ В таблице ${table.name} осталось ${count} записей!`);
            tablesWithData.push({ name: table.name, count });
            totalRemaining += count;
          } else {
            totalCleared++;
          }
        } catch (e) {
          console.warn(`[DB] ⚠️ Не удалось проверить таблицу ${table.name}:`, e.message);
        }
      });
      
      console.log(`[DB] ✅ Проверка завершена: ${totalCleared} таблиц очищены полностью, проверено ${allTables.length} таблиц`);
      if (totalRemaining > 0) {
        console.error(`[DB] ❌ ВНИМАНИЕ: В базе данных осталось ${totalRemaining} записей в ${tablesWithData.length} таблицах:`);
        tablesWithData.forEach(t => console.error(`[DB]    - ${t.name}: ${t.count} записей`));
      } else {
        console.log(`[DB] ✅ Все данные успешно удалены из всех ${allTables.length} таблиц!`);
      }

      // Загружаем пресеты заново после очистки
      // ВАЖНО: сбрасываем кастомные названия/иконки/цвета категорий задач,
      // иначе UI продолжит брать старые значения из app_settings.task_categories_config.
      try {
        this.db.exec(`
          UPDATE app_settings
          SET task_categories_config = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = 'app_settings_1'
        `);
        console.log('[DB] Сброшен task_categories_config в app_settings');
      } catch (e) {
        console.warn('[DB] Не удалось сбросить task_categories_config:', e.message);
      }

      // Загружаем пресеты заново после очистки
      console.log('[DB] Загрузка пресетов после очистки...');
      this.loadPresets();

      console.log('[DB] ✅ База данных очищена и пресеты загружены');
      return true;
    } catch (e) {
      console.error('[DB] Ошибка очистки базы данных:', e);
      throw e;
    }
  }

  reloadPresets() {
    try {
      console.log('[DB] Перезагрузка пресетов...');
      
      // Очищаем только CFG таблицы (настройки), но не ACT данные
      this.clearCfgTables();
      
      // Загружаем пресеты заново
      this.loadPresets();
      
      console.log('[DB] Пресеты перезагружены');
      return true;
    } catch (e) {
      console.error('[DB] Ошибка перезагрузки пресетов:', e);
      throw e;
    }
  }
  
  /**
   * Очищает только CFG таблицы (настройки), сохраняя ACT данные
   */
  clearCfgTables() {
    try {
      console.log('[DB] Очистка CFG таблиц...');
      
      // Очищаем все CFG таблицы
      const cfgTables = [
        'cfg_tasks',
        'cfg_accounts',
        'cfg_income_categories',
        'cfg_expense_categories',
        'cfg_vows',
        'cfg_goals',
        'cfg_goal_stages',
        'cfg_goal_tasks',
        'cfg_diary_categories',
        'cfg_diary_moods',
        'cfg_leisure_tasks',
        'cfg_rituals_morning',
        'cfg_rituals_evening',
        'cfg_nutrition_products',
        'cfg_nutrition_presets',
        'cfg_ambient_music' // Фоновая музыка
      ];

      cfgTables.forEach(tableName => {
        try {
          const beforeCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          this.db.exec(`DELETE FROM ${tableName}`);
          const afterCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          console.log(`[DB] Очищена таблица: ${tableName} (было: ${beforeCount}, стало: ${afterCount})`);
        } catch (e) {
          // Игнорируем ошибки для несуществующих таблиц
          if (!e.message.includes('no such table')) {
            console.warn(`[DB] Предупреждение при очистке ${tableName}:`, e.message);
          }
        }
      });

      // Сбрасываем кастомный конфиг категорий задач в app_settings,
      // чтобы после "Пресеты" подтянулись дефолтные названия.
      try {
        this.db.exec(`
          UPDATE app_settings
          SET task_categories_config = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = 'app_settings_1'
        `);
        console.log('[DB] Сброшен task_categories_config в app_settings (clearCfgTables)');
      } catch (e) {
        console.warn('[DB] Не удалось сбросить task_categories_config в clearCfgTables:', e.message);
      }

      console.log('[DB] CFG таблицы очищены');
      return true;
    } catch (e) {
      console.error('[DB] Ошибка очистки CFG таблиц:', e);
      throw e;
    }
  }
  
  // Метод для очистки только транзакций (ACT данных)
  clearActData() {
    try {
      console.log('[DB] Очистка ACT данных (транзакции, записи дневника, ритуалы)...');
      
      // Очищаем все ACT таблицы
      const actTables = [
        'act_transactions',
        'act_diary_entries',
        'act_daily_plans',
        'act_goal_tasks',
        'act_tasks',
        'act_task_completions',
        'act_rituals_morning',
        'act_rituals_evening',
        'act_timer_sessions'
      ];

      actTables.forEach(tableName => {
        try {
          const beforeCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          this.db.exec(`DELETE FROM ${tableName}`);
          const afterCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
          console.log(`[DB] Очищена таблица: ${tableName} (было: ${beforeCount}, стало: ${afterCount})`);
        } catch (e) {
          // Игнорируем ошибки для несуществующих таблиц
          if (!e.message.includes('no such table')) {
            console.warn(`[DB] Предупреждение при очистке ${tableName}:`, e.message);
          }
        }
      });
      
      console.log('[DB] ACT данные очищены');
      return true;
    } catch (e) {
      console.error('[DB] Ошибка очистки ACT данных:', e);
      throw e;
    }
  }

  getBuiltInPresets() {
    // Встроенные пресеты на случай, если файл не загрузится
    // Это минимальный набор для работы приложения
    function generateId(prefix) {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return {
      ritualsMorning: [
        { id: generateId('r_morning'), title: 'Медитация', description: 'Практика осознанности', icon: 'brain', active: 1, level: 0 },
        { id: generateId('r_morning'), title: 'Зарядка', description: 'Физическая активность', icon: 'activity', active: 1, level: 1 },
        { id: generateId('r_morning'), title: 'Планирование', description: 'Структурирование дня', icon: 'calendar', active: 1, level: 2 }
      ],
      ritualsEvening: [
        { id: generateId('r_evening'), title: 'Благодарность', description: 'Практика благодарности', icon: 'book', active: 1, level: 0 },
        { id: generateId('r_evening'), title: 'Подготовка', description: 'Подготовка к завтрашнему дню', icon: 'moon', active: 1, level: 1 }
      ],
      vows: [
        { id: generateId('vow'), title: 'Трезвость', icon: 'ban', level: 0 }
      ],
      diaryCategories: [
        { id: generateId('dcat'), title: 'Развитие', icon: 'user', level: 0 },
        { id: generateId('dcat'), title: 'Работа', icon: 'briefcase', level: 1 }
      ],
      diaryMoods: [
        { id: generateId('mood'), level: 1, icon: 'frown' },
        { id: generateId('mood'), level: 3, icon: 'meh' },
        { id: generateId('mood'), level: 5, icon: 'smile' }
      ],
      accounts: [
        { id: generateId('acc'), title: 'Основной', icon: 'building', color: '#3b82f6', balance: 50000, level: 0 }
      ],
      incomeCategories: [
        { id: generateId('inc'), title: 'Зарплата', icon: 'briefcase', color: '#3b82f6', level: 0 }
      ],
      expenseCategories: [
        { id: generateId('exp'), title: 'Продукты', icon: 'shopping-cart', color: '#3b82f6', level: 0 }
      ],
      tasksRituals: [
        { id: generateId('t_ritual'), title: 'Утро', icon: 'sunrise', task_type: 'ritual', category_type: 'rituals', ritual_type: 'sunrise', level: 0 }
      ],
      tasksTime: [],
      tasksBody: [],
      tasksDeps: [],
      leisureFilling: [],
      leisureEscape: []
    };
  }

  // Методы для работы с целями
  getAllGoals() {
    return this.getAll('cfg_goals');
  }

  addGoal(data) {
    if (!data.id) {
      data.id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Устанавливаем level если не указан
    if (data.level === undefined) {
      const allGoals = this.getAllGoals();
      data.level = allGoals.length;
    }
    return this.create('cfg_goals', data);
  }

  updateGoal(id, data) {
    return this.update('cfg_goals', id, data);
  }

  setGoalCompletedAt(goalId, date) {
    try {
      if (date === null || date === undefined) {
        // Очищаем completed_at
        this.db.prepare(`
          UPDATE cfg_goals 
          SET completed_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(goalId);
      } else {
        // Устанавливаем completed_at
        this.db.prepare(`
          UPDATE cfg_goals 
          SET completed_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(date, goalId);
      }
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления completed_at для цели ${goalId}:`, e);
      throw e;
    }
  }

  setStageCompletedAt(stageId, date) {
    try {
      if (date === null || date === undefined) {
        this.db.prepare(`
          UPDATE cfg_goal_stages
          SET completed_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(stageId);
      } else {
        this.db.prepare(`
          UPDATE cfg_goal_stages
          SET completed_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(date, stageId);
      }
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления completed_at для этапа ${stageId}:`, e);
      throw e;
    }
  }

  setTaskCompletedAt(taskId, date) {
    try {
      if (date === null || date === undefined) {
        this.db.prepare(`
          UPDATE cfg_goal_tasks
          SET completed_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(taskId);
      } else {
        this.db.prepare(`
          UPDATE cfg_goal_tasks
          SET completed_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(date, taskId);
      }
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка обновления completed_at для задачи ${taskId}:`, e);
      throw e;
    }
  }

  deleteGoal(id) {
    try {
      // Каскадное удаление: сначала удаляем задачи, потом этапы, потом цель
      const stages = this.getStagesByGoal(id);
      for (const stage of stages) {
        this.deleteStage(stage.id);
      }
      return this.delete('cfg_goals', id);
    } catch (e) {
      console.error(`[DB] Ошибка удаления цели ${id}:`, e);
      throw e;
    }
  }

  moveGoal(id, direction) {
    try {
      const goal = this.getById('cfg_goals', id);
      if (!goal) return false;

      const goals = this.getAllGoals();
      const currentIndex = goals.findIndex(g => g.id === id);
      if (currentIndex === -1) return false;

      let targetIndex;
      if (direction === 'up') {
        if (currentIndex === 0) return false;
        targetIndex = currentIndex - 1;
      } else {
        if (currentIndex === goals.length - 1) return false;
        targetIndex = currentIndex + 1;
      }

      // Меняем местами level
      const tempLevel = goals[currentIndex].level;
      this.update('cfg_goals', goals[currentIndex].id, { level: goals[targetIndex].level });
      this.update('cfg_goals', goals[targetIndex].id, { level: tempLevel });

      return true;
    } catch (e) {
      console.error(`[DB] Ошибка перемещения цели ${id}:`, e);
      return false;
    }
  }

  // Методы для работы с этапами
  getStagesByGoal(goalId) {
    return this.getAll('cfg_goal_stages', { goal_id: goalId }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  addStage(data) {
    if (!data.id) {
      data.id = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Устанавливаем order_index если не указан
    if (data.order_index === undefined) {
      const stages = this.getStagesByGoal(data.goal_id);
      data.order_index = stages.length;
    }
    return this.create('cfg_goal_stages', data);
  }

  updateStage(id, data) {
    return this.update('cfg_goal_stages', id, data);
  }

  deleteStage(id) {
    try {
      // Каскадное удаление: сначала удаляем задачи этапа
      const tasks = this.getTasksByStage(id);
      for (const task of tasks) {
        this.deleteTask(task.id);
      }
      return this.delete('cfg_goal_stages', id);
    } catch (e) {
      console.error(`[DB] Ошибка удаления этапа ${id}:`, e);
      throw e;
    }
  }

  moveStage(id, direction) {
    try {
      const stage = this.getById('cfg_goal_stages', id);
      if (!stage) return false;

      const stages = this.getStagesByGoal(stage.goal_id);
      const currentIndex = stages.findIndex(s => s.id === id);
      if (currentIndex === -1) return false;

      let targetIndex;
      if (direction === 'up') {
        if (currentIndex === 0) return false;
        targetIndex = currentIndex - 1;
      } else {
        if (currentIndex === stages.length - 1) return false;
        targetIndex = currentIndex + 1;
      }

      // Меняем местами order_index
      const tempOrder = stages[currentIndex].order_index;
      this.update('cfg_goal_stages', stages[currentIndex].id, { order_index: stages[targetIndex].order_index });
      this.update('cfg_goal_stages', stages[targetIndex].id, { order_index: tempOrder });

      return true;
    } catch (e) {
      console.error(`[DB] Ошибка перемещения этапа ${id}:`, e);
      return false;
    }
  }

  // Методы для работы с задачами
  getTasksByStage(stageId) {
    return this.getAll('cfg_goal_tasks', { stage_id: stageId }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  addTask(data) {
    if (!data.id) {
      data.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Устанавливаем order_index если не указан
    if (data.order_index === undefined) {
      const tasks = this.getTasksByStage(data.stage_id);
      data.order_index = tasks.length;
    }
    return this.create('cfg_goal_tasks', data);
  }

  updateTask(id, data) {
    return this.update('cfg_goal_tasks', id, data);
  }

  deleteTask(id) {
    return this.delete('cfg_goal_tasks', id);
  }

  moveTask(id, direction) {
    try {
      const task = this.getById('cfg_goal_tasks', id);
      if (!task) return false;

      const tasks = this.getTasksByStage(task.stage_id);
      const currentIndex = tasks.findIndex(t => t.id === id);
      if (currentIndex === -1) return false;

      let targetIndex;
      if (direction === 'up') {
        if (currentIndex === 0) return false;
        targetIndex = currentIndex - 1;
      } else {
        if (currentIndex === tasks.length - 1) return false;
        targetIndex = currentIndex + 1;
      }

      // Меняем местами order_index
      const tempOrder = tasks[currentIndex].order_index;
      this.update('cfg_goal_tasks', tasks[currentIndex].id, { order_index: tasks[targetIndex].order_index });
      this.update('cfg_goal_tasks', tasks[targetIndex].id, { order_index: tempOrder });

      return true;
    } catch (e) {
      console.error(`[DB] Ошибка перемещения задачи ${id}:`, e);
      return false;
    }
  }

  // Методы для работы с прогрессом задач целей
  saveGoalTaskProgress(taskId, date, data) {
    try {
      const existing = this.db.prepare(`
        SELECT id FROM act_goal_tasks 
        WHERE task_id = ? AND date = ?
      `).get(taskId, date);

      const progressData = {
        task_id: taskId,
        date: date,
        completed: data.completed !== undefined ? (data.completed ? 1 : 0) : null,
        current_value: data.current_value !== undefined ? data.current_value : null,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Обновляем существующую запись
        const updateFields = [];
        const updateValues = [];
        
        if (progressData.completed !== null) {
          updateFields.push('completed = ?');
          updateValues.push(progressData.completed);
        }
        if (progressData.current_value !== null) {
          updateFields.push('current_value = ?');
          updateValues.push(progressData.current_value);
        }
        
        updateFields.push('updated_at = ?');
        updateValues.push(progressData.updated_at);
        updateValues.push(existing.id);

        this.db.prepare(`
          UPDATE act_goal_tasks 
          SET ${updateFields.join(', ')} 
          WHERE id = ?
        `).run(...updateValues);
      } else {
        // Создаем новую запись
        const id = `goal_task_progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.db.prepare(`
          INSERT INTO act_goal_tasks 
          (id, task_id, date, completed, current_value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          progressData.task_id,
          progressData.date,
          progressData.completed !== null ? progressData.completed : 0,
          progressData.current_value !== null ? progressData.current_value : null,
          progressData.updated_at,
          progressData.updated_at
        );
      }
      
      // Отмечаем изменения в БД
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }
      
      return true;
    } catch (e) {
      console.error('[DB] Ошибка сохранения прогресса задачи:', e);
      return false;
    }
  }

  getGoalTaskProgress(taskId, date) {
    try {
      return this.db.prepare(`
        SELECT * FROM act_goal_tasks 
        WHERE task_id = ? AND date = ?
      `).get(taskId, date);
    } catch (e) {
      console.error('[DB] Ошибка получения прогресса задачи:', e);
      return null;
    }
  }

  getGoalTasksProgressByDate(date) {
    try {
      return this.db.prepare(`
        SELECT * FROM act_goal_tasks 
        WHERE date = ?
      `).all(date);
    } catch (e) {
      console.error('[DB] Ошибка получения прогресса задач за дату:', e);
      return [];
    }
  }

  // Методы для работы с задачами категорий (act_tasks)
  ensureDayRecord(date) {
    try {
      const existing = this.db.prepare(`
        SELECT id FROM act_tasks WHERE date = ?
      `).get(date);

      if (!existing) {
        const id = `day_${date.replace(/-/g, '')}`;
        this.db.prepare(`
          INSERT INTO act_tasks (id, date, created_at, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(id, date);
        console.log(`[DB] Создана запись дня ${date}`);
      }
      return true;
    } catch (e) {
      console.error(`[DB] Ошибка создания записи дня ${date}:`, e);
      throw e;
    }
  }

  getTaskProgress(taskId, date) {
    try {
      // Получаем задачу из cfg_tasks для определения category_type, level и ritual_type
      const task = this.db.prepare(`
        SELECT category_type, level, task_type, config, ritual_type FROM cfg_tasks WHERE id = ?
      `).get(taskId);

      if (!task) {
        console.warn(`[DB] Задача ${taskId} не найдена в cfg_tasks`);
        return null;
      }

      const categoryType = task.category_type;
      const levelSlot = this.normalizeTaskLevelSlot(task.level);
      const columnName = levelSlot == null ? null : `${categoryType}_${levelSlot}_value`;
      const completionPercentColumnName = levelSlot == null ? null : `${categoryType}_${levelSlot}_completion_percent`;

      // Гарантируем наличие записи дня
      this.ensureDayRecord(date);

      // Получаем запись дня
      const dayRecord =
        columnName && completionPercentColumnName
          ? this.db.prepare(`
        SELECT ${columnName}, ${completionPercentColumnName} FROM act_tasks WHERE date = ?
      `).get(date)
          : this.db.prepare(`
        SELECT id FROM act_tasks WHERE date = ?
      `).get(date);

      if (!dayRecord) {
        // Если все еще нет записи, возвращаем дефолтные значения
        return {
          value: null,
          completed: 0,
          current_value: null,
          selected_list_item: null,
          completion_percent: 0
        };
      }

      const value = columnName ? dayRecord[columnName] : null;
      const completionPercent = completionPercentColumnName ? dayRecord[completionPercentColumnName] : null;

      // Для обратной совместимости возвращаем объект с полями
      const result = {
        value: value,
        completed: (value === 1 || value === 1.0) ? 1 : 0,
        current_value: value !== null && value !== undefined ? value : null,
        selected_list_item: null, // Будет вычислено при необходимости
        completion_percent: completionPercent !== null && completionPercent !== undefined ? completionPercent : 0
      };

      // Для list задач нужно получить название элемента по индексу
      if (task.task_type === 'list' && value !== null && value !== undefined && task.config) {
        try {
          const config = JSON.parse(task.config);
          if (config.items && Array.isArray(config.items) && config.items[value]) {
            const item = config.items[value];
            result.selected_list_item = item.title || item.name || '';
            result.completion_percent = item.percent || item.percentage || 0;
          }
        } catch (e) {
          console.error(`[DB] Ошибка парсинга config для задачи ${taskId}:`, e);
        }
      }

      // Для checkbox задач вычисляем процент на основе value, если completion_percent не сохранен
      if (task.task_type === 'checkbox' && (completionPercent === null || completionPercent === undefined || completionPercent === 0)) {
        result.completion_percent = (value === 1 || value === 1.0) ? 100 : 0;
        // Обновляем значение в БД, если оно не совпадает
        if (completionPercentColumnName && dayRecord && dayRecord[completionPercentColumnName] !== result.completion_percent) {
          this.saveTaskProgress(taskId, date, { completed: value === 1 || value === 1.0 ? 1 : 0 });
        }
      }

      // Для ritual задач вычисляем процент из выполнения ритуалов
      if (task.task_type === 'ritual' && task.ritual_type) {
        const ritualProgress = this.calculateRitualProgress(task.ritual_type, date);
        result.completion_percent = ritualProgress;
        // Обновляем значение в БД
        if (value !== ritualProgress) {
          this.saveTaskProgress(taskId, date, { completion_percent: ritualProgress });
        }
      }

      return result;
    } catch (e) {
      console.error(`[DB] Ошибка получения прогресса задачи ${taskId} за ${date}:`, e);
      return null;
    }
  }

  saveTaskProgress(taskId, date, data) {
    try {
      // Получаем задачу из cfg_tasks для определения category_type, level и task_type
      const task = this.db.prepare(`
        SELECT category_type, level, task_type, config, cfg_target_value FROM cfg_tasks WHERE id = ?
      `).get(taskId);

      if (!task) {
        console.error(`[DB] Задача ${taskId} не найдена в cfg_tasks`);
        throw new Error(`Задача ${taskId} не найдена`);
      }

      const categoryType = task.category_type;
      const levelSlot = this.normalizeTaskLevelSlot(task.level);
      const taskType = task.task_type;
      const columnName = levelSlot == null ? null : `${categoryType}_${levelSlot}_value`;
      const completionPercentColumnName = levelSlot == null ? null : `${categoryType}_${levelSlot}_completion_percent`;

      // Преобразуем data в числовое значение по типу задачи
      let numericValue = null;
      let completionPercent = null;

      if (taskType === 'checkbox') {
        // checkbox: 1.0 (выполнено) или 0.0 (не выполнено)
        // Проверяем data.completed как число (1 или 0) или булево значение
        if (data.completed !== undefined) {
          numericValue = (data.completed === 1 || data.completed === true) ? 1.0 : 0.0;
        } else {
          numericValue = 0.0;
        }
      } else if (taskType === 'number') {
        // number: текущее числовое значение
        numericValue = data.current_value !== undefined ? data.current_value : null;
      } else if (taskType === 'list') {
        // list: индекс элемента (найти по selected_list_item)
        if (data.selected_list_item !== undefined && task.config) {
          try {
            const config = JSON.parse(task.config);
            if (config.items && Array.isArray(config.items)) {
              const index = config.items.findIndex(item => 
                (item.title || item.name || '') === data.selected_list_item
              );
              if (index >= 0) {
                numericValue = index;
              } else {
                console.warn(`[DB] Элемент списка "${data.selected_list_item}" не найден для задачи ${taskId}`);
                numericValue = 0; // По умолчанию первый элемент
              }
            }
          } catch (e) {
            console.error(`[DB] Ошибка парсинга config для задачи ${taskId}:`, e);
            numericValue = 0;
          }
        } else {
          // Если индекс передан напрямую
          numericValue = data.value !== undefined ? data.value : null;
        }
      } else if (taskType === 'timer') {
        // timer: вычисляем процент из act_timer_sessions
        const targetHours = task.cfg_target_hours || 0;
        if (targetHours === 0) {
          numericValue = 0;
        } else {
          const totalSeconds = this.getTaskTimerTotal(date, task.id) || 0;
          const currentHours = totalSeconds / 3600;
          // Вычисляем процент выполнения (0-100)
          numericValue = currentHours >= targetHours ? 100 : Math.min(100, (currentHours / targetHours) * 100);
        }
      } else if (taskType === 'ritual') {
        // ritual: вычисляем процент из выполнения ритуалов соответствующего типа
        // Получаем ritual_type из задачи
        const ritualTask = this.db.prepare(`
          SELECT ritual_type FROM cfg_tasks WHERE id = ?
        `).get(taskId);
        if (ritualTask && ritualTask.ritual_type) {
          numericValue = this.calculateRitualProgress(ritualTask.ritual_type, date);
        } else {
          numericValue = data.completion_percent !== undefined ? data.completion_percent : null;
        }
      }

      // Вычисляем completion_percent для всех типов задач
      if (taskType === 'checkbox') {
        completionPercent = numericValue === 1.0 ? 100 : 0;
      } else if (taskType === 'number') {
        const targetValue = task.cfg_target_value || 0;
        if (targetValue > 0 && numericValue !== null) {
          completionPercent = Math.min(100, (numericValue / targetValue) * 100);
        } else {
          completionPercent = 0;
        }
      } else if (taskType === 'timer') {
        // Для timer completion_percent уже вычислен в numericValue
        completionPercent = numericValue;
      } else if (taskType === 'list') {
        // Для list берем completion_percent из data или вычисляем из config
        if (data.completion_percent !== undefined) {
          completionPercent = data.completion_percent;
        } else if (task.config && numericValue !== null) {
          try {
            const config = JSON.parse(task.config);
            if (config.items && Array.isArray(config.items) && config.items[numericValue] !== undefined) {
              completionPercent = config.items[numericValue].percent || config.items[numericValue].percentage || 0;
            }
          } catch (e) {
            completionPercent = 0;
          }
        }
      } else if (taskType === 'ritual') {
        // Для ritual completion_percent уже вычислен
        completionPercent = numericValue;
      }
      
      // Если completion_percent передан напрямую в data, используем его
      if (data.completion_percent !== undefined) {
        completionPercent = data.completion_percent;
      }

      // Гарантируем наличие записи дня
      this.ensureDayRecord(date);

      // Обновляем нужные столбцы
      if (columnName && completionPercentColumnName) {
        const stmt = this.db.prepare(`
          UPDATE act_tasks 
          SET ${columnName} = ?, ${completionPercentColumnName} = ?, updated_at = CURRENT_TIMESTAMP
          WHERE date = ?
        `);
        const result = stmt.run(numericValue, completionPercent, date);
        
        if (result.changes === 0) {
          console.warn(`[DB] Предупреждение: не удалось обновить ${columnName} для ${date}. Возможно, запись не существует.`);
        }
      }

      console.log(`[DB] Прогресс задачи ${taskId} (${categoryType}_${levelSlot ?? 'dynamic'}) сохранен для ${date}: value=${numericValue}, completion_percent=${completionPercent}`);

      // Пересчитываем и сохраняем процент категории
      const categoryPercent = this.calculateCategoryProgress(categoryType, date);
      this.saveCategoryProgress(categoryType, date, categoryPercent);
      // Обновляем все зависимые агрегаты дня (очки, проценты, накопление).
      this.recalculateDerivedProgressForDate(date);

      // Отмечаем изменения в БД (после сохранения прогресса категории)
      const tracker = getSettingsChangeTracker();
      if (tracker && tracker.markChanged) {
        tracker.markChanged();
      }

      return true;
    } catch (e) {
      console.error(`[DB] Ошибка сохранения прогресса задачи ${taskId}:`, e);
      throw e;
    }
  }

  saveCategoryProgress(categoryType, date, percent) {
    try {
      const columnName = `${categoryType}_percent`;
      
      // Проверяем существование записи
      const existing = this.db.prepare(`
        SELECT id FROM act_task_completions WHERE date = ?
      `).get(date);

      if (existing) {
        // Обновляем существующую запись
        this.db.prepare(`
          UPDATE act_task_completions 
          SET ${columnName} = ?, updated_at = CURRENT_TIMESTAMP
          WHERE date = ?
        `).run(percent, date);
      } else {
        // Создаем новую запись
        const id = `comp_${date.replace(/-/g, '')}`;
        const stmt = this.db.prepare(`
          INSERT INTO act_task_completions (id, date, ${columnName}, created_at, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        stmt.run(id, date, percent);
      }
    } catch (e) {
      console.error(`[DB] Ошибка сохранения прогресса категории ${categoryType}:`, e);
    }
  }

  getTasksByCategory(categoryType) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM cfg_tasks 
        WHERE category_type = ? 
        ORDER BY level ASC
      `);
      return stmt.all(categoryType);
    } catch (e) {
      console.error(`[DB] Ошибка получения задач категории ${categoryType}:`, e);
      return [];
    }
  }

  calculateRitualProgress(ritualType, date) {
    try {
      // Определяем таблицы в зависимости от типа ритуала
      let cfgTable, actTable;
      if (ritualType === 'sunrise') {
        cfgTable = 'cfg_rituals_morning';
        actTable = 'act_rituals_morning';
      } else if (ritualType === 'sunset') {
        cfgTable = 'cfg_rituals_evening';
        actTable = 'act_rituals_evening';
      } else {
        // Для других типов возвращаем 0
        return 0;
      }

      // Получаем все активные ритуалы этого типа
      const rituals = this.db.prepare(`
        SELECT id FROM ${cfgTable} WHERE active = 1
      `).all();

      if (rituals.length === 0) return 0;

      // Получаем выполненные ритуалы за день
      const completedRituals = this.db.prepare(`
        SELECT ritual_id FROM ${actTable} 
        WHERE date = ? AND completed = 1
      `).all(date);

      const completedCount = completedRituals.length;
      const totalCount = rituals.length;

      // Вычисляем процент: (выполнено / всего) * 100
      return totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    } catch (e) {
      console.error(`[DB] Ошибка вычисления прогресса ритуалов ${ritualType}:`, e);
      return 0;
    }
  }

  getCategoryProgress(categoryType, date) {
    try {
      const columnName = `${categoryType}_percent`;
      const result = this.db.prepare(`
        SELECT ${columnName} FROM act_task_completions WHERE date = ?
      `).get(date);

      if (result && result[columnName] !== null && result[columnName] !== undefined) {
        return result[columnName];
      }

      // Если записи нет, вычисляем и сохраняем
      return this.calculateCategoryProgress(categoryType, date);
    } catch (e) {
      console.error(`[DB] Ошибка получения прогресса категории ${categoryType}:`, e);
      // В случае ошибки вычисляем заново
      return this.calculateCategoryProgress(categoryType, date);
    }
  }

  getCategoryProgresses(date) {
    const categories = ['rituals', 'time', 'body', 'deps'];
    const out = {};
    for (const categoryType of categories) {
      out[categoryType] = this.calculateCategoryProgress(categoryType, date);
    }
    return out;
  }

  calculateCategoryProgress(categoryType, date) {
    try {
      const tasks = this.getTasksByCategory(categoryType);
      if (tasks.length === 0) return 0;

      // Гарантируем наличие записи дня (особенно важно для timer задач)
      this.ensureDayRecord(date);

      // Получаем запись дня из act_tasks
      const dayRecord = this.db.prepare(`
        SELECT rituals_0_value, rituals_1_value, rituals_2_value,
               time_0_value, time_1_value, time_2_value,
               body_0_value, body_1_value, body_2_value,
               deps_0_value, deps_1_value, deps_2_value
        FROM act_tasks WHERE date = ?
      `).get(date);
      const nutritionTotals = this.getDailyNutrition(date);
      const nutritionSettings = this.getAppSettings();
      const nutritionTargetCalories = Number(nutritionSettings?.nutrition_target_calories || 0);

      let totalProgress = 0;
      let tasksWithProgress = 0;

      for (const task of tasks) {
        const levelSlot = this.normalizeTaskLevelSlot(task.level);
        const columnName = levelSlot == null ? null : `${categoryType}_${levelSlot}_value`;
        const value = dayRecord && columnName ? dayRecord[columnName] : null;
        
        let taskProgress = 0;

        // Timer задачи всегда вычисляются напрямую из act_timer_sessions
        if (task.task_type === 'timer') {
          const targetHours = task.cfg_target_hours || 0;
          if (targetHours === 0) {
            taskProgress = 0;
          } else {
            // Берем данные напрямую из act_timer_sessions
            const totalSeconds = this.getTaskTimerTotal(date, task.id) || 0;
            const currentHours = totalSeconds / 3600;
            // Вычисляем промежуточный процент (0-100), учитывая перевыполнение как 100%
            // Промежуточные значения (например, 1ч из 2ч = 50%) учитываются правильно
            if (targetHours > 0) {
              taskProgress = currentHours >= targetHours ? 100 : (currentHours / targetHours) * 100;
            } else {
              taskProgress = 0;
            }
          }
          // Сохраняем вычисленный процент в act_tasks для удобства просмотра в БД
          // Также обновляем completion_percent для правильного отображения
          if (columnName) {
            const completionPercentColumnName = `${categoryType}_${levelSlot}_completion_percent`;
            this.db.prepare(`
              UPDATE act_tasks SET ${columnName} = ?, ${completionPercentColumnName} = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?
            `).run(taskProgress, taskProgress, date);
          }
        } else if (task.task_type === 'checkbox') {
          // checkbox: только 0 или 100 (нет промежуточных значений)
          if (value !== null && value !== undefined) {
            taskProgress = value === 1 ? 100 : 0;
          }
        } else if (task.task_type === 'number') {
          // number: вычисляем промежуточный процент (0-100)
          if (value !== null && value !== undefined) {
            const targetValue = task.cfg_target_value || 0;
            if (targetValue === 0) {
              taskProgress = 0;
            } else {
              taskProgress = Math.min(100, (value / targetValue) * 100);
            }
          }
        } else if (task.task_type === 'list') {
          // list: процент из config.items[index].percent
          if (value !== null && value !== undefined && task.config) {
            try {
              const config = JSON.parse(task.config);
              if (config.items && Array.isArray(config.items) && config.items[value] !== undefined) {
                const item = config.items[value];
                taskProgress = item.percent || item.percentage || 0;
              }
            } catch (e) {
              console.error(`[DB] Ошибка парсинга config для задачи ${task.id}:`, e);
            }
          }
        } else if (task.task_type === 'nutrition') {
          // nutrition: считаем напрямую от тех же дневных КБЖУ, что и карточка питания
          const calories = nutritionTotals?.calories || 0;
          if (nutritionTargetCalories > 0) {
            taskProgress = Math.min(100, (calories / nutritionTargetCalories) * 100);
          } else {
            taskProgress = calories > 0 ? 100 : 0;
          }
          if (columnName) {
            const completionPercentColumnName = `${categoryType}_${levelSlot}_completion_percent`;
            this.db.prepare(`
              UPDATE act_tasks SET ${columnName} = ?, ${completionPercentColumnName} = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?
            `).run(taskProgress, taskProgress, date);
          }
        } else if (task.task_type === 'ritual') {
          // ritual: вычисляем процент из выполнения ритуалов соответствующего типа
          if (task.ritual_type) {
            taskProgress = this.calculateRitualProgress(task.ritual_type, date);
            // Обновляем значение в БД, если оно изменилось
            if (value !== taskProgress) {
              if (columnName) {
                const completionPercentColumnName = `${categoryType}_${levelSlot}_completion_percent`;
                this.db.prepare(`
                  UPDATE act_tasks SET ${columnName} = ?, ${completionPercentColumnName} = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?
                `).run(taskProgress, taskProgress, date);
              }
            }
          } else if (value !== null && value !== undefined) {
            taskProgress = value || 0;
          }
        }

        // Учитываем все задачи, даже с промежуточными значениями (0 < progress < 100)
        totalProgress += taskProgress;
        tasksWithProgress++;
      }

      const averageProgress = tasksWithProgress > 0 ? totalProgress / tasksWithProgress : 0;
      
      // Сохраняем результат в act_task_completions
      this.saveCategoryProgress(categoryType, date, averageProgress);

      return averageProgress;
    } catch (e) {
      console.error(`[DB] Ошибка расчета прогресса категории ${categoryType}:`, e);
      return 0;
    }
  }

  close() {
    try {
      if (this.db) {
        this.db.close();
        console.log('[DB] База данных закрыта');
      }
    } catch (e) {
      console.error('[DB] Ошибка закрытия базы данных:', e);
    }
  }
  
  /**
   * Получает информацию о базе данных для отладки
   * @returns {Object} Информация о БД
   */
  getInfo() {
    try {
      const stats = {
        path: this.dbPath,
        tables: []
      };
      
      // Получаем список всех таблиц
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();
      
      stats.tables = tables.map(row => {
        const tableName = row.name;
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
        return {
          name: tableName,
          rowCount: count.count
        };
      });
      
      return stats;
    } catch (e) {
      console.error('[DB] Ошибка получения информации о БД:', e);
      return {
        path: this.dbPath,
        error: e.message
      };
    }
  }

  // Методы для работы с настройками приложения
  getAppSettings() {
    try {
      // Проверяем и добавляем колонки, если их нет (миграция)
      this.migrateAppSettingsColumns();
      
      const stmt = this.db.prepare(`SELECT * FROM app_settings LIMIT 1`);
      const settings = stmt.get();
      
      if (!settings) {
        // Создаем настройки по умолчанию
        const defaultSettings = {
          id: 'app_settings_1',
          currency: 'RUB',
          points_start_date: null,
          points_open_hours: 48,
          icon_theme: 'minimal',
          bottom_nav_show_labels: 0,
          devtools_tab_enabled: 0,
          page_transitions_enabled: 1,
          app_scale: 1.0,
          ambient_default_timer: null,
          ambient_default_stopwatch: null,
          ambient_default_break: null,
          gradient_intensity: 1,
          background_animation_type: 'glow',
          nutrition_target_calories: 0,
          nutrition_target_proteins: 0,
          nutrition_target_fats: 0,
          nutrition_target_carbs: 0,
          tasks_hide_completion_percent: 0,
          category_percent_highlight_enabled: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.saveAppSettings(defaultSettings);
        return defaultSettings;
      }
      
      // Нормализуем значения питания: null -> 0
      if (settings.nutrition_target_calories === null || settings.nutrition_target_calories === undefined) {
        settings.nutrition_target_calories = 0;
      }
      if (settings.nutrition_target_proteins === null || settings.nutrition_target_proteins === undefined) {
        settings.nutrition_target_proteins = 0;
      }
      if (settings.nutrition_target_fats === null || settings.nutrition_target_fats === undefined) {
        settings.nutrition_target_fats = 0;
      }
      if (settings.nutrition_target_carbs === null || settings.nutrition_target_carbs === undefined) {
        settings.nutrition_target_carbs = 0;
      }
      if (settings.tasks_hide_completion_percent === null || settings.tasks_hide_completion_percent === undefined) {
        settings.tasks_hide_completion_percent = 0;
      }
      if (settings.category_percent_highlight_enabled === null || settings.category_percent_highlight_enabled === undefined) {
        settings.category_percent_highlight_enabled = 1;
      }
      
      return settings;
    } catch (e) {
      console.error('[DB] Ошибка получения настроек приложения:', e);
      return null;
    }
  }

  saveAppSettings(settings) {
    try {
      // Проверяем и добавляем колонки, если их нет (миграция)
      this.migrateAppSettingsColumns();
      
      // Убеждаемся, что есть id
      if (!settings.id) {
        settings.id = 'app_settings_1';
      }

      // Не затирать JSON видимости секций, если в объекте поля нет (старые ссылки на settings)
      if (settings.page_sections_visibility === undefined) {
        try {
          const row = this.db.prepare('SELECT page_sections_visibility FROM app_settings WHERE id = ?').get(settings.id);
          if (row && row.page_sections_visibility != null) {
            settings.page_sections_visibility = row.page_sections_visibility;
          }
        } catch (_) {
          /* ignore */
        }
      }
      
      // Обновляем updated_at
      settings.updated_at = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO app_settings 
        (id, currency, points_start_date, points_open_hours, icon_theme, bottom_nav_show_labels, devtools_tab_enabled, page_transitions_enabled, app_scale, ambient_default_timer, ambient_default_stopwatch, ambient_default_break, shadow_level, gradient_intensity, background_animation_type, nutrition_initial_weight, nutrition_target_weight, nutrition_target_calories, nutrition_target_proteins, nutrition_target_fats, nutrition_target_carbs, task_categories_config, bottom_nav_pages_order, tasks_hide_completion_percent, category_percent_highlight_enabled, page_sections_visibility, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM app_settings WHERE id = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
      `);
      
      const taskCategoriesConfig = settings.task_categories_config != null
        ? (typeof settings.task_categories_config === 'string' ? settings.task_categories_config : JSON.stringify(settings.task_categories_config))
        : null;
      const bottomNavPagesOrder = settings.bottom_nav_pages_order != null
        ? (typeof settings.bottom_nav_pages_order === 'string' ? settings.bottom_nav_pages_order : JSON.stringify(settings.bottom_nav_pages_order))
        : null;
      const pageSectionsVisibility = settings.page_sections_visibility != null
        ? (typeof settings.page_sections_visibility === 'string'
          ? settings.page_sections_visibility
          : JSON.stringify(settings.page_sections_visibility))
        : null;

      stmt.run(
        settings.id,
        settings.currency || 'RUB',
        settings.points_start_date || null,
        settings.points_open_hours !== undefined && settings.points_open_hours !== null ? settings.points_open_hours : 48,
        settings.icon_theme || 'minimal',
        settings.bottom_nav_show_labels !== undefined && settings.bottom_nav_show_labels !== null ? settings.bottom_nav_show_labels : 0,
        settings.devtools_tab_enabled !== undefined && settings.devtools_tab_enabled !== null ? settings.devtools_tab_enabled : 0,
        settings.page_transitions_enabled !== undefined && settings.page_transitions_enabled !== null ? settings.page_transitions_enabled : 1,
        settings.app_scale !== undefined && settings.app_scale !== null ? settings.app_scale : 1.0,
        settings.ambient_default_timer || null,
        settings.ambient_default_stopwatch || null,
        settings.ambient_default_break || null,
        settings.shadow_level || 'subtle',
        settings.gradient_intensity !== undefined && settings.gradient_intensity !== null ? settings.gradient_intensity : 1,
        settings.background_animation_type || 'glow',
        settings.nutrition_initial_weight !== undefined && settings.nutrition_initial_weight !== null ? settings.nutrition_initial_weight : 0,
        settings.nutrition_target_weight !== undefined && settings.nutrition_target_weight !== null ? settings.nutrition_target_weight : 0,
        settings.nutrition_target_calories !== undefined && settings.nutrition_target_calories !== null ? settings.nutrition_target_calories : 0,
        settings.nutrition_target_proteins !== undefined && settings.nutrition_target_proteins !== null ? settings.nutrition_target_proteins : 0,
        settings.nutrition_target_fats !== undefined && settings.nutrition_target_fats !== null ? settings.nutrition_target_fats : 0,
        settings.nutrition_target_carbs !== undefined && settings.nutrition_target_carbs !== null ? settings.nutrition_target_carbs : 0,
        taskCategoriesConfig,
        bottomNavPagesOrder,
        settings.tasks_hide_completion_percent !== undefined && settings.tasks_hide_completion_percent !== null ? settings.tasks_hide_completion_percent : 0,
        settings.category_percent_highlight_enabled !== undefined && settings.category_percent_highlight_enabled !== null ? settings.category_percent_highlight_enabled : 1,
        pageSectionsVisibility,
        settings.id
      );
      
      console.log('[DB] Настройки приложения сохранены');
      return true;
    } catch (e) {
      console.error('[DB] Ошибка сохранения настроек приложения:', e);
      throw e;
    }
  }

  migrateAppSettingsColumns() {
    try {
      const tableInfo = this.db.prepare(`PRAGMA table_info(app_settings)`).all();
      const columnNames = tableInfo.map(col => col.name);
      
      // Добавляем points_start_date, если нет
      if (!columnNames.includes('points_start_date')) {
        console.log('[DB] Добавляем колонку points_start_date в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN points_start_date TEXT`);
      }
      
      // Добавляем points_open_hours, если нет
      if (!columnNames.includes('points_open_hours')) {
        console.log('[DB] Добавляем колонку points_open_hours в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN points_open_hours INTEGER DEFAULT 48`);
      }
      
      // Добавляем icon_theme, если нет
      if (!columnNames.includes('icon_theme')) {
        console.log('[DB] Добавляем колонку icon_theme в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN icon_theme TEXT DEFAULT 'minimal'`);
      }
      
      // Добавляем bottom_nav_show_labels, если нет
      if (!columnNames.includes('bottom_nav_show_labels')) {
        console.log('[DB] Добавляем колонку bottom_nav_show_labels в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN bottom_nav_show_labels INTEGER DEFAULT 0`);
      }
      
      // Добавляем настройки музыки по умолчанию
      if (!columnNames.includes('ambient_default_timer')) {
        console.log('[DB] Добавляем колонку ambient_default_timer в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN ambient_default_timer INTEGER`);
      }
      if (!columnNames.includes('ambient_default_stopwatch')) {
        console.log('[DB] Добавляем колонку ambient_default_stopwatch в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN ambient_default_stopwatch INTEGER`);
      }
      if (!columnNames.includes('ambient_default_break')) {
        console.log('[DB] Добавляем колонку ambient_default_break в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN ambient_default_break INTEGER`);
      }
      
      // Добавляем shadow_level, если нет
      if (!columnNames.includes('shadow_level')) {
        console.log('[DB] Добавляем колонку shadow_level в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN shadow_level TEXT DEFAULT 'subtle'`);
      }
      if (!columnNames.includes('gradient_intensity')) {
        console.log('[DB] Добавляем колонку gradient_intensity в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN gradient_intensity REAL DEFAULT 1`);
      }
      
      // Добавляем настройки питания
      if (!columnNames.includes('nutrition_initial_weight')) {
        console.log('[DB] Добавляем колонку nutrition_initial_weight в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN nutrition_initial_weight REAL`);
      }
      if (!columnNames.includes('nutrition_target_weight')) {
        console.log('[DB] Добавляем колонку nutrition_target_weight в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN nutrition_target_weight REAL`);
      }
      if (!columnNames.includes('nutrition_target_calories')) {
        console.log('[DB] Добавляем колонку nutrition_target_calories в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN nutrition_target_calories REAL`);
      }
      if (!columnNames.includes('nutrition_target_proteins')) {
        console.log('[DB] Добавляем колонку nutrition_target_proteins в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN nutrition_target_proteins REAL DEFAULT 0`);
      }
      if (!columnNames.includes('nutrition_target_fats')) {
        console.log('[DB] Добавляем колонку nutrition_target_fats в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN nutrition_target_fats REAL DEFAULT 0`);
      }
      if (!columnNames.includes('nutrition_target_carbs')) {
        console.log('[DB] Добавляем колонку nutrition_target_carbs в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN nutrition_target_carbs REAL DEFAULT 0`);
      }
      
      // Добавляем devtools_tab_enabled, если нет
      if (!columnNames.includes('devtools_tab_enabled')) {
        console.log('[DB] Добавляем колонку devtools_tab_enabled в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN devtools_tab_enabled INTEGER DEFAULT 0`);
      }
      
      // Добавляем app_scale, если нет
      if (!columnNames.includes('app_scale')) {
        console.log('[DB] Добавляем колонку app_scale в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN app_scale REAL DEFAULT 1.0`);
      }

      // Добавляем page_transitions_enabled, если нет
      if (!columnNames.includes('page_transitions_enabled')) {
        console.log('[DB] Добавляем колонку page_transitions_enabled в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN page_transitions_enabled INTEGER DEFAULT 1`);
      }

      // Добавляем task_categories_config (JSON: названия, иконки, цвета категорий задач)
      if (!columnNames.includes('task_categories_config')) {
        console.log('[DB] Добавляем колонку task_categories_config в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN task_categories_config TEXT`);
      }

      // Добавляем bottom_nav_pages_order (JSON: порядок страниц в нижнем меню)
      if (!columnNames.includes('bottom_nav_pages_order')) {
        console.log('[DB] Добавляем колонку bottom_nav_pages_order в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN bottom_nav_pages_order TEXT`);
      }

      // Скрывать процент выполнения на карточках задач (0 = показывать, 1 = скрыть)
      if (!columnNames.includes('tasks_hide_completion_percent')) {
        console.log('[DB] Добавляем колонку tasks_hide_completion_percent в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN tasks_hide_completion_percent INTEGER DEFAULT 0`);
      }

      if (!columnNames.includes('category_percent_highlight_enabled')) {
        console.log('[DB] Добавляем колонку category_percent_highlight_enabled в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN category_percent_highlight_enabled INTEGER DEFAULT 1`);
      }

      if (!columnNames.includes('page_sections_visibility')) {
        console.log('[DB] Добавляем колонку page_sections_visibility в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN page_sections_visibility TEXT`);
      }

      // Тип анимации фона (0 = выключена, 'glow', 'gradient-shift', 'flicker', 'particles')
      if (!columnNames.includes('background_animation_type')) {
        console.log('[DB] Добавляем колонку background_animation_type в app_settings...');
        this.db.exec(`ALTER TABLE app_settings ADD COLUMN background_animation_type TEXT DEFAULT 'glow'`);
      }
    } catch (e) {
      console.warn('[DB] Ошибка миграции колонок app_settings:', e);
    }
  }

  // Метод для определения группы пресета на основе продуктов в нем
  inferPresetGroupFromProducts(preset) {
    if (!preset || !preset.products) {
      return null;
    }

    try {
      const products = typeof preset.products === 'string' 
        ? JSON.parse(preset.products) 
        : preset.products;

      if (!Array.isArray(products) || products.length === 0) {
        return null;
      }

      // Собираем группы всех продуктов в пресете
      const groupCounts = {};
      
      products.forEach(({ product_id }) => {
        if (product_id) {
          const product = this.getById('cfg_nutrition_products', product_id);
          if (product && product.group) {
            groupCounts[product.group] = (groupCounts[product.group] || 0) + 1;
          }
        }
      });

      // Если есть группы, возвращаем самую частую
      if (Object.keys(groupCounts).length > 0) {
        const mostFrequentGroup = Object.entries(groupCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        return mostFrequentGroup;
      }

      // Если не удалось определить по продуктам, пробуем по названию пресета
      if (preset.title) {
        return this.inferGroupFromColor(null, preset.title);
      }

      return null;
    } catch (e) {
      console.warn('[DB] Ошибка определения группы пресета:', e);
      return null;
    }
  }

  // Метод для автоматического присвоения группы всем пресетам без группы
  assignGroupsToPresetsWithoutGroup() {
    try {
      const presets = this.getAll('cfg_nutrition_presets') || [];
      let updated = 0;
      const withoutGroup = [];

      presets.forEach(preset => {
        if (!preset.group) {
          withoutGroup.push(preset);
          const inferredGroup = this.inferPresetGroupFromProducts(preset);
          if (inferredGroup) {
            this.update('cfg_nutrition_presets', preset.id, {
              group: inferredGroup
            });
            updated++;
            console.log(`[DB] ✅ Пресету "${preset.title}" (${preset.id}) присвоена группа: ${inferredGroup}`);
          } else {
            console.warn(`[DB] ⚠️ Не удалось определить группу для пресета "${preset.title}" (${preset.id})`);
          }
        }
      });

      if (withoutGroup.length > 0) {
        if (updated > 0) {
          console.log(`[DB] 📊 Обновлено пресетов без группы: ${updated} из ${withoutGroup.length}`);
        } else {
          console.warn(`[DB] ⚠️ Найдено пресетов без группы: ${withoutGroup.length}`);
          withoutGroup.forEach(p => {
            console.warn(`[DB]   - "${p.title}" (${p.id})`);
          });
        }
      }

      return { total: withoutGroup.length, updated };
    } catch (e) {
      console.error('[DB] Ошибка присвоения групп пресетам:', e);
      return { total: 0, updated: 0 };
    }
  }
}

// Singleton паттерн - гарантирует один экземпляр БД
let dbInstance = null;
let dbInstanceError = null;
let dbInitializationAttempted = false;

/**
 * Получает экземпляр базы данных (Singleton)
 * @returns {DB|null} Экземпляр базы данных или null при ошибке
 */
function getDB() {
  // Если уже есть успешный экземпляр, возвращаем его
  if (dbInstance) {
    return dbInstance;
  }
  
  // Если уже была попытка инициализации с ошибкой, не пытаемся снова
  if (dbInitializationAttempted && dbInstanceError) {
    console.warn('[DB] Повторная попытка получения БД после ошибки. Последняя ошибка:', dbInstanceError.message);
    return null;
  }
  
  // Пытаемся создать новый экземпляр
  dbInitializationAttempted = true;
  try {
    dbInstance = new DB();
    dbInstanceError = null; // Сбрасываем ошибку при успехе
    console.log('[DB] ✅ Экземпляр БД создан успешно');
    console.log('[DB] 📍 Путь к БД:', dbInstance.dbPath);
    return dbInstance;
  } catch (e) {
    console.error('[DB] ❌ Ошибка создания экземпляра БД');
    console.error('[DB] Тип ошибки:', e.constructor.name);
    console.error('[DB] Сообщение:', e.message);
    if (e.stack) {
      console.error('[DB] Stack:', e.stack);
    }
    dbInstanceError = e;
    return null;
  }
}

/**
 * Сбрасывает singleton (для тестирования)
 */
function resetDB() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.warn('[DB] Ошибка при закрытии БД:', e.message);
    }
  }
  dbInstance = null;
  dbInstanceError = null;
  dbInitializationAttempted = false;
  console.log('[DB] Singleton сброшен');
}

// Экспортируем функцию getDB как основной экспорт
module.exports = getDB;

// Экспортируем дополнительные функции для отладки
module.exports.resetDB = resetDB;
module.exports.DB = DB; // Экспорт класса для тестирования
