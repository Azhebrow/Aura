import type { AuraRow } from '@/types/aura';

/** Как в legacy `NutritionEntryModal.calculateProductNutrition`. */
export function calculateProductNutrition(product: AuraRow, value: number, isGrams = false) {
  const portionWeight = Number(product.portion_weight) || 0;
  const totalWeight = isGrams ? value : portionWeight * value;
  const multiplier = totalWeight / 100;
  return {
    calories: Number(product.calories_per_100g) * multiplier,
    proteins: Number(product.proteins_per_100g) * multiplier,
    fats: Number(product.fats_per_100g) * multiplier,
    carbs: Number(product.carbs_per_100g) * multiplier,
    weight: totalWeight,
  };
}

export function calculatePresetNutrition(preset: AuraRow, value: number, productsById: Record<string, AuraRow>) {
  let ingredients: Array<{ product_id?: string; portions?: number }> = [];
  try {
    ingredients = JSON.parse(String(preset.products || '[]'));
    if (!Array.isArray(ingredients)) ingredients = [];
  } catch {
    ingredients = [];
  }

  const totalsPerPresetPortion = ingredients.reduce(
    (acc, ingredient) => {
      const ingredientPortions = Number(ingredient?.portions || 0);
      const productId = ingredient?.product_id;
      const product = productId ? productsById[String(productId)] : null;
      if (!product || ingredientPortions <= 0) return acc;
      const nutrition = calculateProductNutrition(product, ingredientPortions, false);
      acc.calories += nutrition.calories;
      acc.proteins += nutrition.proteins;
      acc.fats += nutrition.fats;
      acc.carbs += nutrition.carbs;
      acc.weight += nutrition.weight;
      return acc;
    },
    { calories: 0, proteins: 0, fats: 0, carbs: 0, weight: 0 }
  );

  const multiplier = Number(value || 0);
  return {
    calories: totalsPerPresetPortion.calories * multiplier,
    proteins: totalsPerPresetPortion.proteins * multiplier,
    fats: totalsPerPresetPortion.fats * multiplier,
    carbs: totalsPerPresetPortion.carbs * multiplier,
    weight: totalsPerPresetPortion.weight * multiplier,
  };
}
