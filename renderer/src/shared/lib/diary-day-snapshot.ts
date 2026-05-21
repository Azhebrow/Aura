import type { AuraDatabase, AuraRow } from '@/types/aura';
import { readNutritionTargets, sumNutritionDay } from '@/shared/lib/nutrition-aggregate';

export type DiaryDaySnapshot = {
  date: string;
  diaryEntry: AuraRow | null;
  moods: AuraRow[];
  categories: AuraRow[];
  presets: AuraRow[];
  nutritionEntries: AuraRow[];
  nutritionTargets: ReturnType<typeof readNutritionTargets>;
  nutritionTotals: ReturnType<typeof sumNutritionDay>;
};

export function buildDiaryDaySnapshot(db: AuraDatabase | null, date: string): DiaryDaySnapshot {
  const settings = db?.getAppSettings() ?? null;
  const nutritionEntries = db?.getNutritionEntries(date) ?? [];
  return {
    date,
    diaryEntry: db?.getDiaryEntry(date) ?? null,
    moods: db?.getAll('cfg_diary_moods') ?? [],
    categories: db?.getAll('cfg_diary_categories') ?? [],
    presets: db?.getAll('cfg_diary_entry_presets') ?? [],
    nutritionEntries,
    nutritionTargets: readNutritionTargets(settings),
    nutritionTotals: sumNutritionDay(nutritionEntries),
  };
}
