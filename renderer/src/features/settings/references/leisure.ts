// ─── Settings References: Leisure ────────────────────────────────────────
// Справочные данные для раздела настроек «leisure».
// Используются в SettingsReferenceBlock для отображения документации.

import {
  Ghost,
  Sparkles,
} from 'lucide-react';

import type { SettingsReference } from './types';

/** Справочники секций конфига: leisure */
export const LEISURE_REFERENCES: Record<string, SettingsReference> = {
  'leisure-filling': {
    id: 'leisure-filling',
    icon: Sparkles,
    title: 'Досуг — наполнение',
    definition:
      'Активности, которые наполняют жизнь смыслом и приносят удовольствие: хобби, творчество, общение. Противоположность "пассивному" развлечению.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория досуга "Наполнение"',
        sectionId: 'home-leisure-filling',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название активности (например: "Рисование", "Гитара", "Встречи с друзьями").',
      },
      {
        name: 'Тип',
        type: 'select',
        required: true,
        description:
          'Способ отслеживания: Чекбокс (да/нет), Число (часов/раз), Таймер (по времени), Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons.',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения (переопределяет стандартный цвет "наполнения").',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель за день (например: 2 часа творчества).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица измерения (например: "часов", "раз", "минут").',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое время активности в день.',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс досуга.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Отслеживание смысленных активностей',
        description: 'Фиксирование времени, потраченного на активности, которые приносят удовлетворение.',
        example: 'Запуск таймера при рисовании или игре на музыкальном инструменте.',
      },
      {
        name: 'Баланс жизни',
        description: 'Помощь в достижении баланса между продуктивностью и наполняющими активностями.',
        example: 'Вы видите, достаточно ли времени уделили творчеству в день.',
      },
    ],
  },

  'leisure-escape': {
    id: 'leisure-escape',
    icon: Ghost,
    title: 'Досуг — эскапизм',
    definition:
      'Пассивное развлечение: интернет, фильмы, игры, соцсети. Полезны в меру, но имеют риск пассивного увлечения.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория досуга "Эскапизм"',
        sectionId: 'home-leisure-escape',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название активности (например: "Сериалы", "Игры", "Соцсети", "YouTube").',
      },
      {
        name: 'Тип',
        type: 'select',
        required: true,
        description: 'Способ отслеживания: Чекбокс, Число, Таймер, Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для визуального отличия.',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения (переопределяет стандартный цвет "эскапизма").',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель за день (например: максимум 2 часа в соцсетях).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица измерения (часов, раз и т.д.).',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое максимальное время в день (рекомендуется ограничивать).',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Контроль пассивного времени',
        description: 'Помощь в осознании и ограничении времени, потраченного на пассивное развлечение.',
        example: 'Вы ставите лимит 2 часа на соцсети и видите в реальном времени, сколько осталось.',
      },
      {
        name: 'Сравнение с наполнением',
        description: 'На главной видно соотношение между смысленными активностями и развлечением.',
        example: 'Если вы потратили 4 часа на эскапизм и 0 часов на наполнение, система это покажет.',
      },
    ],
  },
};
