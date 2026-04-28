export type AuraAppSettings = Record<string, unknown> | null;

/** Строка из SQLite без жёсткой схемы в типах renderer. */
export type AuraRow = Record<string, unknown>;

/** Результат `Database.getTaskProgress` для строки дня. */
export type AuraTaskProgress = {
  value: unknown;
  completed: number;
  current_value: unknown;
  selected_list_item: string | null;
  completion_percent: number;
};

export interface AuraDatabase {
  getAppSettings: () => AuraAppSettings;
  getTransactions: (date: string) => AuraRow[];
  /** Все транзакции или с фильтром (как в main Database). */
  getAllTransactions: (filters?: AuraRow | null) => AuraRow[];
  /** Транзакции за период [startDate, endDate], ISO даты. */
  getTransactionsBetween: (startDate: string, endDate: string) => AuraRow[];
  getAll: (tableName: string, filters?: AuraRow | null) => AuraRow[];
  create: (tableName: string, data: AuraRow) => boolean;
  delete: (tableName: string, id: string) => boolean;
  update: (tableName: string, id: string, data: AuraRow) => void;
  addTransaction: (transaction: AuraRow) => void;
  updateTransaction: (transactionId: string, data: AuraRow) => void;
  deleteTransaction: (transactionId: string) => void;
  getDailyPlans: (date: string) => AuraRow[];
  addDailyPlan: (plan: AuraRow) => void;
  getRitualsMorning: (date: string) => AuraRow[];
  getRitualsEvening: (date: string) => AuraRow[];
  getRitualMorningStatus: (date: string, ritualId: string) => AuraRow | null | undefined;
  getRitualEveningStatus: (date: string, ritualId: string) => AuraRow | null | undefined;
  /** Прогресс ритуалов sunrise|sunset за день, 0–100. */
  calculateRitualProgress: (ritualType: string, date: string) => number | null;
  saveRitualMorning: (date: string, ritualId: string, completed: boolean) => void;
  saveRitualEvening: (date: string, ritualId: string, completed: boolean) => void;
  getById: (tableName: string, id: string) => AuraRow | undefined;
  getDiaryEntry: (date: string) => AuraRow | undefined;
  getDiaryEntriesByMonth: (year: number, month: number) => AuraRow[];
  /** Записи дневника за диапазон; `moodOnly` — только с mood_id. */
  getDiaryEntriesBetween: (
    startDate: string,
    endDate: string,
    options?: { moodOnly?: boolean }
  ) => AuraRow[];
  saveDiaryEntry: (entry: AuraRow) => void;
  deleteDiaryEntry: (date: string) => void;
  getNutritionEntries: (date: string) => AuraRow[];
  addNutritionEntry: (entry: AuraRow) => void;
  updateNutritionEntry: (entryId: string, data: AuraRow) => void;
  deleteNutritionEntry: (entryId: string) => void;
  getCategoryProgress: (categoryType: string, date: string) => number | null;
  /** Прогресс всех категорий за день одним запросом. */
  getCategoryProgresses?: (date: string) => Record<string, unknown>;
  getTasksByCategory: (categoryType: string) => AuraRow[];
  getTaskProgress: (taskId: string, date: string) => AuraTaskProgress | null;
  getTaskTimerTotal: (date: string, taskId: string) => number;
  addTimerSession: (session: AuraRow) => void;
  getTimerSessions: (date: string) => AuraRow[];
  updateTimerSession: (sessionId: string, data: AuraRow) => void;
  deleteTimerSession: (id: string) => void;
  saveAppSettings: (settings: AuraRow) => void;
  /** Запись прогресса задачи дня в `act_tasks` (как `Database.saveTaskProgress`). */
  saveTaskProgress: (taskId: string, date: string, data: AuraRow) => void;
  /** Строки act_daily_points за период. */
  getDailyPointsBetween: (startDate: string, endDate: string) => AuraRow[];
  /** Последнее cumulative_points строго до даты. */
  getLastCumulativePointsBefore: (date: string) => number;
}
