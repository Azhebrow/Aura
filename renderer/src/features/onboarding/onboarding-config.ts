// ─── Onboarding Config ────────────────────────────────────────────────────────
// Константы, типы и данные для шагов онбординга.
// Никакой логики — только конфигурация.

import {
  Apple,
  Award,
  BarChart3,
  BookOpen,
  Check,
  Music2,
  Smile,
  Sun,
  Wallet,
} from 'lucide-react';
import type { AuraAccentPreset } from '@/features/theme/theme-constants';
import type { PageSectionsVisibility } from '@/shared/lib/page-sections-visibility';
import type { AuraFontFamily } from '@/features/theme/font-constants';
import type { AuraThemeMode } from '@/features/theme/theme-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PresetGroupKey = 'tasks' | 'rituals' | 'finance' | 'diary' | 'nutrition' | 'ambient';

export type SectionDef = {
  page: keyof PageSectionsVisibility;
  key: string;
  label: string;
  desc: string;
  example: string;
};

/** Полное состояние мастера настройки */
export type WizardState = {
  accent: AuraAccentPreset;
  themeMode: AuraThemeMode;
  fontFamily: AuraFontFamily;
  appScale: string;
  textScale: string;
  sections: PageSectionsVisibility;
  presets: Record<PresetGroupKey, boolean>;
  calories: string;
  proteins: string;
  fats: string;
  carbs: string;
};

// ─── Accent presets ───────────────────────────────────────────────────────────

export const ACCENT_PRESETS: Array<{ value: AuraAccentPreset; label: string; hsl: string }> = [
  { value: 'mono',    label: 'Моно',     hsl: '215 14% 48%' },
  { value: 'slate',   label: 'Сланец',   hsl: '215 25% 50%' },
  { value: 'violet',  label: 'Фиолет',   hsl: '263 60% 58%' },
  { value: 'indigo',  label: 'Индиго',   hsl: '238 60% 60%' },
  { value: 'blue',    label: 'Синий',    hsl: '214 70% 56%' },
  { value: 'cobalt',  label: 'Кобальт',  hsl: '220 80% 52%' },
  { value: 'cyan',    label: 'Циан',     hsl: '188 64% 48%' },
  { value: 'teal',    label: 'Бирюза',   hsl: '174 60% 40%' },
  { value: 'emerald', label: 'Изумруд',  hsl: '152 58% 44%' },
  { value: 'lime',    label: 'Лайм',     hsl: '84 52% 44%'  },
  { value: 'amber',   label: 'Янтарь',   hsl: '45 84% 50%'  },
  { value: 'orange',  label: 'Апельсин', hsl: '24 72% 52%'  },
  { value: 'rose',    label: 'Красный',  hsl: '354 68% 54%' },
  { value: 'pink',    label: 'Розовый',  hsl: '330 54% 56%' },
];

// ─── Section definitions ──────────────────────────────────────────────────────

export const SECTION_DEFS: SectionDef[] = [
  { page: 'home',    key: 'tasksCategories',      label: 'Категории задач',   desc: '4 карточки с % дня',       example: 'Рутина 80%, Фокус 45%, Тонус 60%' },
  { page: 'home',    key: 'transactions',          label: 'Транзакции',        desc: 'Список денег за день',      example: '−450 кофе, +5000 доход' },
  { page: 'home',    key: 'dailyPlans',            label: 'Планы дня',         desc: 'Утренний/вечерний текст',   example: 'Утром: 3 главные задачи' },
  { page: 'home',    key: 'categoryProgressChart', label: 'График прогресса',  desc: 'Мини-график активности',    example: 'Неделя по категориям' },
  { page: 'rituals', key: 'rituals',               label: 'Ритуалы',           desc: 'Чек-лист утра/вечера',      example: 'Вода, зарядка, чтение' },
  { page: 'rituals', key: 'vows',                  label: 'Обеты',             desc: 'Длинные обещания',          example: '30 дней без сахара' },
  { page: 'rituals', key: 'goals',                 label: 'Цели',              desc: 'Проекты со стадиями',       example: 'Курс → модуль → задача' },
  { page: 'diary',   key: 'entryPanel',            label: 'Запись дневника',   desc: 'Текст + настроение',        example: 'Что понял сегодня?' },
  { page: 'diary',   key: 'contentNutrition',      label: 'Питание',           desc: 'КБЖУ за день',              example: '1820 ккал, белки 120г' },
  { page: 'ranks',   key: 'rank',                  label: 'Ранг',              desc: 'Текущий уровень',           example: 'Воин, 4800 очков' },
  { page: 'ranks',   key: 'pointsHistory',         label: 'История очков',     desc: 'Таблица результатов',       example: '+72 сегодня, −15 вчера' },
];

