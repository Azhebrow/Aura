import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculatePresetNutrition, calculateProductNutrition } from '@/shared/lib/nutrition-calc';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { Apple, UtensilsCrossed } from 'lucide-react';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import type { AuraDatabase } from '@/types/aura';
import type { AuraRow } from '@/types/aura';
import {
  ActField,
  ActAffixValueField,
  ActFormTable,
  ActModal,
  ActModalFooter,
  ActModeSwitch,
} from '@/features/act/ActModal';

type Props = {
  db: AuraDatabase;
  dateString: string;
  onAdded?: () => void;
  onSaved?: () => void;
  editEntry?: AuraRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
};

const NUTRITION_GROUP_ICON: Record<string, string> = {
  proteins: 'beef',
  fats: 'flame',
  carbs: 'wheat',
};

export function AddNutritionDialog({ db, dateString, onAdded, onSaved, editEntry, open, onOpenChange, trigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [kind, setKind] = useState<'product' | 'preset'>('product');
  const [itemId, setItemId] = useState<string>('');
  const [portions, setPortions] = useState('1');
  const [grams, setGrams] = useState('');
  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? Boolean(open) : internalOpen;
  const isEditMode = Boolean(editEntry?.id);

  const setDialogOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const products = useMemo(
    () =>
      db
        .getAll('cfg_nutrition_products')
        .filter((p) => p.id)
        .sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru')),
    [db, isOpen]
  );
  const presets = useMemo(
    () =>
      db
        .getAll('cfg_nutrition_presets')
        .filter((p) => p.id)
        .sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru')),
    [db, isOpen]
  );

  const productsById = useMemo(() => {
    const m: Record<string, AuraRow> = {};
    products.forEach((p) => {
      m[String(p.id)] = p;
    });
    return m;
  }, [products]);

  const preview = useMemo(() => {
    if (!itemId) return null;
    if (kind === 'product') {
      const q = parseFloat(portions.replace(',', '.')) || 0;
      if (q <= 0) return null;
      const p = productsById[itemId];
      if (!p) return null;
      return calculateProductNutrition(p, q, false);
    }
    const pr = presets.find((x) => String(x.id) === itemId);
    if (!pr) return null;
    // Для блюда показываем базовый превью-состав без множителя порций.
    return calculatePresetNutrition(pr, 1, productsById);
  }, [itemId, kind, portions, presets, productsById]);

  const presetIngredientsPreview = useMemo(() => {
    if (kind !== 'preset' || !itemId) return [];
    const pr = presets.find((x) => String(x.id) === itemId);
    if (!pr) return [];
    let ingredients: Array<{ product_id?: string; portions?: number }> = [];
    try {
      ingredients = JSON.parse(String(pr.products || '[]'));
      if (!Array.isArray(ingredients)) ingredients = [];
    } catch {
      ingredients = [];
    }
    return ingredients
      .map((ingredient, index) => {
        const productId = ingredient?.product_id ? String(ingredient.product_id) : '';
        const product = productId ? productsById[productId] : null;
        const ingredientPortions = Number(ingredient?.portions || 0);
        if (!product || ingredientPortions <= 0) return null;
        const weight = Math.max(0, (Number(product.portion_weight) || 0) * ingredientPortions);
        return {
          key: `${productId}-${index}`,
          title: String(product.title ?? productId),
          weight,
        };
      })
      .filter((x): x is { key: string; title: string; weight: number } => x != null);
  }, [kind, itemId, presets, productsById]);

  const portionWeight = useMemo(() => {
    if (!itemId) return 0;
    if (kind === 'product') {
      const p = productsById[itemId];
      return Math.max(0, Number(p?.portion_weight) || 0);
    }
    const pr = presets.find((x) => String(x.id) === itemId);
    if (!pr) return 0;
    return Math.max(0, calculatePresetNutrition(pr, 1, productsById).weight);
  }, [itemId, kind, presets, productsById]);

  const fmt = (n: number) => {
    if (!Number.isFinite(n)) return '';
    return String(parseFloat(n.toFixed(3)));
  };

  useEffect(() => {
    if (!isOpen) return;
    if (editEntry?.id) {
      setKind(editEntry.product_id ? 'product' : 'preset');
      setItemId(String(editEntry.product_id ?? editEntry.preset_id ?? ''));
      const parsedPortions = Number(editEntry.portions);
      setPortions(Number.isFinite(parsedPortions) && parsedPortions > 0 ? String(parsedPortions) : '1');
      setGrams('');
      return;
    }
    setKind('product');
    setItemId('');
    setPortions('1');
    setGrams('');
  }, [editEntry, isOpen]);

  useEffect(() => {
    if (!isOpen || isEditMode) return;
    if (kind === 'product') {
      if (!products.length) {
        setItemId('');
        return;
      }
      const firstId = String(products[0].id ?? '');
      setItemId((prev) => (prev && products.some((p) => String(p.id) === prev) ? prev : firstId));
      return;
    }
    if (!presets.length) {
      setItemId('');
      return;
    }
    const firstId = String(presets[0].id ?? '');
    setItemId((prev) => (prev && presets.some((p) => String(p.id) === prev) ? prev : firstId));
  }, [isOpen, isEditMode, kind, products, presets]);

  useEffect(() => {
    if (!isOpen || kind !== 'product') return;
    const q = parseFloat(portions.replace(',', '.'));
    if (!Number.isFinite(q) || q <= 0 || portionWeight <= 0) {
      setGrams('');
      return;
    }
    setGrams(fmt(q * portionWeight));
  }, [isOpen, portions, portionWeight]);

  const save = () => {
    if (!itemId) return;
    const q = kind === 'product' ? parseFloat(portions.replace(',', '.')) || 0 : 1;
    if (kind === 'product' && q <= 0) return;
    const now = new Date().toISOString();
    let row: AuraRow | null = null;
    let ingredientRows: AuraRow[] = [];
    let presetEditMode = false;
    if (kind === 'product') {
      const p = productsById[itemId];
      if (!p) return;
      const n = calculateProductNutrition(p, q, false);
      row = {
        id: String(editEntry?.id ?? `nut_${dateString.replace(/-/g, '')}_${Date.now()}`),
        date: dateString,
        product_id: itemId,
        preset_id: null,
        portions: q,
        total_calories: n.calories,
        total_proteins: n.proteins,
        total_fats: n.fats,
        total_carbs: n.carbs,
        created_at: editEntry?.created_at ?? now,
        updated_at: now,
      };
    } else {
      const pr = presets.find((x) => String(x.id) === itemId);
      if (!pr) return;
      let ingredients: Array<{ product_id?: string; portions?: number }> = [];
      try {
        ingredients = JSON.parse(String(pr.products || '[]'));
        if (!Array.isArray(ingredients)) ingredients = [];
      } catch {
        ingredients = [];
      }
      ingredientRows = ingredients
        .map((ingredient, index) => {
          const ingredientProductId = ingredient?.product_id ? String(ingredient.product_id) : '';
          const ingredientPortions = Number(ingredient?.portions || 0);
          if (!ingredientProductId || ingredientPortions <= 0) return null;
          const product = productsById[ingredientProductId];
          if (!product) return null;
          const totalPortions = ingredientPortions * q;
          if (totalPortions <= 0) return null;
          const n = calculateProductNutrition(product, totalPortions, false);
          return {
            id: String(
              `nut_${dateString.replace(/-/g, '')}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`
            ),
            date: dateString,
            product_id: ingredientProductId,
            preset_id: null,
            portions: totalPortions,
            total_calories: n.calories,
            total_proteins: n.proteins,
            total_fats: n.fats,
            total_carbs: n.carbs,
            created_at: now,
            updated_at: now,
          } as AuraRow;
        })
        .filter((r): r is AuraRow => r != null);
      if (ingredientRows.length === 0) return;
      presetEditMode = Boolean(isEditMode && editEntry?.id);
    }
    runAuraMutation('nutrition', () => {
      if (ingredientRows.length > 0) {
        if (presetEditMode && editEntry?.id) {
          const [first, ...rest] = ingredientRows;
          db.updateNutritionEntry(String(editEntry.id), {
            product_id: first.product_id,
            preset_id: null,
            portions: first.portions,
            total_calories: first.total_calories,
            total_proteins: first.total_proteins,
            total_fats: first.total_fats,
            total_carbs: first.total_carbs,
          });
          rest.forEach((r) => db.addNutritionEntry(r));
        } else {
          ingredientRows.forEach((r) => db.addNutritionEntry(r));
        }
      }
      if (row) {
        if (isEditMode) db.updateNutritionEntry(String(row.id), row);
        else db.addNutritionEntry(row);
      }
    });
    setDialogOpen(false);
    setItemId('');
    setPortions('1');
    onAdded?.();
    onSaved?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setDialogOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" size="sm">
              Добавить
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <ActModal
        icon={UtensilsCrossed}
        title={isEditMode ? 'Редактирование приёма пищи' : 'Питание'}
        contentClassName="shadow-none ring-1 ring-border/60"
        footer={
          <ActModalFooter
            onCancel={() => setDialogOpen(false)}
            onSubmit={save}
            submitDisabled={!itemId}
            submitLabel={isEditMode ? 'Обновить' : 'Сохранить'}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <ActFormTable>
            <ActField label="Режим">
              <ActModeSwitch
                value={kind}
                onValueChange={(v) => setKind(v as 'product' | 'preset')}
                options={[
                  { value: 'product', label: 'Продукт', icon: Apple },
                  { value: 'preset', label: 'Блюдо', icon: UtensilsCrossed },
                ]}
              />
            </ActField>

            <ActField label={kind === 'product' ? 'Продукт' : 'Блюдо'}>
              <Select
                value={itemId}
                onValueChange={(v) => {
                  setItemId(v);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-0 justify-center rounded-md text-center">
                  <SelectValue placeholder="Выберите…" />
                </SelectTrigger>
                <SelectContent>
                  {kind === 'product' ? (
                    <SelectGroup>
                      <SelectLabel>Продукты</SelectLabel>
                      {products.map((p) => {
                        const iconName = NUTRITION_GROUP_ICON[String(p.group ?? 'proteins')] ?? 'apple';
                        const tint = typeof p.color === 'string' && p.color.trim() ? String(p.color) : undefined;
                        return (
                          <SelectItem key={String(p.id)} value={String(p.id)}>
                            <span className="flex items-center gap-2">
                              {iconName ? (
                                tint ? (
                                  <ColoredAuraIcon name={iconName} tint={tint} size={16} className="shrink-0" />
                                ) : (
                                  <ColoredAuraIcon name={iconName} tint="var(--foreground)" size={16} className="shrink-0" />
                                )
                              ) : (
                                <Apple className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              )}
                              <span className="truncate">{String(p.title)}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ) : (
                    <SelectGroup>
                      <SelectLabel>Блюда</SelectLabel>
                      {presets.map((p) => {
                        const iconName = typeof p.icon === 'string' ? p.icon : null;
                        const tint = typeof p.color === 'string' && p.color.trim() ? String(p.color) : undefined;
                        return (
                          <SelectItem key={String(p.id)} value={String(p.id)}>
                            <span className="flex items-center gap-2">
                              {iconName ? (
                                tint ? (
                                  <ColoredAuraIcon name={iconName} tint={tint} size={16} className="shrink-0" />
                                ) : (
                                  <ColoredAuraIcon name={iconName} tint="var(--foreground)" size={16} className="shrink-0" />
                                )
                              ) : (
                                <UtensilsCrossed className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              )}
                              <span className="truncate">{String(p.title)}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </ActField>

            {kind === 'product' ? (
              <>
                <ActField label="Порции">
                  <ActAffixValueField
                    id="nutrition-portions"
                    ariaLabel="Порции"
                    value={portions}
                    suffix="порц"
                    inputKind="number"
                    onCommit={(next) => {
                      setPortions(next);
                      const q = parseFloat(next.replace(',', '.'));
                      if (!Number.isFinite(q) || q <= 0 || portionWeight <= 0) {
                        setGrams('');
                        return;
                      }
                      setGrams(fmt(q * portionWeight));
                    }}
                  />
                </ActField>
                <ActField label="Граммы">
                  <ActAffixValueField
                    id="nutrition-grams"
                    ariaLabel="Граммы"
                    value={grams}
                    suffix="г"
                    inputKind="number"
                    onCommit={(next) => {
                      setGrams(next);
                      const g = parseFloat(next.replace(',', '.'));
                      if (!Number.isFinite(g) || g <= 0 || portionWeight <= 0) {
                        setPortions('');
                        return;
                      }
                      setPortions(fmt(g / portionWeight));
                    }}
                  />
                </ActField>
              </>
            ) : null}

            <ActField label="Предпросмотр">
              {preview ? (
                <div className="text-muted-foreground flex w-full flex-col gap-1.5 text-sm">
                  <p className="text-foreground text-base font-medium tracking-tight">
                    Ккал {Math.round(preview.calories)} · Б {preview.proteins.toFixed(1)} · Ж {preview.fats.toFixed(1)} · У{' '}
                    {preview.carbs.toFixed(1)}
                  </p>
                  {kind === 'preset' ? (
                    presetIngredientsPreview.length > 0 ? (
                      <ul className="space-y-1">
                        {presetIngredientsPreview.map((item) => (
                          <li key={item.key} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate">{item.title}</span>
                            <span className="tabular-nums">{Math.round(item.weight)} г</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs">В блюде пока нет состава.</p>
                    )
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Выберите продукт/блюдо и порцию.</p>
              )}
            </ActField>
          </ActFormTable>
        </div>
      </ActModal>
    </Dialog>
  );
}
