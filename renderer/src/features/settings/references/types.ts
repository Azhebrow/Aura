// ─── Settings Reference Types ─────────────────────────────────────────────────
// Типы для системы справочников настроек.
// Каждая секция конфига имеет свой SettingsReference с описанием полей,
// примерами использования и связями с другими настройками.

import type { LucideIcon } from 'lucide-react';

/** Описание одного поля формы в секции конфига */
export type SettingsFieldDef = {
  name: string;
  type: 'text' | 'number' | 'select' | 'color' | 'checkbox' | 'textarea' | 'json';
  required: boolean;
  description: string;
};

/** Где используется данная секция конфига в интерфейсе */
export type SettingsReferenceUsage = {
  page: string;
  section: string;
  sectionId?: string;
  isNavLink?: boolean;
};

/** Связанная секция конфига */
export type SettingsReferenceRelated = {
  sectionId: string;
  reason: string;
};

/** Дополнительная функция, доступная для секции */
export type SettingsReferenceAdditionalFunction = {
  name: string;
  description: string;
  example: string;
};

/** Влияние настройки на поведение приложения */
export type SettingsReferenceImpact = {
  title: string;
  description: string;
};

/** Описание одного типа задачи в гиде по типам */
export type TaskTypeGuide = {
  type: 'checkbox' | 'number' | 'timer' | 'nutrition' | 'list' | 'ritual';
  name: string;
  emoji: string;
  available: boolean;
  unavailableReason?: string;
  description: string;
  howToComplete: string;
  example: string;
  note?: string;
};

/** Полный справочник для одной секции настроек */
export type SettingsReference = {
  id: string;
  icon: LucideIcon;
  title: string;
  definition: string;
  usedOn: SettingsReferenceUsage[];
  fields: SettingsFieldDef[];
  relatedSettings: SettingsReferenceRelated[];
  additionalFunctions: SettingsReferenceAdditionalFunction[];
  impacts?: SettingsReferenceImpact[];
  taskTypeGuide?: TaskTypeGuide[];
};
