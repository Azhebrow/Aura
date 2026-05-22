import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bold, BookText, Check, CircleOff, Eraser, Heading2, Italic,
  List, ListOrdered, Strikethrough, Underline, Lock, UtensilsCrossed,
} from 'lucide-react';
import { AddNutritionDialog } from '@/features/diary/AddNutritionDialog';
import { NutritionDaySummaryBar } from '@/features/diary/NutritionDaySummaryBar';
import { ListItem } from '@/components/ui/list-item';
import { Button } from '@/components/ui/button';
import { AddListButton } from '@/components/ui/add-list-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
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
  const calories100 = Math.round(Number(product.calories_per_100g) || 0);
  const groupRaw = typeof product.group === 'string' ? product.group : '';
  const groupLabel = NUTRITION_GROUP_LABEL_LC[groupRaw as NutritionGroup] ?? null;
  const parts: string[] = [];
  if (portionWeight > 0) parts.push(`${portionWeight}г/порц`);
  if (groupLabel) parts.push(groupLabel);
  if (calories100 > 0) parts.push(`${calories100}ккал/100г`);
  if (parts.length === 0) return null;
  return `cfg: ${parts.join(' · ')}`;
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
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [editingNutritionEntry, setEditingNutritionEntry] = useState<AuraRow | null>(null);

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
    filteredDiaryEntries, activeEntryPreset,
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
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader title={isEntryEmpty ? entryPresetTitle : t('diary.entry')} />
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4">
        <div className="shrink-0 overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs">
          <div className="flex h-10 min-h-10 items-stretch border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] sm:h-11 sm:min-h-11">
            {/* Настроение */}
            <Label htmlFor="diary-mood-slider" className="sr-only">{t('diary.mood')}</Label>
            {moods.length === 0 ? (
              <div className="flex flex-1 items-center px-3 text-[var(--aura-text-muted)] text-xs">{t('diary.no_moods')}</div>
            ) : (
              <div className="flex min-w-0 flex-1 items-stretch">
                <div className="flex items-center border-r border-[var(--aura-border-soft)] px-3">
                  <AuraThemedIcon
                    name={activeMood && typeof activeMood.icon === 'string' && activeMood.icon.trim() ? activeMood.icon : null}
                    tint={typeof activeMood?.color === 'string' && activeMood.color.trim() ? activeMood.color : 'var(--primary)'}
                    size={15}
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
                      '[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-[var(--aura-surface-control)]',
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
            <div className="w-px shrink-0 bg-[var(--aura-border-soft)]" />
            {/* Категория */}
            <Label htmlFor="diary-category" className="sr-only">{t('diary.category')}</Label>
            <div className="flex min-w-0 flex-1 items-stretch">
              <div className="flex items-center border-r border-[var(--aura-border-soft)] px-3">
                {activeCategory ? (
                  <AuraThemedIcon
                    name={typeof activeCategory.icon === 'string' && activeCategory.icon.trim() ? activeCategory.icon : null}
                    tint={typeof activeCategory.color === 'string' && activeCategory.color.trim() ? activeCategory.color : 'var(--foreground)'}
                    size={15}
                  />
                ) : (
                  <CircleOff className="size-[15px] shrink-0 text-[var(--aura-text-muted)]" aria-hidden />
                )}
              </div>
              <Select
                value={categoryId || DIARY_NO_CATEGORY_VALUE}
                onValueChange={(next) => setCategoryId(next === DIARY_NO_CATEGORY_VALUE ? '' : next)}
                disabled={categories.length === 0}
              >
                <SelectTrigger id="diary-category" className="!h-full flex-1 rounded-none border-0 !bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0">
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
                        <CircleOff className="size-4 shrink-0" />
                        <span className="truncate">{t('diary.no_category')}</span>
                      </span>
                    </SelectItem>
                    {categories.map((c) => {
                      const tint = typeof c.color === 'string' && c.color.trim() ? c.color : 'var(--primary)';
                      return (
                        <SelectItem key={String(c.id)} value={String(c.id)} textValue={String(c.title ?? c.id)} tint={tint}>
                          <span className="flex items-center gap-2">
                            <AuraThemedIcon name={typeof c.icon === 'string' ? c.icon : null} tint={tint} className="size-4 shrink-0" />
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
          <div>
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
                  className="shrink-0 text-[var(--aura-text-muted)] hover:text-foreground"
                  onMouseDown={(e) => { e.preventDefault(); applyEditorCommand(cmd); }}
                  title={t(key)}
                  aria-label={t(key)}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-[var(--aura-text-muted)] hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('formatBlock', 'H2'); }}
                title={t('formatting.heading')} aria-label={t('formatting.heading')}
              >
                <Heading2 className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-[var(--aura-text-muted)] hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('insertUnorderedList'); }}
                title={t('formatting.bullet_list')} aria-label={t('formatting.bullet_list')}
              >
                <List className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-[var(--aura-text-muted)] hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('insertOrderedList'); }}
                title={t('formatting.numbered_list')} aria-label={t('formatting.numbered_list')}
              >
                <ListOrdered className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-[var(--aura-text-muted)] hover:text-foreground"
                onMouseDown={(e) => { e.preventDefault(); applyEditorCommand('formatBlock', 'BLOCKQUOTE'); }}
                title={t('formatting.quote')} aria-label={t('formatting.quote')}
              >
                <BookText className="size-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon-sm"
                className="shrink-0 text-[var(--aura-text-muted)] hover:text-foreground"
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
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs">
          {isEntryEmpty && activeEntryPreset ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden px-3 py-3 sm:px-4">
              <p className="text-[var(--aura-text-disabled)] select-none text-base italic leading-relaxed">
                «{normalizeDiaryPresetText(activeEntryPreset.prompt)}»
              </p>
              {activeEntryPreset.description ? (
                <p className="text-[var(--aura-text-disabled)] mt-2.5 select-none text-xs font-medium tracking-wide opacity-70">
                  — {String(activeEntryPreset.description)}
                </p>
              ) : null}
            </div>
          ) : null}
          <div
            id="diary-text"
            ref={setEditorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={isEntryEmpty && !activeEntryPreset ? t('diary.entry') : ''}
            className="text-foreground empty:before:text-[var(--aura-text-disabled)] empty:before:content-[attr(data-placeholder)] min-h-0 h-full flex-1 overflow-y-auto bg-transparent px-3 py-3 pb-7 text-base leading-relaxed outline-none sm:px-4 [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--aura-border-soft)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--aura-text-muted)] [&_blockquote]:italic"
            spellCheck={spellcheckEnabled}
            onInput={(e) => editor.setText((e.currentTarget as HTMLDivElement).innerHTML)}
            onBlur={() => {
              saveEditorSelection();
              persist(editorRef.current?.innerHTML);
            }}
            onMouseUp={saveEditorSelection}
            onKeyUp={saveEditorSelection}
          />
          <span className="text-[var(--aura-text-subtle)] pointer-events-none absolute bottom-1.5 right-3 text-xs tabular-nums sm:right-4">
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
    <div className={cn(MEGA_PANEL_BODY_CN, ANIM.enterFade)}>
      {resolvedRightTab === 'nutrition' && showNutrition ? (
        <>
          <NutritionDaySummaryBar totals={nutritionDayTotals} targets={nutritionDayTargets} className={cn('mb-2 shrink-0', dayLocked && 'pointer-events-none opacity-55')} />
          {nutritionEntries.length === 0 ? (
            <EmptyState
              title="За этот день пока нет приёмов пищи."
              hint="Добавьте продукт или блюдо, чтобы здесь появилась лента питания за день."
              compact
            />
          ) : (
            <div className="mb-2 overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs">
              <ul className="divide-y divide-[var(--aura-border-soft)]">
                {nutritionEntries.map((e) => {
                  const productRow =
                    e.product_id && db ? (db.getById('cfg_nutrition_products', String(e.product_id)) as AuraRow | null) : null;
                  const presetRow =
                    e.preset_id && db ? (db.getById('cfg_nutrition_presets', String(e.preset_id)) as AuraRow | null) : null;
                  const sourceRow = productRow ?? presetRow;
                  const icon =
                    productRow != null
                      ? NUTRITION_GROUP_ICON[String(productRow.group ?? 'proteins') as NutritionGroup] ?? 'apple'
                      : sourceRow && typeof sourceRow.icon === 'string'
                        ? sourceRow.icon
                        : null;
                  const color =
                    sourceRow && typeof sourceRow.color === 'string' && String(sourceRow.color).trim()
                      ? String(sourceRow.color)
                      : 'var(--primary)';
                  const title = sourceRow != null ? String(sourceRow.title ?? sourceRow.id ?? t('diary.entry')) : t('diary.entry');
                  const kcal = Math.round(Number(e.total_calories) || 0);
                  const p = Math.round(Number(e.total_proteins) || 0);
                  const f = Math.round(Number(e.total_fats) || 0);
                  const c = Math.round(Number(e.total_carbs) || 0);
                  const cfgHint = nutritionCfgHint(productRow);
                  const amountLabel = cfgHint
                    ? `${p}Б ${f}Ж ${c}У ${kcal}ккал · ${cfgHint}`
                    : `${p}Б ${f}Ж ${c}У ${kcal}ккал`;
                  return (
                    <li key={String(e.id)}>
                      <ListItem
                        mode="edit-delete"
                        icon={icon}
                        iconTint={color}
                        title={title}
                        amount={amountLabel}
                        className={cn('rounded-none border-0 bg-transparent shadow-none', dayLocked && 'opacity-65')}
                        onEdit={() => {
                          if (dayLocked) return;
                          setEditingNutritionEntry(e);
                          setNutritionDialogOpen(true);
                        }}
                        onDelete={() => {
                          if (!db || dayLocked) return;
                          runAuraMutation('nutrition', () => { db.deleteNutritionEntry(String(e.id)); }, dateString);
                          setNutritionTick((n) => n + 1);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <AddListButton
            onClick={() => {
              if (dayLocked) return;
              setEditingNutritionEntry(null);
              setNutritionDialogOpen(true);
            }}
            disabled={!db || dayLocked}
          />
          {db ? (
            <AddNutritionDialog
              db={db}
              dateString={dateString}
              editEntry={editingNutritionEntry}
              open={nutritionDialogOpen}
              onOpenChange={(next) => {
                setNutritionDialogOpen(next);
                if (!next) setEditingNutritionEntry(null);
              }}
              onSaved={() => {
                setNutritionTick((n) => n + 1);
                setEditingNutritionEntry(null);
              }}
            />
          ) : null}
        </>
      ) : null}
      {resolvedRightTab === 'entries' && showEntries ? (
        <>
          <div className="mb-2 shrink-0 overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs">
            <div className="px-3 py-2">
              <Input
                value={entriesSearch}
                onChange={(e) => setEntriesSearch(e.target.value)}
                placeholder={t('diary.search_placeholder')}
                className="h-8 w-full"
                aria-label={t('diary.search_placeholder')}
              />
            </div>
            <div className="flex divide-x divide-[var(--aura-border-soft)] border-t border-[var(--aura-border-soft)]">
              <button
                type="button"
                onClick={() => setEntriesCategoryFilters([])}
                title={t('diary.all_categories')}
                aria-label={t('diary.all_categories')}
                aria-pressed={entriesCategoryFilters.length === 0}
                className={cn(
                  'flex flex-1 items-center justify-center py-2 text-[var(--aura-text-muted)] aura-tx-interactive hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground',
                  entriesCategoryFilters.length === 0 && 'bg-[var(--aura-surface-control)] text-foreground'
                )}
              >
                <CircleOff className="size-3.5" aria-hidden />
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
                      'flex flex-1 items-center justify-center py-2 text-[var(--aura-text-muted)] aura-tx-interactive hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground',
                      active && 'bg-[var(--aura-surface-control)] text-foreground'
                    )}
                  >
                    <AuraThemedIcon name={typeof c.icon === 'string' ? c.icon : null} className="size-3.5 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
          {filteredDiaryEntries.length === 0 ? (
            <EmptyState title={t('diary.entries_not_found')} hint={t('diary.search_hint')} compact />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--aura-border-soft)] bg-card shadow-xs">
              <ul className="divide-y divide-[var(--aura-border-soft)]">
                {filteredDiaryEntries.map((e) => {
                  const mood = e.mood_id ? moodById.get(String(e.mood_id)) : undefined;
                  const cat = e.category_id ? categoryById.get(String(e.category_id)) : undefined;
                  return (
                    <li key={String(e.id)}>
                      <ListItem
                        mode="diary"
                        title={String(e.date)}
                        amount={cat ? String(cat.title ?? cat.id ?? '') : t('diary.no_category')}
                        description={diaryTextPreview(e.text, 160, t('diary.empty_entry'))}
                        categoryIcon={cat && typeof cat.icon === 'string' ? cat.icon : null}
                        moodLevel={Number(mood?.level ?? 0)}
                        moodLevelsTotal={moods.length}
                        className="rounded-none border-0 bg-transparent shadow-none"
                        onActivate={() => {
                          const normalizedDate = normalizeDiaryDate(e.date);
                          if (!normalizedDate) return;
                          setDateString(normalizedDate);
                          setMobileSection('entry');
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );

  const rightColumn = (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {isDesktopViewport ? (
        <div className="min-h-0 min-w-0 flex-1 divide-y divide-[var(--aura-border-soft)] overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
    </PageFrame>
  );
}
