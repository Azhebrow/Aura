// ─── Settings References: Interface ────────────────────────────────────────
// Справочные данные для раздела настроек «interface».
// Используются в SettingsReferenceBlock для отображения документации.

import { Settings2 } from 'lucide-react';

import type { SettingsReference } from './types';

/** Справочники секций конфига: interface */
export const INTERFACE_REFERENCES: Record<string, SettingsReference> = {
  'interface-data': {
    id: 'interface-data',
    icon: Settings2,
    title: 'Оформление и данные',
    definition:
      'Основные настройки приложения: внешний вид, валюта, целевые показатели питания и другие параметры, которые влияют на всё приложение.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Боковая панель',
        sectionId: 'home-sidebar',
      },
    ],
    impacts: [
      {
        title: 'Отображение валют',
        description: 'Выбранная валюта используется во всех финансовых разделах (счета, доходы, расходы) для отображения сумм.',
      },
      {
        title: 'Цели питания',
        description: 'Целевые показатели калорий и макронутриентов влияют на прогресс в разделе "Питание" и рассчитываемые проценты.',
      },
      {
        title: 'Оформление интерфейса',
        description: 'Тема и цветовая схема применяется ко всему приложению и влияет на видимость всех элементов.',
      },
    ],
    fields: [
      {
        name: 'Валюта',
        type: 'select',
        required: true,
        description: 'Код валюты (RUB, USD, EUR и т.д.). Используется во всех финансовых разделах.',
      },
      {
        name: 'Целевые калории',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по калориям для раздела "Питание".',
      },
      {
        name: 'Целевые белки (г)',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по белкам для раздела "Питание".',
      },
      {
        name: 'Целевые жиры (г)',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по жирам для раздела "Питание".',
      },
      {
        name: 'Целевые углеводы (г)',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по углеводам для раздела "Питание".',
      },
      {
        name: 'Тема оформления',
        type: 'select',
        required: false,
        description: 'Выбор темы: светлая, тёмная или автоматическая смена по времени.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Сброс всех данных',
        description:
          'Полная очистка всех настроек и данных приложения с возвратом к заводским настройкам. Действие необратимо.',
        example: 'Используется при переносе на новое устройство или полной переинсталляции.',
      },
    ],
  },
};
