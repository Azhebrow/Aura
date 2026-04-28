/**
 * Единая цветовая палитра приложения
 * Единственный источник правды для макросов питания, категорий задач и групп продуктов
 */

// Макросы питания — аппетитные цвета: белок тёплый коричневый, жир жёлтый, углеводы зелёный
export const MACRO_COLORS = {
  calories: 'hsl(15, 55%, 54%)',
  proteins: 'hsl(28, 48%, 46%)',   // тёплый коричневый/карамельный (белок)
  fats: 'hsl(48, 72%, 52%)',       // золотисто-жёлтый (жир)
  carbs: 'hsl(135, 48%, 44%)'      // насыщенный зелёный (углеводы)
};

/*
 * Curated-палитра для категорий задач (12 цветов)
 * Сдержанные винные, коричневые, землистые тона: S 40–50%, L 48–52%
 */
export const TASK_CATEGORY_PALETTE = [
  'hsl(15, 50%, 50%)',   // 0: тёплый винный (практики)
  'hsl(140, 45%, 48%)',  // 1: приглушённый зелёный (фокус)
  'hsl(260, 45%, 50%)',  // 2: приглушённый фиолетовый (тело)
  'hsl(0, 48%, 48%)',    // 3: приглушённый красный (зависимости)
  'hsl(195, 45%, 50%)',  // 4: приглушённый бирюзовый
  'hsl(35, 50%, 52%)',   // 5: терракотовый
  'hsl(300, 40%, 50%)',  // 6: приглушённый пурпурный
  'hsl(170, 42%, 48%)',  // 7: приглушённый циан
  'hsl(25, 48%, 50%)',   // 8: коричневый
  'hsl(270, 42%, 50%)',  // 9: приглушённый фиолетовый
  'hsl(45, 48%, 52%)',   // 10: янтарный
  'hsl(330, 42%, 50%)'   // 11: приглушённый розовый
];

// Маппинг групп продуктов на цвета (аппетитные, в одном стиле)
const NUTRITION_GROUP_COLORS = {
  proteins: MACRO_COLORS.proteins,  // тёплый коричневый
  fats: MACRO_COLORS.fats,           // золотисто-жёлтый
  carbs: MACRO_COLORS.carbs,        // зелёный
  dishes: 'hsl(0, 0%, 55%)',        // нейтральный серый для блюд/пресетов
  other: 'hsl(0, 0%, 55%)'          // fallback
};

/**
 * Получить цвет макроса питания
 * @param {'calories'|'proteins'|'fats'|'carbs'} macro
 * @returns {string} HSL цвет
 */
export function getMacroColor(macro) {
  return MACRO_COLORS[macro] || 'hsl(0, 0%, 50%)';
}

/**
 * Получить curated-палитру для категорий задач
 * @returns {string[]} массив HSL цветов
 */
export function getTaskCategoryPalette() {
  return [...TASK_CATEGORY_PALETTE];
}

/**
 * Проверить, входит ли цвет в curated-палитру (с допуском)
 * @param {string} color - HSL строка
 * @returns {number|null} индекс в палитре или null
 */
export function getTaskCategoryPaletteIndex(color) {
  if (!color) return null;
  const normalized = (c) => c.replace(/\s+/g, ' ').trim().toLowerCase();
  const target = normalized(color);
  for (let i = 0; i < TASK_CATEGORY_PALETTE.length; i++) {
    if (normalized(TASK_CATEGORY_PALETTE[i]) === target) return i;
  }
  return null;
}

/**
 * Получить цвет из curated-палитры по индексу
 * @param {number} index
 * @returns {string} HSL цвет
 */
export function getTaskCategoryColorByIndex(index) {
  if (index >= 0 && index < TASK_CATEGORY_PALETTE.length) {
    return TASK_CATEGORY_PALETTE[index];
  }
  return TASK_CATEGORY_PALETTE[0];
}

/**
 * Валидировать цвет категории задачи — вернуть ближайший из палитры или первый
 * @param {string} color
 * @returns {string} HSL из палитры
 */
export function validateTaskCategoryColor(color) {
  const idx = getTaskCategoryPaletteIndex(color);
  if (idx !== null) return TASK_CATEGORY_PALETTE[idx];
  return TASK_CATEGORY_PALETTE[0];
}

/**
 * Получить цвет группы продуктов питания
 * @param {string} groupId
 * @returns {string} HSL цвет
 */
export function getNutritionGroupColor(groupId) {
  return NUTRITION_GROUP_COLORS[groupId] || NUTRITION_GROUP_COLORS.other;
}

export default {
  MACRO_COLORS,
  TASK_CATEGORY_PALETTE,
  getMacroColor,
  getTaskCategoryPalette,
  getTaskCategoryPaletteIndex,
  getTaskCategoryColorByIndex,
  validateTaskCategoryColor,
  getNutritionGroupColor
};
