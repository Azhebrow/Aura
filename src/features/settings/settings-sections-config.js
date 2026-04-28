// Декларативная конфигурация секций настроек
// Определяет порядок и параметры всех CFG секций в настройках

export const SETTINGS_SECTIONS = [
  // Ритуалы
  { id: 'rituals-morning', title: 'Утренние ритуалы', configKey: 'rituals-morning' },
  { id: 'rituals-evening', title: 'Вечерние ритуалы', configKey: 'rituals-evening' },
  { id: 'rituals-vows', title: 'Обеты', configKey: 'rituals-vows' },

  // Категории задач
  { id: 'tasks-rituals', title: 'Рутина', configKey: 'tasks-rituals' },
  { id: 'tasks-time', title: 'Фокус', configKey: 'tasks-time' },
  { id: 'tasks-body', title: 'Тонус', configKey: 'tasks-body' },
  { id: 'tasks-deps', title: 'Детопс', configKey: 'tasks-deps' },

  // Финансы
  { id: 'finance-accounts', title: 'Счета', configKey: 'finance-accounts' },
  { id: 'finance-income', title: 'Доходы', configKey: 'finance-income' },
  { id: 'finance-expense', title: 'Расходы', configKey: 'finance-expense' },

  // Досуг
  { id: 'leisure-filling', title: 'Наполнение', configKey: 'leisure-filling' },
  { id: 'leisure-escape', title: 'Эскапизм', configKey: 'leisure-escape' },

  // Дневник
  { id: 'diary-categories', title: 'Категории', configKey: 'diary-categories' },
  { id: 'diary-moods', title: 'Настроения', configKey: 'diary-moods' },

  // Ambient Music
  { id: 'ambient-music', title: 'Фоновая музыка', configKey: 'ambient-music' },

  // Питание
  { id: 'nutrition-products', title: 'Продукты', configKey: 'nutrition-products' },
  { id: 'nutrition-presets', title: 'Блюда', configKey: 'nutrition-presets' }
];









