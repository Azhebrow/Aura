/**
 * Палитра цветов для групп продуктов питания
 * Цвета из UnifiedColorPalette (единый источник)
 */

import { getNutritionGroupColor } from './UnifiedColorPalette.js';

export const NUTRITION_GROUPS = {
  proteins: { id: 'proteins', title: 'Белки', icon: 'drumstick' },
  fats: { id: 'fats', title: 'Жиры', icon: 'droplet' },
  carbs: { id: 'carbs', title: 'Углеводы', icon: 'wheat' },
  dishes: { id: 'dishes', title: 'Блюда', icon: 'utensils-crossed' }
};

// Функция для получения цвета группы (из UnifiedColorPalette)
export function getGroupColor(groupId) {
  return getNutritionGroupColor(groupId);
}

// Функция для получения названия группы
export function getGroupTitle(groupId) {
  return NUTRITION_GROUPS[groupId]?.title || 'Неизвестная группа';
}

// Функция для получения иконки группы
export function getGroupIcon(groupId) {
  return NUTRITION_GROUPS[groupId]?.icon || 'circle';
}

// Массив групп для использования в select
export const NUTRITION_GROUPS_ARRAY = Object.values(NUTRITION_GROUPS).map(group => ({
  value: group.id,
  label: group.title
}));

export default NUTRITION_GROUPS;
