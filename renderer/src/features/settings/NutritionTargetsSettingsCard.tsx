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

  const fields = [
    { id: 'nt-cal', label: 'Ккал', suffix: 'ккал', value: calories, ariaLabel: 'Калории',
      borderCn: 'border-r border-b border-[var(--aura-border-soft)] sm:border-b-0',
      onCommit: (next: string) => { setCalories(next); persist({ calories: next }); } },
    { id: 'nt-p', label: 'Белки', suffix: 'г', value: proteins, ariaLabel: 'Белки',
      borderCn: 'border-b border-[var(--aura-border-soft)] sm:border-r sm:border-b-0',
      onCommit: (next: string) => { setProteins(next); persist({ proteins: next }); } },
    { id: 'nt-f', label: 'Жиры', suffix: 'г', value: fats, ariaLabel: 'Жиры',
      borderCn: 'border-r border-[var(--aura-border-soft)] sm:border-b-0',
      onCommit: (next: string) => { setFats(next); persist({ fats: next }); } },
    { id: 'nt-c', label: 'Углеводы', suffix: 'г', value: carbs, ariaLabel: 'Углеводы',
      borderCn: '',
      onCommit: (next: string) => { setCarbs(next); persist({ carbs: next }); } },
  ];

  return (
    <SettingsSectionCard title="Цели КБЖУ" leadingIcon={Target} contentClassName="gap-0">
      <div className="w-full overflow-hidden rounded-xl border border-[var(--aura-border-soft)]">
        <div className="grid w-full grid-cols-2 sm:grid-cols-4">
          {fields.map((f) => (
            <div key={f.id} className={`flex flex-col gap-1.5 px-3 py-2.5 ${f.borderCn}`}>
              <p className="aura-label">{f.label}</p>
              <ActAffixValueField
                id={f.id}
                ariaLabel={f.ariaLabel}
                suffix={f.suffix}
                value={f.value}
                onCommit={f.onCommit}
                placeholder="0"
                inputKind="number"
              />
            </div>
          ))}
        </div>
      </div>
    </SettingsSectionCard>
  );
}
