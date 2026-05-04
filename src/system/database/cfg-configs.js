// Конфигурации для всех CFG секций
// Определяет какие поля показывать и редактировать

import { TASKS_PERMISSIONS, MOODS_PERMISSIONS } from './cfg-permissions.js';

export const CFG_CONFIGS = {
  // ФИНАНСЫ
  'finance-accounts': {
    tableName: 'cfg_accounts',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'type', label: 'Тип', type: 'select', options: [
        'regular',
        'savings'
      ]},
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' },
      { name: 'balance', label: 'Баланс', type: 'number', suffix: '₽' },
      { name: 'target', label: 'Цель', type: 'number', suffix: '₽' }
    ]
  },

  'finance-income': {
    tableName: 'cfg_income_categories',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' }
    ]
  },

  'finance-expense': {
    tableName: 'cfg_expense_categories',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' },
      { name: 'type', label: 'Импульсивная покупка', type: 'checkbox' },
      { name: 'description', label: 'Описание', type: 'textarea' }
    ]
  },

  // ЗАДАЧИ
  'tasks-rituals': {
    tableName: 'cfg_tasks',
    filters: { category_type: 'rituals' },
    permissions: TASKS_PERMISSIONS,
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { 
        name: 'task_type', 
        label: 'Тип задачи', 
        type: 'select', 
        options: [
          { value: 'checkbox', label: 'Да/Нет (чекбокс)' },
          { value: 'number', label: 'Число' },
          { value: 'ritual', label: 'Ритуал' },
          { value: 'list', label: 'Список' }
        ]
      },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { 
        name: 'cfg_target_value', 
        label: 'Цель', 
        type: 'number', 
        required: true,
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'cfg_unit', 
        label: 'Единица', 
        type: 'text',
        placeholder: 'шт, л, км...',
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'cfg_target_hours', 
        label: 'Целевое время', 
        type: 'number', 
        required: true,
        suffix: 'ч',
        min: 0.5,
        step: 0.5,
        showWhen: { field: 'task_type', value: 'timer' }
      },
      { 
        name: 'ritual_type', 
        label: 'Вид', 
        type: 'select',
        required: true,
        options: [
          { value: 'sunrise', label: 'Утренний' },
          { value: 'sunset', label: 'Вечерний' },
          { value: 'sun', label: 'Дневной' }
        ],
        showWhen: { field: 'task_type', value: 'ritual' }
      },
      { 
        name: 'config_items', 
        label: 'Элементы списка', 
        type: 'list-items',
        showWhen: { field: 'task_type', value: 'list' }
      }
    ]
  },

  'tasks-time': {
    tableName: 'cfg_tasks',
    filters: { category_type: 'time' },
    permissions: TASKS_PERMISSIONS,
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'task_type', label: 'Тип задачи', type: 'select', options: [
        { value: 'checkbox', label: 'Чекбокс' },
        { value: 'number', label: 'Число' },
        { value: 'timer', label: 'Таймер' },
        { value: 'list', label: 'Список' }
      ]},
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { 
        name: 'cfg_target_value', 
        label: 'Целевое значение', 
        type: 'number',
        suffix: '',
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'cfg_unit', 
        label: 'Единица', 
        type: 'text',
        placeholder: 'шт, л, км...',
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'cfg_target_hours', 
        label: 'Целевое время', 
        type: 'number',
        suffix: 'ч',
        min: 0.5,
        step: 0.5,
        showWhen: { field: 'task_type', value: 'timer' }
      },
      { 
        name: 'config_items', 
        label: 'Элементы списка', 
        type: 'list-items',
        showWhen: { field: 'task_type', value: 'list' }
      }
    ]
  },

  'tasks-body': {
    tableName: 'cfg_tasks',
    filters: { category_type: 'body' },
    permissions: TASKS_PERMISSIONS,
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'task_type', label: 'Тип задачи', type: 'select', options: [
        { value: 'checkbox', label: 'Чекбокс' },
        { value: 'number', label: 'Число' },
        { value: 'list', label: 'Список' }
      ]},
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { 
        name: 'cfg_target_value', 
        label: 'Целевое значение', 
        type: 'number',
        suffix: '',
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'cfg_unit', 
        label: 'Единица', 
        type: 'text',
        placeholder: 'шт, л, км...',
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'cfg_target_hours', 
        label: 'Целевое время', 
        type: 'number',
        suffix: 'ч',
        min: 0.5,
        step: 0.5,
        showWhen: { field: 'task_type', value: 'timer' }
      },
      { 
        name: 'config_items', 
        label: 'Элементы списка', 
        type: 'list-items',
        showWhen: { field: 'task_type', value: 'list' }
      }
    ]
  },

  'tasks-deps': {
    tableName: 'cfg_tasks',
    filters: { category_type: 'deps' },
    permissions: TASKS_PERMISSIONS,
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'task_type', label: 'Тип задачи', type: 'select', options: [
        { value: 'checkbox', label: 'Чекбокс' }
      ]},
      { name: 'icon', label: 'Иконка', type: 'icon' }
    ]
  },

  'tasks-categories': {
    tableName: 'cfg_task_categories',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' }
    ]
  },

  // ДОСУГ
  'leisure-filling': {
    tableName: 'cfg_leisure_tasks',
    filters: { leisure_type: 'filling' },
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' },
      { 
        name: 'cfg_target_hours', 
        label: 'Целевое время', 
        type: 'number',
        suffix: 'ч',
        min: 0.5,
        step: 0.5,
        required: true
      }
    ]
  },

  'leisure-escape': {
    tableName: 'cfg_leisure_tasks',
    filters: { leisure_type: 'escape' },
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' },
      { 
        name: 'cfg_target_hours', 
        label: 'Целевое время', 
        type: 'number',
        suffix: 'ч',
        min: 0.5,
        step: 0.5,
        required: true
      }
    ]
  },

  // РИТУАЛЫ
  'rituals-morning': {
    tableName: 'cfg_rituals_morning',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' }
      // Цвет фиксированный для утренних ритуалов, устанавливается автоматически
    ]
  },

  'rituals-evening': {
    tableName: 'cfg_rituals_evening',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' }
      // Цвет фиксированный для вечерних ритуалов, устанавливается автоматически
    ]
  },

  'rituals-vows': {
    tableName: 'cfg_vows',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' }
    ]
  },

  // ДНЕВНИК
  'diary-categories': {
    tableName: 'cfg_diary_categories',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' }
    ]
  },

  'diary-moods': {
    tableName: 'cfg_diary_moods',
    permissions: MOODS_PERMISSIONS,
    fields: [
      { name: 'level', label: 'Уровень (1-5)', type: 'number', required: true, min: 1, max: 5 },
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'color', label: 'Цвет', type: 'color' },
      { name: 'icon', label: 'Иконка', type: 'icon' }
    ]
  },

  'diary-entry-presets': {
    tableName: 'cfg_diary_entry_presets',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'prompt', label: 'Цитата / подсказка', type: 'textarea', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'active', label: 'Активная', type: 'checkbox' }
    ]
  },

  // ЦЕЛИ
  'goals': {
    tableName: 'cfg_goals',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'color', label: 'Цвет', type: 'color' },
      {
        name: 'completed_at',
        label: 'Дата завершения',
        type: 'text',
        placeholder: 'ГГГГ-ММ-ДД (при 100% прогресса)'
      }
    ]
  },

  'goal-stages': {
    tableName: 'cfg_goal_stages',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      {
        name: 'completed_at',
        label: 'Дата завершения',
        type: 'text',
        placeholder: 'ГГГГ-ММ-ДД (при 100% прогресса)'
      }
    ]
  },

  'goal-tasks': {
    tableName: 'cfg_goal_tasks',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { 
        name: 'task_type', 
        label: 'Тип задачи', 
        type: 'select', 
        required: true,
        options: [
          { value: 'checkbox', label: 'Чекбокс' },
          { value: 'number', label: 'Число' },
          { value: 'list', label: 'Список' }
        ]
      },
      { 
        name: 'target_value', 
        label: 'Целевое значение', 
        type: 'number', 
        required: true,
        showWhen: { field: 'task_type', value: 'number' }
      },
      { 
        name: 'unit', 
        label: 'Единица', 
        type: 'text',
        placeholder: 'шт, л, км...',
        showWhen: { field: 'task_type', value: 'number' }
      },
      {
        name: 'completed_at',
        label: 'Дата завершения',
        type: 'text',
        placeholder: 'ГГГГ-ММ-ДД (при 100% за выбранный день)'
      }
    ]
  },

  // AMBIENT MUSIC
  'ambient-music': {
    tableName: 'cfg_ambient_music',
    titleField: 'name',
    fields: [
      { name: 'name', label: 'Название', type: 'text', required: true },
      { name: 'icon', label: 'Иконка', type: 'icon' },
      { name: 'file_name', label: 'Файл', type: 'file', required: true }
    ]
  },

  // ПИТАНИЕ
  'nutrition-products': {
    tableName: 'cfg_nutrition_products',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'group', label: 'Группа продукта', type: 'select', required: true, options: [
        { value: 'proteins', label: 'Белки' },
        { value: 'fats', label: 'Жиры' },
        { value: 'carbs', label: 'Углеводы' }
      ]},
      { name: 'portion_weight', label: 'Вес порции', type: 'number', suffix: 'г', required: true, min: 1 },
      { name: 'calories_per_100g', label: 'Калории (на 100г)', type: 'number', suffix: 'ккал', required: true, min: 0 },
      { name: 'proteins_per_100g', label: 'Белки (на 100г)', type: 'number', suffix: 'г', required: true, min: 0 },
      { name: 'fats_per_100g', label: 'Жиры (на 100г)', type: 'number', suffix: 'г', required: true, min: 0 },
      { name: 'carbs_per_100g', label: 'Углеводы (на 100г)', type: 'number', suffix: 'г', required: true, min: 0 }
    ]
  },

  'nutrition-presets': {
    tableName: 'cfg_nutrition_presets',
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'products', label: 'Продукты', type: 'nutrition-preset-products', required: true }
    ]
  }
};
