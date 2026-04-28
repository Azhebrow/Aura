import { useCallback, useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActAffixValueField } from '@/features/act/ActModal';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { readNutritionTargets } from '@/shared/lib/nutrition-aggregate';
import { SettingsFormTable, SettingsField } from '@/features/settings/settings-form-primitives';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';
import type { AuraRow } from '@/types/aura';

export function NutritionTargetsSettingsCard() {
  const { db, ready } = useAuraDb();
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [fats, setFats] = useState('');
  const [carbs, setCarbs] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    const t = readNutritionTargets(cur);
    setCalories(t.calories > 0 ? String(Math.round(t.calories)) : '');
    setProteins(t.proteins > 0 ? String(Math.round(t.proteins)) : '');
    setFats(t.fats > 0 ? String(Math.round(t.fats)) : '');
    setCarbs(t.carbs > 0 ? String(Math.round(t.carbs)) : '');
  }, [db]);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  const parseNum = (s: string) => {
    const t = s.replace(',', '.').trim();
    if (t === '') return 0;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : 0;
  };

  const save = () => {
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    const id = String(cur.id ?? 'app_settings_1');
    db.saveAppSettings({
      ...cur,
      id,
      nutrition_target_calories: parseNum(calories),
      nutrition_target_proteins: parseNum(proteins),
      nutrition_target_fats: parseNum(fats),
      nutrition_target_carbs: parseNum(carbs),
      updated_at: new Date().toISOString(),
    });
    setSavedAt(Date.now());
  };

  return (
    <SettingsSectionCard
      title="Цели на день"
      leadingIcon={Target}
      description="Пороги для полос в дневнике. Ноль — цель не задана, показывается только сумма за день."
      footnote="Хранится в app_settings; те же значения используются на вкладке «Питание»."
    >
      <SettingsFormTable>
        <SettingsField id="nt-cal" label="Ккал" hint="Суточная цель по калориям.">
          <ActAffixValueField
            id="nt-cal"
            ariaLabel="Калории"
            suffix="ккал"
            value={calories}
            onCommit={setCalories}
            placeholder="0"
            inputKind="number"
          />
        </SettingsField>
        <SettingsField id="nt-p" label="Белки" hint="Граммы в день.">
          <ActAffixValueField
            id="nt-p"
            ariaLabel="Белки"
            suffix="г"
            value={proteins}
            onCommit={setProteins}
            placeholder="0"
            inputKind="number"
          />
        </SettingsField>
        <SettingsField id="nt-f" label="Жиры" hint="Граммы в день.">
          <ActAffixValueField
            id="nt-f"
            ariaLabel="Жиры"
            suffix="г"
            value={fats}
            onCommit={setFats}
            placeholder="0"
            inputKind="number"
          />
        </SettingsField>
        <SettingsField id="nt-c" label="Углеводы" hint="Граммы в день.">
          <ActAffixValueField
            id="nt-c"
            ariaLabel="Углеводы"
            suffix="г"
            value={carbs}
            onCommit={setCarbs}
            placeholder="0"
            inputKind="number"
          />
        </SettingsField>
      </SettingsFormTable>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={!ready || !db}>
          Сохранить
        </Button>
        {savedAt != null ? (
          <span className="text-muted-foreground text-xs tabular-nums">Сохранено</span>
        ) : null}
      </div>
    </SettingsSectionCard>
  );
}