export const PAGE_LABELS: Record<keyof PageSectionsVisibility, string> = {
  home:    'Главная',
  rituals: 'Ритуалы',
  diary:   'Дневник',
  ranks:   'Очки',
};

export const PAGE_HINTS: Record<keyof PageSectionsVisibility, { title: string; desc: string }> = {
  home:    { title: 'Центр дня',       desc: 'Быстрый обзор задач, планов, денег и прогресса.' },
  rituals: { title: 'Стабильность',    desc: 'Утро, вечер, обеты и цели держат систему в ритме.' },
  diary:   { title: 'Память и питание',desc: 'Записи, настроение и КБЖУ собираются в дневник.' },
  ranks:   { title: 'Игра в долгую',   desc: 'Очки дня превращаются в прогресс ранга.' },
};

// ─── Preset groups ────────────────────────────────────────────────────────────

export const PRESET_GROUPS: Array<{
  key: PresetGroupKey;
  title: string;
  desc: string;
  icon: typeof Sun;
  tables: string[];
}> = [
  {
    key:    'tasks',
    title:  'Задачи',
    desc:   'Категории дня, фокус, тонус, детокс и стартовые пункты.',
    icon:   Check,
    tables: ['cfg_task_categories', 'cfg_tasks'],
  },
  {
    key:    'rituals',
    title:  'Ритуалы и цели',
    desc:   'Утро, вечер, обеты, цели, стадии и подзадачи.',
    icon:   Sun,
    tables: ['cfg_rituals_morning', 'cfg_rituals_evening', 'cfg_vows', 'cfg_goals', 'cfg_goal_stages', 'cfg_goal_tasks'],
  },
  {
    key:    'finance',
    title:  'Финансы',
    desc:   'Счета, доходы и категории расходов.',
    icon:   Wallet,
    tables: ['cfg_accounts', 'cfg_income_categories', 'cfg_expense_categories'],
  },
  {
    key:    'diary',
    title:  'Дневник',
    desc:   'Категории записей, настроения и быстрые шаблоны.',
    icon:   BookOpen,
    tables: ['cfg_diary_categories', 'cfg_diary_moods', 'cfg_diary_entry_presets'],
  },
  {
    key:    'nutrition',
    title:  'Питание',
    desc:   'Продукты, пресеты блюд и дневные нормы КБЖУ.',
    icon:   Apple,
    tables: ['cfg_nutrition_products', 'cfg_nutrition_presets'],
  },
  {
    key:    'ambient',
    title:  'Музыка',
    desc:   'Фоновые треки для фокуса, секундомера и перерывов.',
    icon:   Music2,
    tables: ['cfg_ambient_music'],
  },
];

/** Welcome screen feature icons */
export const WELCOME_FEATURE_ICONS = [
  { icon: Check,     label: 'Задачи'     },
  { icon: Sun,       label: 'Ритуалы'    },
  { icon: BookOpen,  label: 'Дневник'    },
  { icon: Wallet,    label: 'Финансы'    },
  { icon: Apple,     label: 'Питание'    },
  { icon: BarChart3, label: 'Статистика' },
  { icon: Smile,     label: 'Настроение' },
  { icon: Award,     label: 'Ранги'      },
];

export const DEFAULT_PRESET_CHOICES: Record<PresetGroupKey, boolean> = {
  tasks:     true,
  rituals:   true,
  finance:   true,
  diary:     true,
  nutrition: true,
  ambient:   true,
};

export const TOTAL_STEPS = 6;
