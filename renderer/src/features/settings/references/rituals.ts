// ─── Settings References: Rituals ────────────────────────────────────────
// Справочные данные для раздела настроек «rituals».
// Используются в SettingsReferenceBlock для отображения документации.

import {
  Flame,
  Moon,
  Sun,
} from 'lucide-react';

import type { SettingsReference } from './types';

/** Справочники секций конфига: rituals */
export const RITUALS_REFERENCES: Record<string, SettingsReference> = {
  'rituals-morning': {
    id: 'rituals-morning',
    icon: Sun,
    title: 'Утренние ритуалы',
    definition:
      'Список действий, которые вы хотите выполнить каждое утро. Отслеживание выполнения помогает развивать привычку.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Карточка утренних ритуалов',
      },
      {
        page: 'Ритуалы',
        section: 'Чек-лист утра',
      },
    ],
    impacts: [
      {
        title: 'Карточка на главной',
        description: 'Активные ритуалы отображаются в карточке "Ритуалы" на главной странице с отслеживанием прогресса.',
      },
      {
        title: 'Страница Ритуалы',
        description: 'Полный чек-лист всех утренних ритуалов для проверки выполнения каждое утро.',
      },
      {
        title: 'Прогресс дня',
        description: 'Выполненные ритуалы влияют на общий прогресс категории "Ритуалы" в статистике.',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название ритуала (например: "Медитация", "Холодный душ").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description:
          'Дополнительное описание ритуала. Показывается в карточке и в конце списка на странице Ритуалы.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons (без расширения, например: "sun", "heart").',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке. Меньшее число — выше в списке.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'tasks-rituals',
        reason: 'Задачи типа "Ритуал" с привязкой к утру отображаются рядом с утренними ритуалами.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Активация/деактивация',
        description: 'Неактивные ритуалы не показываются в чек-листе, но хранятся в настройках.',
        example: 'Можно временно отключить ритуал без удаления, чтобы потом вернуть.',
      },
      {
        name: 'Отслеживание прогресса',
        description:
          'Автоматический подсчёт выполненных ритуалов в день. Статистика помогает видеть прогресс.',
        example: 'На главной показывается "3/5" — три ритуала из пяти выполнены.',
      },
    ],
  },

  'rituals-evening': {
    id: 'rituals-evening',
    icon: Moon,
    title: 'Вечерние ритуалы',
    definition:
      'Список действий для вечера, которые помогают расслабиться и подготовиться к сну. Отслеживание выполнения вечерних привычек.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Карточка вечерних ритуалов',
        sectionId: 'home-rituals-evening',
      },
      {
        page: 'Ритуалы',
        section: 'Чек-лист вечера',
        sectionId: 'rituals-checklist-evening',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название ритуала (например: "Чтение", "Подготовка ко сну").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description: 'Дополнительное описание ритуала. Показывается в карточке и в конце списка.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons (без расширения, например: "moon", "book").',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке. Меньшее число — выше в списке.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'tasks-rituals',
        reason: 'Задачи типа "Ритуал" с привязкой к вечеру отображаются рядом с вечерними ритуалами.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Активация/деактивация',
        description: 'Неактивные ритуалы не показываются в чек-листе, но хранятся в настройках.',
        example: 'Можно отключить ритуал на время отпуска и потом вернуть.',
      },
      {
        name: 'Отслеживание прогресса',
        description: 'Подсчёт выполненных вечерних ритуалов за день для отслеживания привычек.',
        example: 'На главной показывается "2/4" — два ритуала из четырёх выполнены.',
      },
    ],
  },

  'rituals-vows': {
    id: 'rituals-vows',
    icon: Flame,
    title: 'Обеты',
    definition:
      'Краткие утверждения или обещания самому себе, которые вы хотите помнить каждый день. Они помогают оставаться сосредоточенным на главном.',
    usedOn: [
      {
        page: 'Ритуалы',
        section: 'Раздел обетов',
        sectionId: 'rituals-vows-section',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Краткое описание обета (например: "Я способен", "Здоровье прежде всего").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description: 'Развёрнутое объяснение обета. Показывается в списке под названием.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons (без расширения).',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Ежедневное напоминание',
        description:
          'Обеты отображаются на странице Ритуалы и в утренней карточке как вдохновляющее напоминание.',
        example: 'Каждое утро вы видите свои обеты перед началом дня.',
      },
    ],
  },
};
