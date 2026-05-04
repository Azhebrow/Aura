import type { AuraDatabase, AuraRow } from '@/types/aura';
import {
  AURA_STATIC_SEMANTIC,
  FINANCE_SEMANTIC,
  LEISURE_SEMANTIC,
  MOOD_SCALE,
  NUTRITION_SEMANTIC,
  RITUAL_SEMANTIC,
  moodColor,
} from '@/shared/design/aura-palette';
import type { StatsGroupBy, StatsMeta, StatsMode } from '@/shared/stats/types';
import { loadTaskCategoryConfig, type TaskCategoryKey } from '@/shared/config/task-categories-settings';

const NUTR_CAT: Record<string, { icon: string; color: string }> = {
  Белки: { icon: 'dumbbell', color: NUTRITION_SEMANTIC.proteins },
  Жиры: { icon: 'droplet', color: NUTRITION_SEMANTIC.fats },
  Углеводы: { icon: 'zap', color: NUTRITION_SEMANTIC.carbs },
  Калории: { icon: 'flame', color: NUTRITION_SEMANTIC.calories },
};

const MOOD_DEFAULT_ICONS = ['frown', 'meh', 'minus', 'smile', 'laugh'];
const LEISURE_CATEGORY_ICONS = {
  filling: 'sparkles',
  escape: 'ghost',
} as const;

function dishColor(): string {
  return NUTRITION_SEMANTIC.dish;
}

