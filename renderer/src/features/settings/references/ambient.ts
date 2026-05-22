// ─── Settings References: Ambient ────────────────────────────────────────
// Справочные данные для раздела настроек «ambient».
// Используются в SettingsReferenceBlock для отображения документации.

import {
  Music,
} from 'lucide-react';

import type { SettingsReference } from './types';

/** Справочники секций конфига: ambient */
export const AMBIENT_REFERENCES: Record<string, SettingsReference> = {
  'ambient-music': {
    id: 'ambient-music',
    icon: Music,
    title: 'Фоновая музыка',
    definition:
      'Коллекция треков и плейлистов для фоновой музыки во время работы, отдыха или других активностей.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Панель управления музыкой',
        sectionId: 'home-music-player',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название плейлиста или трека (например: "Лес", "Кофейня", "Дождь").',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для отображения в плеере.',
      },
      {
        name: 'Файл музыки',
        type: 'text',
        required: false,
        description:
          'Имя mp3-файла из папки музыки. Папка определяется автоматически при запуске приложения.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Встроенный плеер',
        description: 'Быстрое включение фоновой музыки прямо с главной страницы.',
        example: 'Нажимаете на плейлист "Лес" — начинает играть фоновая музыка.',
      },
      {
        name: 'Автоматическое обнаружение папки музыки',
        description:
          'Приложение сканирует стандартную папку музыки вашей ОС и предлагает доступные файлы.',
        example: 'Вы кладёте mp3-файлы в папку музыки компьютера, они автоматически появляются в приложении.',
      },
      {
        name: 'Личная коллекция',
        description: 'Создание своей коллекции фоновых звуков и музыки для разных ситуаций.',
        example:
          'Плейлист "Работа": дождь + минимализм. Плейлист "Сон": природные звуки + спокойная музыка.',
      },
    ],
  },
};
