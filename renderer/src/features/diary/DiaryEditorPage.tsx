import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bold, BookText, Check, Eraser, Heading2, Italic,
  List, ListOrdered, Strikethrough, Underline, Lock, UtensilsCrossed, Apple,
} from 'lucide-react';
import { NutritionDaySummaryBar } from '@/features/diary/NutritionDaySummaryBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { AuraIconBadge } from '@/widgets/aura-icon/AuraIconBadge';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import { calculateProductNutrition } from '@/shared/lib/nutrition-calc';
import { readNutritionTargets, sumNutritionDay } from '@/shared/lib/nutrition-aggregate';
import { NUTRITION_GROUP_ICON, NUTRITION_GROUP_LABEL_LC, type NutritionGroup } from '@/shared/config/nutrition-meta';
import { cn } from '@/lib/utils';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { Card, CardContent } from '@/components/ui/card';
import type { AuraRow } from '@/types/aura';
import {
  MEGA_PAGEFRAME_CN, MEGA_PAGEFRAME_CONTENT_CN, MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN, MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { MobilePageShell } from '@/shared/ui/mobile';
import { ANIM } from '@/shared/lib/animation-classes';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { useDiaryEditor } from '@/features/diary/use-diary-editor';
import { useDiaryData, normalizeDiaryDate, normalizeDiaryPresetText, shortenText } from '@/features/diary/use-diary-data';
import { ActComposerValueField, ActList, ActSelectOptionLabel, type ActItem } from '@/features/act-system';
import { ActField, ActFormTable, ActModal, ActModalFooter, ActTableBox } from '@/features/act/ActModal';

type RightTab = 'nutrition' | 'entries';
const DIARY_NO_CATEGORY_VALUE = '__none__';

function diaryTextPreview(raw: unknown, max = 160, emptyLabel = 'Empty entry') {
  const plain = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, ' ') : '';
  const s = plain.trim().replace(/\s+/g, ' ');
  if (!s) return emptyLabel;
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

function toPlainText(raw: string) {
  return raw.replace(/<[^>]*>/g, ' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function nutritionCfgHint(product: AuraRow | null): string | null {
  if (!product) return null;
  const portionWeight = Math.round(Number(product.portion_weight) || 0);
  return portionWeight > 0 ? `${portionWeight} г` : null;
}

function nutritionGroupColor(group: unknown): string {
  if (group === 'proteins') return 'var(--nutrition-proteins)';
  if (group === 'fats') return 'var(--nutrition-fats)';
  if (group === 'carbs') return 'var(--nutrition-carbs)';
  return 'var(--primary)';
}

function parseComposerNumber(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0;
}

function formatComposerNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, '').replace(/\.$/, '');
}

type DiaryPrompt = {
  text: string;
  description?: string;
};

function pickNextPromptIndex(length: number, current: number): number {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  if (next === current) next = (next + 1) % length;
  return next;
}