export function buildStatsMeta(db: AuraDatabase, mode: StatsMode, groupBy: StatsGroupBy, allKeys: Set<string>): StatsMeta {
  const meta: StatsMeta = { icons: {}, colors: {} };
  if (allKeys.size === 0) return meta;

  if (mode === 'tasks') {
    const cfg = loadTaskCategoryConfig(db);
    const keys: TaskCategoryKey[] = ['rituals', 'time', 'body', 'deps'];
    if (groupBy === 'categories') {
      for (const categoryType of keys) {
        const title = cfg[categoryType].title;
        if (allKeys.has(title)) {
          meta.icons[title] = cfg[categoryType].icon;
          meta.colors[title] = cfg[categoryType].color;
        }
      }
    } else {
      for (const categoryType of keys) {
        const tasks = db.getTasksByCategory(categoryType);
        const categoryColor = cfg[categoryType].color;
        for (const task of tasks) {
          const taskTitle = String(task.title ?? task.id);
          if (allKeys.has(taskTitle)) {
            if (typeof task.icon === 'string' && task.icon) meta.icons[taskTitle] = task.icon;
            meta.colors[taskTitle] = categoryColor;
          }
        }
      }
    }
    return meta;
  }

  if (mode === 'time' || mode === 'leisure') {
    const cfg = loadTaskCategoryConfig(db);
    const timeTasks = db.getTasksByCategory('time');
    const leisureTasks = db.getAll('cfg_leisure_tasks') || [];

    if (groupBy === 'categories') {
      const focusTitle = cfg.time.title;
      if (allKeys.has(focusTitle)) {
        meta.icons[focusTitle] = cfg.time.icon;
        meta.colors[focusTitle] = cfg.time.color;
      }
      if (allKeys.has('Наполнение')) {
        meta.icons['Наполнение'] = LEISURE_CATEGORY_ICONS.filling;
        meta.colors['Наполнение'] = LEISURE_SEMANTIC.filling;
      }
      if (allKeys.has('Эскапизм')) {
        meta.icons['Эскапизм'] = LEISURE_CATEGORY_ICONS.escape;
        meta.colors['Эскапизм'] = LEISURE_SEMANTIC.escape;
      }
    } else {
      const categoryColor = cfg.time.color;
      for (const task of timeTasks) {
        const taskTitle = String(task.title ?? task.id);
        if (allKeys.has(taskTitle)) {
          if (typeof task.icon === 'string' && task.icon) meta.icons[taskTitle] = task.icon;
          meta.colors[taskTitle] = categoryColor;
        }
      }
      meta.leisureTaskTypes = {};
      const sorted = [...leisureTasks].sort((a, b) => {
        if (a.leisure_type === 'filling' && b.leisure_type === 'escape') return -1;
        if (a.leisure_type === 'escape' && b.leisure_type === 'filling') return 1;
        return 0;
      });
      for (const task of sorted) {
        const taskTitle = String(task.title ?? task.name ?? task.id);
        meta.leisureTaskTypes![taskTitle] = task.leisure_type === 'escape' ? 'escape' : 'filling';
        if (!allKeys.has(taskTitle)) continue;
        if (typeof task.icon === 'string' && task.icon) meta.icons[taskTitle] = task.icon;
        if (typeof task.color === 'string' && task.color.trim()) {
          meta.colors[taskTitle] = task.color;
        } else {
          meta.colors[taskTitle] = task.leisure_type === 'escape' ? LEISURE_SEMANTIC.escape : LEISURE_SEMANTIC.filling;
        }
      }
    }
    return meta;
  }

  if (mode === 'finance') {
    if (groupBy === 'categories') {
      if (allKeys.has('Доходы')) {
        meta.icons['Доходы'] = 'trending-up';
        meta.colors['Доходы'] = FINANCE_SEMANTIC.income;
      }
      if (allKeys.has('Расходы')) {
        meta.icons['Расходы'] = 'trending-down';
        meta.colors['Расходы'] = FINANCE_SEMANTIC.expense;
      }
    } else {
      meta.financeCategoryTypes = {};
      for (const category of db.getAll('cfg_income_categories')) {
        const categoryTitle = String(category.title ?? category.id);
        const keyWithPrefix = `+ ${categoryTitle}`;
        meta.financeCategoryTypes![keyWithPrefix] = 'income';
        if (!allKeys.has(keyWithPrefix)) continue;
        if (typeof category.icon === 'string' && category.icon) meta.icons[keyWithPrefix] = category.icon;
        meta.colors[keyWithPrefix] =
          typeof category.color === 'string' && category.color.trim() ? category.color : FINANCE_SEMANTIC.income;
      }
      for (const category of db.getAll('cfg_expense_categories')) {
        const categoryTitle = String(category.title ?? category.id);
        const keyWithPrefix = `- ${categoryTitle}`;
        meta.financeCategoryTypes![keyWithPrefix] = 'expense';
        if (!allKeys.has(keyWithPrefix)) continue;
        if (typeof category.icon === 'string' && category.icon) meta.icons[keyWithPrefix] = category.icon;
        meta.colors[keyWithPrefix] =
          typeof category.color === 'string' && category.color.trim() ? category.color : FINANCE_SEMANTIC.expense;
      }
    }
    return meta;
  }

  if (mode === 'rituals') {
    if (groupBy === 'categories') {
      if (allKeys.has('Утро')) {
        meta.icons['Утро'] = 'sun';
        meta.colors['Утро'] = RITUAL_SEMANTIC.morning;
      }
      if (allKeys.has('Вечер')) {
        meta.icons['Вечер'] = 'moon';
        meta.colors['Вечер'] = RITUAL_SEMANTIC.evening;
      }
    } else {
      meta.ritualTypes = {};
      for (const ritual of db.getAll('cfg_rituals_morning')) {
        const ritualTitle = String(ritual.title ?? ritual.id);
        meta.ritualTypes![ritualTitle] = 'morning';
        if (!allKeys.has(ritualTitle)) continue;
        if (typeof ritual.icon === 'string' && ritual.icon) meta.icons[ritualTitle] = ritual.icon;
        meta.colors[ritualTitle] = typeof ritual.color === 'string' && ritual.color.trim() ? ritual.color : RITUAL_SEMANTIC.morning;
      }
      for (const ritual of db.getAll('cfg_rituals_evening')) {
        const ritualTitle = String(ritual.title ?? ritual.id);
        meta.ritualTypes![ritualTitle] = 'evening';
        if (!allKeys.has(ritualTitle)) continue;
        if (typeof ritual.icon === 'string' && ritual.icon) meta.icons[ritualTitle] = ritual.icon;
        meta.colors[ritualTitle] = typeof ritual.color === 'string' && ritual.color.trim() ? ritual.color : RITUAL_SEMANTIC.evening;
      }
    }
    return meta;
  }

  if (mode === 'rank') {
    if (allKeys.has('Очки ранга')) {
      meta.icons['Очки ранга'] = 'award';
      meta.colors['Очки ранга'] = AURA_STATIC_SEMANTIC.rankGold;
    }
    return meta;
  }

  if (mode === 'mood') {
    const moods = db.getAll('cfg_diary_moods') || [];
    const moodMap = new Map<number, AuraRow>();
    for (const mood of moods) {
      const lv = Number(mood.level);
      if (!Number.isNaN(lv)) moodMap.set(lv, mood);
    }
    meta.moodNames = {};
    for (let level = 1; level <= 5; level++) {
      const mood = moodMap.get(level);
      const label = mood && typeof mood.title === 'string' && mood.title.trim() ? mood.title.trim() : `Уровень ${level}`;
      meta.moodNames[level] = label;
      if (mood) {
        if (typeof mood.icon === 'string' && mood.icon) meta.icons[label] = mood.icon;
        meta.colors[label] = typeof mood.color === 'string' && mood.color.trim() ? mood.color : moodColor(level);
      } else {
        meta.icons[label] = MOOD_DEFAULT_ICONS[level - 1] ?? 'minus';
        meta.colors[label] = MOOD_SCALE[level] ?? moodColor(level);
      }
    }
    if (allKeys.has('Настроение')) {
      meta.icons['Настроение'] = 'heart';
      meta.colors['Настроение'] = RITUAL_SEMANTIC.vows;
    }
    return meta;
  }

  if (mode === 'correlation') {
    const cfg = loadTaskCategoryConfig(db);
    const focusKey = 'Фокус, %';
    const fillingKey = 'Наполнение, %';
    const escapeKey = 'Эскапизм, %';
    if (allKeys.has('Успех, %')) {
      meta.icons['Успех, %'] = 'target';
      meta.colors['Успех, %'] = AURA_STATIC_SEMANTIC.success;
    }
    if (allKeys.has(focusKey)) {
      meta.icons[focusKey] = cfg.time.icon;
      meta.colors[focusKey] = cfg.time.color;
    }
    if (allKeys.has('Калории, %')) {
      meta.icons['Калории, %'] = 'flame';
      meta.colors['Калории, %'] = NUTRITION_SEMANTIC.calories;
    }
    if (allKeys.has('Ритуалы, %')) {
      meta.icons['Ритуалы, %'] = 'sparkles';
      meta.colors['Ритуалы, %'] = RITUAL_SEMANTIC.morning;
    }
    if (allKeys.has('Настроение, %')) {
      meta.icons['Настроение, %'] = 'smile';
      meta.colors['Настроение, %'] = MOOD_SCALE[5];
    }
    if (allKeys.has(escapeKey)) {
      meta.icons[escapeKey] = LEISURE_CATEGORY_ICONS.escape;
      meta.colors[escapeKey] = LEISURE_SEMANTIC.escape;
    }
    if (allKeys.has(fillingKey)) {
      meta.icons[fillingKey] = LEISURE_CATEGORY_ICONS.filling;
      meta.colors[fillingKey] = LEISURE_SEMANTIC.filling;
    }
    return meta;
  }

  if (mode === 'nutrition') {
    if (groupBy === 'categories') {
      for (const key of allKeys) {
        const preset = NUTR_CAT[key];
        if (preset) {
          meta.icons[key] = preset.icon;
          meta.colors[key] = preset.color;
        } else {
          meta.icons[key] = 'apple';
          meta.colors[key] = dishColor();
        }
      }
    } else {
      const products = db.getAll('cfg_nutrition_products') || [];
      const presets = db.getAll('cfg_nutrition_presets') || [];
      for (const key of allKeys) {
        const product = products.find((p) => String(p.title ?? '') === key);
        const preset = presets.find((p) => String(p.title ?? '') === key);
        if (product) {
          meta.icons[key] = typeof product.icon === 'string' && product.icon ? product.icon : 'package';
          meta.colors[key] = dishColor();
        } else if (preset) {
          meta.icons[key] = typeof preset.icon === 'string' ? preset.icon : 'layers';
          meta.colors[key] = dishColor();
        } else {
          meta.icons[key] = 'package';
          meta.colors[key] = dishColor();
        }
      }
    }
  }

  return meta;
}
