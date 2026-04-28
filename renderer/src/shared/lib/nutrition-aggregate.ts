import type { AuraRow } from '@/types/aura';

export type NutritionTotals = {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
};

export function sumNutritionDay(entries: AuraRow[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (acc, e) => ({
      calories: acc.calories + (Number(e.total_calories) || 0),
      proteins: acc.proteins + (Number(e.total_proteins) || 0),
      fats: acc.fats + (Number(e.total_fats) || 0),
      carbs: acc.carbs + (Number(e.total_carbs) || 0),
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  );
}

export function readNutritionTargets(settings: Record<string, unknown> | null | undefined): NutritionTotals {
  if (!settings) {
    return { calories: 0, proteins: 0, fats: 0, carbs: 0 };
  }
  return {
    calories: Number(settings.nutrition_target_calories) || 0,
    proteins: Number(settings.nutrition_target_proteins) || 0,
    fats: Number(settings.nutrition_target_fats) || 0,
    carbs: Number(settings.nutrition_target_carbs) || 0,
  };
}
