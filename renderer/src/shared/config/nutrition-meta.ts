export const NUTRITION_GROUPS = ['proteins', 'fats', 'carbs'] as const;
export type NutritionGroup = (typeof NUTRITION_GROUPS)[number];

export const NUTRITION_GROUP_LABEL: Record<NutritionGroup, string> = {
  proteins: 'Белки',
  fats: 'Жиры',
  carbs: 'Углеводы',
};

export const NUTRITION_GROUP_LABEL_LC: Record<NutritionGroup, string> = {
  proteins: 'белки',
  fats: 'жиры',
  carbs: 'углеводы',
};

export const NUTRITION_GROUP_ICON: Record<NutritionGroup, string> = {
  proteins: 'beef',
  fats: 'flame',
  carbs: 'wheat',
};
