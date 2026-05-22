// ─── CfgPresetProductsPanel ───────────────────────────────────────────────────
// Панель редактирования состава блюда (ингредиентов) в диалоге CFG-пресетов
// питания. Отображается как «шаг 2» внутри SettingsDialogLayout.

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { ActAffixValueField } from '@/features/act/ActModal';
import { calculateProductNutrition } from '@/shared/lib/nutrition-calc';
import type { AuraRow } from '@/types/aura';
import { parseLocalFloat, type PresetIngredientDraft } from './cfg-field-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  presetIngredients: PresetIngredientDraft[];
  onIngredientsChange: (update: (prev: PresetIngredientDraft[]) => PresetIngredientDraft[]) => void;
  nutritionProducts: AuraRow[];
  nutritionProductsById: Record<string, AuraRow>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CfgPresetProductsPanel({
  presetIngredients,
  onIngredientsChange,
  nutritionProducts,
  nutritionProductsById,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Header strip */}
      <div className="border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] flex items-center justify-between rounded-md border px-3 py-2">
        <p className="text-muted-foreground text-xs">Добавьте продукты и укажите порции или граммовку.</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 px-2 text-xs"
          onClick={() => {
            const firstProductId = nutritionProducts[0]?.id != null ? String(nutritionProducts[0].id) : '';
            onIngredientsChange((prev) => [
              ...prev,
              { product_id: firstProductId, amount: '1', unit: 'portions' },
            ]);
          }}
          disabled={nutritionProducts.length === 0}
        >
          Добавить продукт
        </Button>
      </div>

      {/* Empty states */}
      {nutritionProducts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Сначала добавьте продукты в разделе «Продукты».</p>
      ) : presetIngredients.length === 0 ? (
        <EmptyState
          title="Пока нет ингредиентов в составе блюда."
          hint="Добавьте продукты в состав, чтобы считать КБЖУ автоматически."
          compact
        />
      ) : (
        /* Ingredient rows */
        <div className="flex flex-col gap-2">
          {presetIngredients.map((it, idx) => {
            const selectedProduct = nutritionProductsById[it.product_id];
            const amountNum = parseLocalFloat(it.amount);
            const portionWeight = Number(selectedProduct?.portion_weight) || 0;
            const previewPortions =
              Number.isFinite(amountNum) && amountNum > 0
                ? it.unit === 'grams'
                  ? portionWeight > 0 ? amountNum / portionWeight : 0
                  : amountNum
                : 0;
            const rowNutrition =
              selectedProduct && previewPortions > 0
                ? calculateProductNutrition(selectedProduct, previewPortions, false)
                : null;

            return (
              <div
                key={`${idx}-${it.product_id}`}
                className="border-border/70 grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.75rem_auto]"
              >
                {/* Product selector */}
                <Select
                  value={it.product_id || '__none__'}
                  onValueChange={(v) =>
                    onIngredientsChange((prev) =>
                      prev.map((x, i) => {
                        if (i !== idx) return x;
                        const nextProductId = v === '__none__' ? '' : v;
                        const next = { ...x, product_id: nextProductId };
                        if (next.unit === 'grams') {
                          const p = nutritionProductsById[nextProductId];
                          const current = parseLocalFloat(next.amount);
                          if (!Number.isFinite(current) || current <= 0) {
                            next.amount = String(Math.max(1, Number(p?.portion_weight) || 100));
                          }
                        }
                        return next;
                      })
                    )
                  }
                >
                  <SelectTrigger contentAlign="start" className="h-8 w-full text-xs">
                    <SelectValue placeholder="Продукт" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Выберите продукт —</SelectItem>
                    {nutritionProducts.map((p) => (
                      <SelectItem key={String(p.id)} value={String(p.id)}>
                        {String(p.title ?? p.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Amount */}
                <ActAffixValueField
                  id={`preset-ingredient-amount-${idx}`}
                  ariaLabel="Количество"
                  value={it.amount}
                  onCommit={(next) =>
                    onIngredientsChange((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, amount: next } : x))
                    )
                  }
                  placeholder="0"
                  inputKind="number"
                  suffix={it.unit === 'grams' ? 'г' : 'порц'}
                />

                {/* Unit selector */}
                <Select
                  value={it.unit}
                  onValueChange={(v) =>
                    onIngredientsChange((prev) =>
                      prev.map((x, i) => {
                        if (i !== idx) return x;
                        const nextUnit = v as 'portions' | 'grams';
                        if (nextUnit === x.unit) return x;
                        const next = { ...x, unit: nextUnit };
                        const p = nutritionProductsById[next.product_id];
                        const pw = Number(p?.portion_weight) || 0;
                        const cur = parseLocalFloat(next.amount);
                        if (pw > 0 && Number.isFinite(cur) && cur > 0) {
                          next.amount =
                            nextUnit === 'grams'
                              ? String(Math.max(1, cur * pw))
                              : String(Math.max(0.1, cur / pw));
                        } else if (nextUnit === 'grams') {
                          next.amount = String(Math.max(1, pw || 100));
                        } else {
                          next.amount = String(Math.max(0.1, Number.isFinite(cur) ? cur : 1));
                        }
                        return next;
                      })
                    )
                  }
                >
                  <SelectTrigger contentAlign="center" className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portions">Порции</SelectItem>
                    <SelectItem value="grams">Граммы</SelectItem>
                  </SelectContent>
                </Select>

                {/* Delete button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive h-8 w-8 justify-self-end"
                  onClick={() =>
                    onIngredientsChange((prev) => {
                      const next = prev.filter((_, i) => i !== idx);
                      return next.length > 0 ? next : [{ product_id: '', amount: '1', unit: 'portions' }];
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>

                {/* Nutrition preview */}
                <div className="text-muted-foreground col-span-full text-xs">
                  {rowNutrition ? (
                    <span>
                      ~{Math.round(rowNutrition.weight)}г · {Math.round(rowNutrition.calories)} ккал ·
                      Б {rowNutrition.proteins.toFixed(1)} · Ж {rowNutrition.fats.toFixed(1)} ·
                      У {rowNutrition.carbs.toFixed(1)}
                    </span>
                  ) : (
                    <span>Укажите корректный продукт и количество.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
