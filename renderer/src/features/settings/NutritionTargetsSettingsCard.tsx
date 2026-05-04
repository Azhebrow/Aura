import { useState } from 'react';
import { Target } from 'lucide-react';
import { ActAffixValueField } from '@/features/act/ActModal';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { readNutritionTargets } from '@/shared/lib/nutrition-aggregate';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';
import type { AuraRow } from '@/types/aura';

export function NutritionTargetsSettingsCard() {
  const { data: current, status } = useAsyncData((db) => db.getAppSettings(), [], { events: ['cfg'] });
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [fats, setFats] = useState('');
  const [carbs, setCarbs] = useState('');

  if (status === 'ready' && current) {
    const t = readNutritionTargets(current);
    if (!calories && t.calories > 0) setCalories(String(Math.round(t.calories)));
    if (!proteins && t.proteins > 0) setProteins(String(Math.round(t.proteins)));
    if (!fats && t.fats > 0) setFats(String(Math.round(t.fats)));
    if (!carbs && t.carbs > 0) setCarbs(String(Math.round(t.carbs)));
  }

  const parseNum = (s: string) => {
    const t = s.replace(',', '.').trim();
    if (t === '') return 0;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : 0;
  };

  const persist = (patch: Partial<{ calories: string; proteins: string; fats: string; carbs: string }>) => {
    const db = window.getDB?.();
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    const id = String(cur.id ?? 'app_settings_1');
    window.dispatchEvent(new Event('settings-saved'));
    db.saveAppSettings({
      ...cur,
      id,
      nutrition_target_calories: parseNum(patch.calories ?? calories),
      nutrition_target_proteins: parseNum(patch.proteins ?? proteins),
      nutrition_target_fats: parseNum(patch.fats ?? fats),
      nutrition_target_carbs: parseNum(patch.carbs ?? carbs),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <SettingsSectionCard
      title="Цели КБЖУ"
      leadingIcon={Target}
      contentClassName="gap-2"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/15 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ккал</p>
          <ActAffixValueField
            id="nt-cal"
            ariaLabel="Калории"
            suffix="ккал"
            value={calories}
            onCommit={(next) => {
              setCalories(next);
              persist({ calories: next });
            }}
            placeholder="0"
            inputKind="number"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/15 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Белки</p>
          <ActAffixValueField
            id="nt-p"
            ariaLabel="Белки"
            suffix="г"
            value={proteins}
            onCommit={(next) => {
              setProteins(next);
              persist({ proteins: next });
            }}
            placeholder="0"
            inputKind="number"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/15 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Жиры</p>
          <ActAffixValueField
            id="nt-f"
            ariaLabel="Жиры"
            suffix="г"
            value={fats}
            onCommit={(next) => {
              setFats(next);
              persist({ fats: next });
            }}
            placeholder="0"
            inputKind="number"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/15 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Углеводы</p>
          <ActAffixValueField
            id="nt-c"
            ariaLabel="Углеводы"
            suffix="г"
            value={carbs}
            onCommit={(next) => {
              setCarbs(next);
              persist({ carbs: next });
            }}
            placeholder="0"
            inputKind="number"
          />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