function DiaryFadePrompt({ prompts, fallback }: { prompts: DiaryPrompt[]; fallback: string }) {
  const normalizedPrompts = useMemo(() => {
    const items = prompts
      .map((prompt) => ({
        text: normalizeDiaryPresetText(prompt.text),
        description: normalizeDiaryPresetText(prompt.description),
      }))
      .filter((prompt) => prompt.text);
    return items.length > 0 ? items : [{ text: fallback, description: '' }];
  }, [fallback, prompts]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const activePrompt = normalizedPrompts[promptIndex] ?? normalizedPrompts[0];
  const activeText = activePrompt?.text ?? fallback;

  useEffect(() => {
    setPromptIndex((current) => (current < normalizedPrompts.length ? current : 0));
    setVisible(true);
  }, [normalizedPrompts.length]);

  useEffect(() => {
    const fadeOutId = window.setTimeout(() => setVisible(false), 9200);
    const nextId = window.setTimeout(() => {
      setPromptIndex((current) => pickNextPromptIndex(normalizedPrompts.length, current));
      setVisible(true);
    }, 10800);

    return () => {
      window.clearTimeout(fadeOutId);
      window.clearTimeout(nextId);
    };
  }, [activeText, normalizedPrompts.length]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden px-3 py-3 sm:px-4">
      <div
        className={cn(
          'transition-colors duration-[1800ms] ease-out',
          visible ? 'text-[var(--aura-text-disabled)]' : 'text-transparent'
        )}
      >
        <p className="select-none text-base italic leading-relaxed">
          «{activeText}»
        </p>
        {activePrompt?.description ? (
          <p
            className={cn(
              'mt-2.5 select-none text-xs font-medium tracking-wide transition-colors delay-700 duration-[1800ms] ease-out',
              visible ? 'text-[color-mix(in_oklab,var(--aura-text-disabled)_70%,transparent)]' : 'text-transparent'
            )}
          >
          — {activePrompt.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function DiaryEditorPage() {
  const { t } = useTranslation('common');
  const { dateString, setDateString } = useSelectedDate();
  const { db } = useAuraDb();
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const dataRefreshTick = useAuraDataRefresh({ types: ['diary', 'nutrition', 'cfg'] });
  const visibility = useMemo(() => getPageSectionsFromSettings(db?.getAppSettings() ?? null), [db]);

  const [rightTab, setRightTab] = useState<RightTab>('nutrition');
  const [mobileSection, setMobileSection] = useState<'entry' | 'nutrition' | 'entries'>('entry');
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [entriesSearch, setEntriesSearch] = useState('');
  const [entriesCategoryFilters, setEntriesCategoryFilters] = useState<string[]>([]);
  const [nutritionTick, setNutritionTick] = useState(0);
  const [nutritionComposerEditingId, setNutritionComposerEditingId] = useState<string | null>(null);
  const [nutritionComposerKind, setNutritionComposerKind] = useState<'product' | 'preset'>('product');
  const [nutritionComposerItemId, setNutritionComposerItemId] = useState('');
  const [nutritionComposerPortions, setNutritionComposerPortions] = useState('1');

  const editor = useDiaryEditor({ db, dateString, dayLocked });
  const {
    text, spellcheckEnabled, setSpellcheckEnabled,
    moodId, setMoodId, categoryId, setCategoryId,
    isEntryEmpty, setEditorRef, applyEditorCommand,
    editorRef, saveEditorSelection, persist,
  } = editor;

  const data = useDiaryData({
    db, dateString, entriesSearch, entriesCategoryFilters,
    dataRefreshTick, moodId, categoryId, emptyEntryLabel: t('diary.empty_entry'),
  });
	  const {
	    moods, categories, moodById, categoryById,
	    filteredDiaryEntries, activeEntryPreset, entryPresets,
	    moodIdx, activeMood, activeCategory,
	  } = data;

  const entryPresetTitle = useMemo(() => {
    const rawTitle = normalizeDiaryPresetText(activeEntryPreset?.title);
    const fallback = normalizeDiaryPresetText(activeEntryPreset?.prompt);
    if (rawTitle && rawTitle !== t('diary.new_quote')) return rawTitle;
    return fallback ? shortenText(fallback) : t('diary.entry');
  }, [activeEntryPreset, t]);

	  const entryPresetPrompt = useMemo(() => {
	    const prompt = normalizeDiaryPresetText(activeEntryPreset?.prompt);
	    if (!prompt) return `${t('diary.entry')}…`;
	    return prompt.endsWith('…') || prompt.endsWith('...') ? prompt : `${prompt}…`;
	  }, [activeEntryPreset, t]);

	  const typewriterPrompts = useMemo<DiaryPrompt[]>(
	    () => entryPresets.map((preset) => ({
	      text: String(preset.prompt ?? preset.title ?? ''),
	      description: preset.description != null ? String(preset.description) : '',
	    })),
	    [entryPresets]
	  );

  const nutritionEntries = useMemo(() => {
    if (!db) return [];
    void nutritionTick;
    void dataRefreshTick;
    return db.getNutritionEntries(dateString);
  }, [db, dateString, nutritionTick, dataRefreshTick]);

  const nutritionDayTotals = useMemo(() => sumNutritionDay(nutritionEntries), [nutritionEntries]);

  const nutritionDayTargets = useMemo(() => {
    if (!db) return readNutritionTargets(null);
    return readNutritionTargets(db.getAppSettings() as Record<string, unknown> | null);
  }, [db, nutritionTick]);
  const nutritionProducts = useMemo(
    () =>
      db
        ? db
            .getAll('cfg_nutrition_products')
            .filter((p) => p.id)
            .sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru'))
        : [],
    [db, dataRefreshTick, nutritionTick]
  );
  const nutritionPresets = useMemo(
    () =>
      db
        ? db
            .getAll('cfg_nutrition_presets')
            .filter((p) => p.id)
            .sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru'))
        : [],
    [db, dataRefreshTick, nutritionTick]
  );
  const nutritionProductsById = useMemo(() => {
    const out: Record<string, AuraRow> = {};
    nutritionProducts.forEach((product) => {
      out[String(product.id)] = product;
    });
    return out;
  }, [nutritionProducts]);
  const nutritionComposerProduct = nutritionComposerKind === 'product'
    ? nutritionProductsById[nutritionComposerItemId] ?? null
    : null;
  const nutritionComposerPortionWeight = Number(nutritionComposerProduct?.portion_weight) || 0;
  const nutritionComposerGrams = nutritionComposerPortionWeight > 0
    ? formatComposerNumber(parseComposerNumber(nutritionComposerPortions) * nutritionComposerPortionWeight)
    : '';
  const commitNutritionComposerPortions = (next: string) => {
    setNutritionComposerPortions(next);
  };
  const commitNutritionComposerGrams = (next: string) => {
    if (nutritionComposerPortionWeight <= 0) return;
    const grams = parseComposerNumber(next);
    if (grams <= 0) return;
    setNutritionComposerPortions(formatComposerNumber(grams / nutritionComposerPortionWeight));
  };

  useEffect(() => {
    const source = nutritionComposerKind === 'product' ? nutritionProducts : nutritionPresets;
    if (!source.length) {
      setNutritionComposerItemId('');
      return;
    }
    setNutritionComposerItemId((prev) => (prev && source.some((item) => String(item.id) === prev) ? prev : String(source[0].id)));
  }, [nutritionComposerKind, nutritionPresets, nutritionProducts]);

  const saveNutritionComposerEntry = () => {
    if (!db || dayLocked || !nutritionComposerItemId) return;
    const portions = nutritionComposerKind === 'product' ? parseFloat(nutritionComposerPortions.replace(',', '.')) || 0 : 1;
    if (nutritionComposerKind === 'product' && portions <= 0) return;
    const now = new Date().toISOString();
    const editing = nutritionComposerEditingId
      ? nutritionEntries.find((entry) => String(entry.id) === nutritionComposerEditingId)
      : null;
    runAuraMutation('nutrition', () => {
      if (nutritionComposerKind === 'product') {
        const product = nutritionProductsById[nutritionComposerItemId];
        if (!product) return;
        const n = calculateProductNutrition(product, portions, false);
        const payload = {
          date: dateString,
          product_id: nutritionComposerItemId,
          preset_id: null,
          portions,
          total_calories: n.calories,
          total_proteins: n.proteins,
          total_fats: n.fats,
          total_carbs: n.carbs,
          created_at: editing?.created_at ?? now,
          updated_at: now,
        };
        if (nutritionComposerEditingId) db.updateNutritionEntry(nutritionComposerEditingId, payload);
        else db.addNutritionEntry({ id: `nut_${dateString.replace(/-/g, '')}_${Date.now()}`, ...payload });
        return;
      }

      const preset = nutritionPresets.find((item) => String(item.id) === nutritionComposerItemId);
      if (!preset) return;
      let ingredients: Array<{ product_id?: string; portions?: number }> = [];
      try {
        const parsed = JSON.parse(String(preset.products || '[]'));
        if (Array.isArray(parsed)) ingredients = parsed;
      } catch {
        ingredients = [];
      }
      ingredients.forEach((ingredient, index) => {
        const productId = ingredient?.product_id ? String(ingredient.product_id) : '';
        const ingredientPortions = Number(ingredient?.portions || 0);
        const product = productId ? nutritionProductsById[productId] : null;
        if (!product || ingredientPortions <= 0) return;
        const n = calculateProductNutrition(product, ingredientPortions, false);
        const payload = {
          date: dateString,
          product_id: productId,
          preset_id: null,
          portions: ingredientPortions,
          total_calories: n.calories,
          total_proteins: n.proteins,
          total_fats: n.fats,
          total_carbs: n.carbs,
          created_at: index === 0 ? editing?.created_at ?? now : now,
          updated_at: now,
        };
        if (nutritionComposerEditingId && index === 0) db.updateNutritionEntry(nutritionComposerEditingId, payload);
        else db.addNutritionEntry({
          id: `nut_${dateString.replace(/-/g, '')}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
          ...payload,
        });
      });
    }, dateString);
    setNutritionComposerEditingId(null);
    setNutritionTick((n) => n + 1);
  };
  const nutritionItems = useMemo<ActItem[]>(() => {
    if (!db) return [];
    return nutritionEntries.map((e) => {
      const productRow =
        e.product_id ? (db.getById('cfg_nutrition_products', String(e.product_id)) as AuraRow | null) : null;
      const presetRow =
        e.preset_id ? (db.getById('cfg_nutrition_presets', String(e.preset_id)) as AuraRow | null) : null;
      const sourceRow = productRow ?? presetRow;
      const icon =
        productRow != null
          ? NUTRITION_GROUP_ICON[String(productRow.group ?? 'proteins') as NutritionGroup] ?? 'apple'
          : sourceRow && typeof sourceRow.icon === 'string'
            ? sourceRow.icon
            : null;
      const color =
        productRow != null
          ? nutritionGroupColor(productRow.group)
          : sourceRow && typeof sourceRow.color === 'string' && String(sourceRow.color).trim()
          ? String(sourceRow.color)
          : 'var(--primary)';
      const title = sourceRow != null ? String(sourceRow.title ?? sourceRow.id ?? t('diary.entry')) : t('diary.entry');
      const kcal = Math.round(Number(e.total_calories) || 0);
      const p = Math.round(Number(e.total_proteins) || 0);
      const f = Math.round(Number(e.total_fats) || 0);
      const c = Math.round(Number(e.total_carbs) || 0);
      const cfgHint = nutritionCfgHint(productRow);
      const summary = `Б ${p} · Ж ${f} · У ${c} · ${kcal} ккал`;
      return {
        id: String(e.id),
        kind: 'nutrition',
        density: 'compact',
        icon,
        iconTint: color,
        title,
        meta: summary,
        value: cfgHint ?? undefined,
        disabled: dayLocked,
        onEdit: () => {
          if (dayLocked) return;
          setNutritionComposerEditingId(String(e.id));
          setNutritionComposerKind(e.preset_id ? 'preset' : 'product');
          setNutritionComposerItemId(String(e.product_id ?? e.preset_id ?? ''));
          const parsedPortions = Number(e.portions);
          setNutritionComposerPortions(Number.isFinite(parsedPortions) && parsedPortions > 0 ? String(parsedPortions) : '1');
        },
        onDelete: () => {
          if (!db || dayLocked) return;
          if (nutritionComposerEditingId === String(e.id)) setNutritionComposerEditingId(null);
          runAuraMutation('nutrition', () => { db.deleteNutritionEntry(String(e.id)); }, dateString);
          setNutritionTick((n) => n + 1);
        },
      };
    });
  }, [db, dateString, dayLocked, nutritionEntries, t]);
  const diaryHistoryItems = useMemo<ActItem[]>(
    () =>
      filteredDiaryEntries.map((e) => {
        const mood = e.mood_id ? moodById.get(String(e.mood_id)) : undefined;
        const cat = e.category_id ? categoryById.get(String(e.category_id)) : undefined;
        const moodLevel = Number(mood?.level ?? 0);
        const moodValue = mood ? `${moodLevel || '—'}/${Math.max(moods.length, moodLevel || 1)}` : undefined;
        const metaParts = [
          cat ? String(cat.title ?? cat.id ?? '') : t('diary.no_category'),
          mood ? `${String(mood.title ?? mood.id ?? t('diary.mood'))}: ${moodValue}` : null,
        ].filter((part): part is string => part != null);
        return {
          id: String(e.id),
          kind: 'diary',
          title: String(e.date),
          icon: cat && typeof cat.icon === 'string' ? cat.icon : mood && typeof mood.icon === 'string' ? mood.icon : null,
          iconTint: cat && typeof cat.color === 'string' ? cat.color : mood && typeof mood.color === 'string' ? mood.color : undefined,
          value: moodValue,
          meta: metaParts.join(' · '),
          description: diaryTextPreview(e.text, 160, t('diary.empty_entry')),
          onActivate: () => {
            const normalizedDate = normalizeDiaryDate(e.date);
            if (!normalizedDate) return;
            setDateString(normalizedDate);
            setMobileSection('entry');
          },
        };
      }),
    [categoryById, filteredDiaryEntries, moodById, moods.length, setDateString, t]
  );

  const showEntry = visibility.diary.entryPanel;
  const showNutrition = visibility.diary.contentNutrition;
  const showEntries = visibility.diary.contentEntries;

  useEffect(() => {
    if (showNutrition && !showEntries) setRightTab('nutrition');
    else if (!showNutrition && showEntries) setRightTab('entries');
  }, [showNutrition, showEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => setIsDesktopViewport(window.innerWidth >= 1024);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // -- Unused vars suppression (entryPresetPrompt used in JSX below) --
  void entryPresetPrompt;

  const entryColumn = (
    <section className="aura-col h-full">
      <MegaPanelHeader title={isEntryEmpty ? entryPresetTitle : t('diary.entry')} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 overflow-hidden">
          <div className="flex h-10 min-h-10 items-stretch border-b border-soft bg-panel/70 sm:h-11 sm:min-h-11">
            {/* Настроение */}
            <Label htmlFor="diary-mood-slider" className="sr-only">{t('diary.mood')}</Label>
            {moods.length === 0 ? (
              <div className="flex flex-1 items-center px-3 text-dim text-xs">{t('diary.no_moods')}</div>
            ) : (
              <div className="flex min-w-0 flex-1 items-stretch">
                <div className="flex items-center border-r border-soft px-3">
                  <AuraIconBadge
                    name={activeMood && typeof activeMood.icon === 'string' && activeMood.icon.trim() ? activeMood.icon : null}
                    tint={typeof activeMood?.color === 'string' && activeMood.color.trim() ? activeMood.color : 'var(--primary)'}
                    size={7}
                    iconSize={15}
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center px-3">
                  <Slider
                    id="diary-mood-slider"
                    value={[moodIdx]}
                    min={0}
                    max={Math.max(0, moods.length - 1)}
                    step={1}
                    className={cn(
                      'w-full py-0',
                      '[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-control',
                      '[&_[data-slot=slider-range]]:bg-foreground/65',
                      '[&_[data-slot=slider-thumb]]:size-[16px] [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:bg-background [&_[data-slot=slider-thumb]]:shadow'
                    )}
                    aria-label={t('diary.mood')}
                    aria-valuetext={activeMood?.id != null ? t('diary.mood_level', { level: moodIdx + 1 }) : undefined}
                    onValueChange={(vals) => {
                      const idx = Math.min(moods.length - 1, Math.max(0, Math.round(Number(vals[0]) ?? 0)));
                      const m = moods[idx];
                      if (m?.id != null) setMoodId(String(m.id));
                    }}
                  />
                </div>
              </div>
            )}
            {/* Разделитель */}
            <div className="w-px shrink-0 bg-soft" />
            {/* Категория */}
            <Label htmlFor="diary-category" className="sr-only">{t('diary.category')}</Label>
            <div className="flex min-w-0 flex-1 items-stretch">
              <div className="flex items-center border-r border-soft px-3">
                {activeCategory ? (
                  <AuraIconBadge
                    name={typeof activeCategory.icon === 'string' && activeCategory.icon.trim() ? activeCategory.icon : null}
                    tint={typeof activeCategory.color === 'string' && activeCategory.color.trim() ? activeCategory.color : 'var(--foreground)'}
                    size={7}
                    iconSize={15}
                  />
                ) : (
                  <AuraIconBadge name="circle-off" tint="var(--muted-foreground)" size={7} iconSize={15} />
                )}
              </div>
              <Select
                value={categoryId || DIARY_NO_CATEGORY_VALUE}
                onValueChange={(next) => setCategoryId(next === DIARY_NO_CATEGORY_VALUE ? '' : next)}
                disabled={categories.length === 0}
              >
                <SelectTrigger id="diary-category" className="!h-full flex-1 rounded-none border-0 !bg-transparent px-2.5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue placeholder="—">
                    <span className="truncate text-sm">
                      {activeCategory
                        ? String(activeCategory.title ?? activeCategory.id)
                        : t('diary.no_category')}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t('diary.category')}</SelectLabel>
                    <SelectItem value={DIARY_NO_CATEGORY_VALUE} textValue={t('diary.no_category')}>
                      <span className="flex items-center gap-2">
                        <AuraIconBadge name="circle-off" tint="var(--muted-foreground)" size={7} iconSize={15} />
                        <span className="truncate">{t('diary.no_category')}</span>
                      </span>
                    </SelectItem>
                    {categories.map((c) => {
                      const tint = typeof c.color === 'string' && c.color.trim() ? c.color : 'var(--primary)';
                      return (
                        <SelectItem key={String(c.id)} value={String(c.id)} textValue={String(c.title ?? c.id)} tint={tint}>
                          <span className="flex items-center gap-2">
                            <AuraIconBadge name={typeof c.icon === 'string' ? c.icon : null} tint={tint} size={7} iconSize={15} />
                            <span className="truncate">{String(c.title ?? c.id)}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-b border-soft bg-panel/35">
            <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                ['bold', 'formatting.bold', Bold],
                ['italic', 'formatting.italic', Italic],
                ['underline', 'formatting.underline', Underline],
                ['strikeThrough', 'formatting.strikethrough', Strikethrough],
              ] as const).map(([cmd, key, Icon]) => (
                <Button
                  key={cmd}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-dim hover:text-foreground"
                  onMouseDown={(e) => { e.preventDefault(); applyEditorCommand(cmd); }}
                  title={t(key)}
                  aria-label={t(key)}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-dim hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('formatBlock', 'H2'); }}
                title={t('formatting.heading')} aria-label={t('formatting.heading')}
              >
                <Heading2 className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-dim hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('insertUnorderedList'); }}
                title={t('formatting.bullet_list')} aria-label={t('formatting.bullet_list')}
              >
                <List className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-dim hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('insertOrderedList'); }}
                title={t('formatting.numbered_list')} aria-label={t('formatting.numbered_list')}
              >
                <ListOrdered className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-dim hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('formatBlock', 'BLOCKQUOTE'); }}
                title={t('formatting.quote')} aria-label={t('formatting.quote')}
              >
                <BookText className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-dim hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('removeFormat'); applyEditorCommand('formatBlock', 'P'); }}
                title={t('formatting.clear_format')} aria-label={t('formatting.clear_format')}
              >
                <Eraser className="size-3.5" />
              </Button>
              <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-1.5">
                <span className="aura-meta inline-flex min-w-8 items-center justify-center gap-1">
                  <span className="font-semibold leading-none">A</span>
                  {spellcheckEnabled ? <Check className="size-3" aria-hidden /> : null}
                </span>
                <Switch
                  id="diary-spellcheck"
                  checked={spellcheckEnabled}
                  onCheckedChange={setSpellcheckEnabled}
                  aria-label={t('spellcheck.enabled')}
                  title={t('spellcheck.title')}
                  className="shrink-0"
                />
              </div>
            </div>
          </div>
        </div>
	        <div className="relative min-h-0 flex-1 overflow-hidden bg-card/35">
	          {isEntryEmpty ? (
	            <DiaryFadePrompt prompts={typewriterPrompts} fallback={`${t('diary.entry')}…`} />
	          ) : null}
	          <div
            id="diary-text"
            ref={setEditorRef}
            contentEditable
            suppressContentEditableWarning
	            data-placeholder=""
	            className="text-foreground min-h-0 h-full flex-1 overflow-y-auto bg-transparent px-3 py-3 pb-7 text-base leading-relaxed outline-none sm:px-4 [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-soft [&_blockquote]:pl-3 [&_blockquote]:text-dim [&_blockquote]:italic"
            spellCheck={spellcheckEnabled}
            onInput={(e) => editor.setText((e.currentTarget as HTMLDivElement).innerHTML)}
            onBlur={() => {
              saveEditorSelection();
              persist(editorRef.current?.innerHTML);
            }}
            onMouseUp={saveEditorSelection}
            onKeyUp={saveEditorSelection}
          />
          <span className="text-subtle pointer-events-none absolute bottom-1.5 right-3 text-xs tabular-nums sm:right-4">
            S {toPlainText(text).length}
          </span>
        </div>
      </div>
    </section>
  );

  const rightPanelHeader = showNutrition && showEntries
    ? (
        <>
          <div className="hidden lg:block">
            <ModeSwitchHeader
              value={rightTab}
              onValueChange={(v) => setRightTab(v as RightTab)}
              ariaLabel="Режим контента дневника"
              locked={showNutrition && dayLocked}
              options={[
                { value: 'nutrition', label: 'Питание', icon: showNutrition && dayLocked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : <UtensilsCrossed className="size-3.5 shrink-0" aria-hidden /> },
                { value: 'entries', label: 'Записи', icon: showNutrition && dayLocked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : <BookText className="size-3.5 shrink-0" aria-hidden /> },
              ]}
            />
          </div>
          <div className="lg:hidden">
            <MegaPanelHeader title={mobileSection === 'entries' ? 'Записи' : 'Питание'} locked={mobileSection === 'nutrition' && dayLocked} />
          </div>
        </>
      )
    : (
        <MegaPanelHeader title={showNutrition ? 'Питание' : 'Записи'} locked={showNutrition && dayLocked} />
      );

  const resolvedRightTab: RightTab =
    mobileSection === 'entries' ? 'entries' : mobileSection === 'nutrition' ? 'nutrition' : rightTab;

  const rightPanelBody = (
    <div className={cn(MEGA_PANEL_BODY_CN, 'flex flex-col overflow-hidden', ANIM.enterFade)}>
      {resolvedRightTab === 'nutrition' && showNutrition ? (
        <>
          <NutritionDaySummaryBar totals={nutritionDayTotals} targets={nutritionDayTargets} className={cn('mb-2 shrink-0', dayLocked && 'pointer-events-none opacity-55')} />
          <ActList
            items={nutritionItems}
            emptyTitle="За этот день пока нет приёмов пищи."
            emptyHint="Добавьте продукт или блюдо, чтобы здесь появилась лента питания за день."
            composer={{
              options: [
                { value: 'product', label: 'Продукт', icon: Apple, color: 'var(--nutrition-calories)' },
                { value: 'preset', label: 'Блюдо', icon: UtensilsCrossed, color: 'var(--primary)' },
              ],
              value: nutritionComposerKind,
              onValueChange: (value) => setNutritionComposerKind(value as 'product' | 'preset'),
              fields: (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] [&>*+*]:border-l [&>*+*]:border-soft/50">
                  <Select
                    value={nutritionComposerItemId}
                    onValueChange={setNutritionComposerItemId}
                    disabled={!db || dayLocked || (nutritionComposerKind === 'product' ? nutritionProducts.length === 0 : nutritionPresets.length === 0)}
                  >
                    <SelectTrigger className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                      <SelectValue placeholder={nutritionComposerKind === 'product' ? 'Продукт' : 'Блюдо'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{nutritionComposerKind === 'product' ? 'Продукты' : 'Блюда'}</SelectLabel>
                        {(nutritionComposerKind === 'product' ? nutritionProducts : nutritionPresets).map((item) => (
                          <SelectItem key={String(item.id)} value={String(item.id)} textValue={String(item.title ?? item.id)}>
                            <ActSelectOptionLabel
                              label={String(item.title ?? item.id)}
                              icon={
                                nutritionComposerKind === 'product'
                                  ? NUTRITION_GROUP_ICON[String(item.group ?? 'proteins') as NutritionGroup] ?? 'apple'
                                  : typeof item.icon === 'string'
                                    ? item.icon
                                    : 'utensils'
                              }
                              color={
                                nutritionComposerKind === 'product'
                                  ? nutritionGroupColor(item.group)
                                  : typeof item.color === 'string'
                                    ? item.color
                                    : 'var(--primary)'
                              }
                            />
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <ActComposerValueField
                    id="act-nutrition-portions"
                    ariaLabel="Порции"
                    value={nutritionComposerKind === 'product' ? nutritionComposerPortions : '1'}
                    suffix="порц"
                    inputKind="number"
                    placeholder="1"
                    disabled={nutritionComposerKind !== 'product' || !db || dayLocked}
                    onCommit={commitNutritionComposerPortions}
                  />
                  <ActComposerValueField
                    id="act-nutrition-grams"
                    ariaLabel="Граммы"
                    value={nutritionComposerKind === 'product' ? nutritionComposerGrams : ''}
                    suffix="г"
                    inputKind="number"
                    placeholder={nutritionComposerPortionWeight > 0 ? String(Math.round(nutritionComposerPortionWeight)) : 'г'}
                    disabled={nutritionComposerKind !== 'product' || !db || dayLocked || nutritionComposerPortionWeight <= 0}
                    onCommit={commitNutritionComposerGrams}
                  />
                </div>
              ),
              disabled: !db || dayLocked,
              submitDisabled: !nutritionComposerItemId || (nutritionComposerKind === 'product' && !(parseFloat(nutritionComposerPortions.replace(',', '.')) > 0)),
              submitLabel: nutritionComposerEditingId ? 'Сохранить' : 'Добавить',
              onSubmit: saveNutritionComposerEntry,
            }}
          />
        </>
      ) : null}
      {resolvedRightTab === 'entries' && showEntries ? (
        <>
          <div className="mb-2 shrink-0 overflow-hidden rounded-xl border border-soft bg-card shadow-xs">
            <div className="px-3 py-2">
              <Input
                value={entriesSearch}
                onChange={(e) => setEntriesSearch(e.target.value)}
                placeholder={t('diary.search_placeholder')}
                className="h-8 w-full"
                aria-label={t('diary.search_placeholder')}
              />
            </div>
            <div className="flex divide-x divide-soft border-t border-soft">
              <button
                type="button"
                onClick={() => setEntriesCategoryFilters([])}
                title={t('diary.all_categories')}
                aria-label={t('diary.all_categories')}
                aria-pressed={entriesCategoryFilters.length === 0}
                className={cn(
                  'flex flex-1 items-center justify-center py-2 text-dim aura-tx-interactive hover:bg-hover hover:text-foreground',
                  entriesCategoryFilters.length === 0 && 'bg-control text-foreground'
                )}
              >
                <AuraIconBadge name="circle-off" tint="currentColor" size={6} iconSize={13} />
              </button>
              {categories.map((c) => {
                const catId = String(c.id);
                const active = entriesCategoryFilters.includes(catId);
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() =>
                      setEntriesCategoryFilters((prev) =>
                        prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
                      )
                    }
                    aria-pressed={active}
                    title={String(c.title ?? c.id)}
                    aria-label={String(c.title ?? c.id)}
                    className={cn(
                      'flex flex-1 items-center justify-center py-2 text-dim aura-tx-interactive hover:bg-hover hover:text-foreground',
                      active && 'bg-control text-foreground'
                    )}
                  >
                    <AuraIconBadge name={typeof c.icon === 'string' ? c.icon : null} tint="currentColor" size={6} iconSize={13} />
                  </button>
                );
              })}
            </div>
          </div>
          <ActList
            items={diaryHistoryItems}
            emptyTitle={t('diary.entries_not_found')}
            emptyHint={t('diary.search_hint')}
          />
        </>
      ) : null}
    </div>
  );

  const rightColumn = (
    <section className="aura-col h-full">
      {rightPanelHeader}
      {rightPanelBody}
    </section>
  );

  if (!showEntry && !showNutrition && !showEntries) {
    return (
      <PageFrame>
        <p className="text-muted-foreground text-sm">{t('diary.enable_sections')}</p>
      </PageFrame>
    );
  }

  const bothColumns = showEntry && (showNutrition || showEntries);
  const mobileSections = [
    showEntry ? { id: 'entry' as const, label: t('diary.entry'), Icon: BookText, content: entryColumn } : null,
    showNutrition ? { id: 'nutrition' as const, label: t('diary.nutrition'), Icon: UtensilsCrossed, content: rightColumn } : null,
    showEntries ? { id: 'entries' as const, label: t('diary.entries'), Icon: List, content: rightColumn } : null,
  ].filter(Boolean) as Array<{ id: 'entry' | 'nutrition' | 'entries'; label: string; Icon: typeof BookText; content: ReactNode }>;

  const layout = bothColumns ? (
    <div className="aura-col min-w-0">
      {isDesktopViewport ? (
        <div className="min-h-0 min-w-0 flex-1 divide-y divide-soft overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {showEntry ? entryColumn : null}
          {(showNutrition || showEntries) ? rightColumn : null}
        </div>
      ) : (
        <MobilePageShell
          sections={mobileSections}
          value={mobileSection}
          onChange={setMobileSection}
          locked={showNutrition && dayLocked}
          viewportContentClassName="overflow-hidden pb-0"
        />
      )}
    </div>
  ) : (
    <div className="aura-col min-w-0">
      {isDesktopViewport ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          {showEntry ? entryColumn : rightColumn}
        </div>
      ) : (
        <MobilePageShell
          sections={mobileSections}
          value={mobileSections.some((section) => section.id === mobileSection) ? mobileSection : mobileSections[0]?.id ?? 'entry'}
          onChange={setMobileSection}
          locked={showNutrition && dayLocked}
          viewportContentClassName="overflow-hidden pb-0"
        />
      )}
    </div>
  );

	  return (
	    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
	      <Card className={MEGA_SHELL_CARD_CN}>
	        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
	          {layout}
	        </CardContent>
	      </Card>
	      <Dialog open={nutritionComposerEditingId != null} onOpenChange={(open) => { if (!open) setNutritionComposerEditingId(null); }}>
	        <ActModal
	          title="Редактировать питание"
	          icon={nutritionComposerKind === 'product' ? Apple : UtensilsCrossed}
	          size="md"
	          footer={
	            <ActModalFooter
	              onCancel={() => setNutritionComposerEditingId(null)}
	              onSubmit={saveNutritionComposerEntry}
	              submitDisabled={!nutritionComposerItemId || (nutritionComposerKind === 'product' && !(parseFloat(nutritionComposerPortions.replace(',', '.')) > 0))}
	              submitLabel="Сохранить"
	            />
	          }
	        >
	          <ActTableBox>
	            <ActFormTable>
	              <ActField label="Тип">
	                <div className="grid w-full grid-cols-2 overflow-hidden rounded-md bg-control/35 p-0.5">
	                  {([
	                    { value: 'product' as const, label: 'Продукт', Icon: Apple },
	                    { value: 'preset' as const, label: 'Блюдо', Icon: UtensilsCrossed },
	                  ]).map((option) => {
	                    const selected = nutritionComposerKind === option.value;
	                    return (
	                      <button
	                        key={option.value}
	                        type="button"
	                        onClick={() => setNutritionComposerKind(option.value)}
	                        className={cn(
	                          'flex h-8 items-center justify-center gap-1.5 rounded-sm text-sm font-medium aura-tx-colors',
	                          selected ? 'bg-background text-foreground shadow-xs' : 'text-dim hover:text-foreground'
	                        )}
	                      >
	                        <option.Icon className="size-3.5" />
	                        {option.label}
	                      </button>
	                    );
	                  })}
	                </div>
	              </ActField>
	              <ActField label={nutritionComposerKind === 'product' ? 'Продукт' : 'Блюдо'}>
	                <Select
	                  value={nutritionComposerItemId}
	                  onValueChange={setNutritionComposerItemId}
	                  disabled={!db || dayLocked || (nutritionComposerKind === 'product' ? nutritionProducts.length === 0 : nutritionPresets.length === 0)}
	                >
	                  <SelectTrigger className="h-8 w-full min-w-0 border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
	                    <SelectValue placeholder={nutritionComposerKind === 'product' ? 'Продукт' : 'Блюдо'} />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectGroup>
	                      <SelectLabel>{nutritionComposerKind === 'product' ? 'Продукты' : 'Блюда'}</SelectLabel>
	                      {(nutritionComposerKind === 'product' ? nutritionProducts : nutritionPresets).map((item) => (
	                        <SelectItem key={String(item.id)} value={String(item.id)} textValue={String(item.title ?? item.id)}>
	                          <ActSelectOptionLabel
	                            label={String(item.title ?? item.id)}
	                            icon={
	                              nutritionComposerKind === 'product'
	                                ? NUTRITION_GROUP_ICON[String(item.group ?? 'proteins') as NutritionGroup] ?? 'apple'
	                                : typeof item.icon === 'string'
	                                  ? item.icon
	                                  : 'utensils'
	                            }
	                            color={
	                              nutritionComposerKind === 'product'
	                                ? nutritionGroupColor(item.group)
	                                : typeof item.color === 'string'
	                                  ? item.color
	                                  : 'var(--primary)'
	                            }
	                          />
	                        </SelectItem>
	                      ))}
	                    </SelectGroup>
	                  </SelectContent>
	                </Select>
	              </ActField>
	              <ActField label="Порции">
	                <ActComposerValueField
	                  id="nutrition-edit-portions"
	                  ariaLabel="Порции"
	                  value={nutritionComposerKind === 'product' ? nutritionComposerPortions : '1'}
	                  suffix="порц"
	                  inputKind="number"
	                  placeholder="1"
	                  disabled={nutritionComposerKind !== 'product' || !db || dayLocked}
	                  controlClassName="h-9 rounded-md border border-soft bg-control/45 px-3 shadow-none hover:bg-hover/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/45"
	                  onCommit={commitNutritionComposerPortions}
	                />
	              </ActField>
	              <ActField label="Граммы">
	                <ActComposerValueField
	                  id="nutrition-edit-grams"
	                  ariaLabel="Граммы"
	                  value={nutritionComposerKind === 'product' ? nutritionComposerGrams : ''}
	                  suffix="г"
	                  inputKind="number"
	                  placeholder={nutritionComposerPortionWeight > 0 ? String(Math.round(nutritionComposerPortionWeight)) : 'г'}
	                  disabled={nutritionComposerKind !== 'product' || !db || dayLocked || nutritionComposerPortionWeight <= 0}
	                  controlClassName="h-9 rounded-md border border-soft bg-control/45 px-3 shadow-none hover:bg-hover/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/45"
	                  onCommit={commitNutritionComposerGrams}
	                />
	              </ActField>
	            </ActFormTable>
	          </ActTableBox>
	        </ActModal>
	      </Dialog>
	    </PageFrame>
	  );
	}
