import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  BookText,
  Check,
  CircleOff,
  Eraser,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
  UtensilsCrossed,
} from 'lucide-react';
import { useRadioGroupSlideAnimation, getSlideAnimationClasses } from '@/shared/hooks/use-radio-group-slide-animation';
import { AddNutritionDialog } from '@/features/diary/AddNutritionDialog';
import { NutritionDaySummaryBar } from '@/features/diary/NutritionDaySummaryBar';
import { ListItem } from '@/components/ui/list-item';
import { Button } from '@/components/ui/button';
import { AddListButton } from '@/components/ui/add-list-button';
import { Label } from '@/components/ui/label';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import { readNutritionTargets, sumNutritionDay } from '@/shared/lib/nutrition-aggregate';
import { cn } from '@/lib/utils';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { Card, CardContent } from '@/components/ui/card';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import type { AuraRow } from '@/types/aura';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { SectionControlCard } from '@/shared/ui/section-control-card';
import { MobileSectionSwitcher } from '@/shared/ui/mobile-section-switcher';

type RightTab = 'nutrition' | 'entries';
const DIARY_NO_CATEGORY_VALUE = '__none__';
const NUTRITION_GROUP_LABEL: Record<string, string> = {
  proteins: 'белки',
  fats: 'жиры',
  carbs: 'углеводы',
};
const NUTRITION_GROUP_ICON: Record<string, string> = {
  proteins: 'beef',
  fats: 'flame',
  carbs: 'wheat',
};

function diaryTextPreview(raw: unknown, max = 160) {
  const plain = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, ' ') : '';
  const s = plain.trim().replace(/\s+/g, ' ');
  if (!s) return 'Пустая запись';
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

function toPlainText(raw: string) {
  return raw.replace(/<[^>]*>/g, ' ').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function toEditorHtml(raw: string) {
  const hasTags = /<\/?[a-z][\s\S]*>/i.test(raw);
  if (hasTags) return raw;
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function normalizeDiaryDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = /(\d{4}-\d{2}-\d{2})/.exec(raw);
  return m ? m[1] : null;
}

function nutritionCfgHint(product: AuraRow | null): string | null {
  if (!product) return null;
  const portionWeight = Math.round(Number(product.portion_weight) || 0);
  const calories100 = Math.round(Number(product.calories_per_100g) || 0);
  const groupRaw = typeof product.group === 'string' ? product.group : '';
  const groupLabel = NUTRITION_GROUP_LABEL[groupRaw] ?? null;
  const parts: string[] = [];
  if (portionWeight > 0) parts.push(`${portionWeight}г/порц`);
  if (groupLabel) parts.push(groupLabel);
  if (calories100 > 0) parts.push(`${calories100}ккал/100г`);
  if (parts.length === 0) return null;
  return `cfg: ${parts.join(' · ')}`;
}

export function DiaryEditorPage() {
  const { dateString, setDateString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const visibility = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db, ready]);

  const [rightTab, setRightTab] = useState<RightTab>('nutrition');
  const [mobileSection, setMobileSection] = useState<'entry' | 'nutrition' | 'entries'>('entry');
  const slideDirection = useRadioGroupSlideAnimation(rightTab, ['nutrition', 'entries'] as const);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [text, setText] = useState('');
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const [moodId, setMoodId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [entryId, setEntryId] = useState<string | null>(null);
  const [nutritionTick, setNutritionTick] = useState(0);
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [editingNutritionEntry, setEditingNutritionEntry] = useState<AuraRow | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const loadingRef = useRef(false);
  const allowAutosave = useRef(false);
  const dataRefreshTick = useAuraDataRefresh({ types: ['diary', 'nutrition'] });

  const moods = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_diary_moods').sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
  }, [db, ready]);

  const categories = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_diary_categories').filter((c) => c.id);
  }, [db, ready]);

  const moodById = useMemo(() => {
    const m = new Map<string, AuraRow>();
    for (const mo of moods) {
      if (mo.id != null) m.set(String(mo.id), mo);
    }
    return m;
  }, [moods]);

  const categoryById = useMemo(() => {
    const m = new Map<string, AuraRow>();
    for (const c of categories) {
      if (c.id != null) m.set(String(c.id), c);
    }
    return m;
  }, [categories]);

  const load = useCallback(() => {
    if (!db) return;
    loadingRef.current = true;
    const row = db.getDiaryEntry(dateString) as AuraRow | undefined;
    if (row) {
      setEntryId(String(row.id));
      setText(typeof row.text === 'string' ? toEditorHtml(row.text) : '');
      setMoodId(row.mood_id ? String(row.mood_id) : '');
      setCategoryId(row.category_id ? String(row.category_id) : '');
    } else {
      setEntryId(`diary_${dateString}`);
      setText('');
      setMoodId('');
      setCategoryId('');
    }
    queueMicrotask(() => {
      loadingRef.current = false;
    });
  }, [categories, dateString, db, moods]);

  useEffect(() => {
    allowAutosave.current = false;
    if (!ready) return;
    load();
    const id = window.setTimeout(() => {
      allowAutosave.current = true;
    }, 500);
    return () => window.clearTimeout(id);
  }, [ready, load, dateString, dataRefreshTick]);

  const persist = useCallback((nextHtml?: string) => {
    if (!db || loadingRef.current || !allowAutosave.current) return;
    const sourceHtml = typeof nextHtml === 'string' ? nextHtml : text;
    const plainText = toPlainText(sourceHtml);
    const hasHtmlContent =
      sourceHtml.replace(/<[^>]*>/g, '').trim().length > 0 || /<img|<ul|<ol|<li|<h\d|<blockquote/i.test(sourceHtml);
    const trimmed = hasHtmlContent ? sourceHtml.trim() : plainText;
    const hasText = trimmed.length > 0;
    const hasMood = Boolean(moodId);
    const hasCategory = Boolean(categoryId);
    if (hasText || hasMood || hasCategory) {
      const id = entryId ?? `diary_${dateString}`;
      runAuraMutation('diary', () => {
        db.saveDiaryEntry({
          id,
          date: dateString,
          mood_id: moodId || null,
          category_id: categoryId || null,
          text: trimmed || null,
        });
      });
      const again = db.getDiaryEntry(dateString);
      if (again) setEntryId(String(again.id));
    } else if (db.getDiaryEntry(dateString)) {
      runAuraMutation('diary', () => db.deleteDiaryEntry(dateString));
      setEntryId(`diary_${dateString}`);
    }
  }, [categoryId, dateString, db, entryId, moodId, text]);

  const saveEditorSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }, []);

  const restoreEditorSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    const range = selectionRef.current;
    if (!el || !sel || !range) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const applyEditorCommand = useCallback(
    (command: string, value?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      restoreEditorSelection();
      document.execCommand(command, false, value);
      saveEditorSelection();
      const nextHtml = el.innerHTML;
      setText(nextHtml);
      // Save right after format actions so style changes do not get lost.
      window.setTimeout(() => persist(nextHtml), 0);
    },
    [persist, restoreEditorSelection, saveEditorSelection]
  );

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => persist(), 450);
    return () => window.clearTimeout(t);
  }, [text, moodId, categoryId, dateString, ready, persist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => setIsDesktopViewport(window.innerWidth >= 1024);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== text) {
      el.innerHTML = text;
    }
  }, [text]);

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
  }, [db, ready, nutritionTick]);

  const monthEntries = useMemo(() => {
    if (!db) return [];
    const parts = dateString.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    if (!y || !m) return [];
    return db.getDiaryEntriesByMonth(y, m).filter((entry) => {
      const entryDate = normalizeDiaryDate(entry.date);
      if (!entryDate) return false;
      const txt = typeof entry.text === 'string' ? entry.text.replace(/<[^>]*>/g, ' ').trim() : '';
      // В секции "Записи" показываем только дни с фактическим текстовым содержимым.
      return Boolean(txt);
    });
  }, [dateString, db, ready, dataRefreshTick]);

  const showEntry = visibility.diary.entryPanel;
  const showNutrition = visibility.diary.contentNutrition;
  const showEntries = visibility.diary.contentEntries;

  useEffect(() => {
    if (showNutrition && !showEntries) setRightTab('nutrition');
    else if (!showNutrition && showEntries) setRightTab('entries');
  }, [showNutrition, showEntries]);

  const moodIdx = useMemo(() => {
    const i = moods.findIndex((m) => String(m.id) === moodId);
    return i >= 0 ? i : 0;
  }, [moods, moodId]);

  const activeMood = moods[moodIdx];

  const entryColumn = (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader title="Запись" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!ready ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="border-border/60 border-b">
                  <div className="grid grid-cols-1 items-center gap-3 py-2.5 px-3 sm:grid-cols-2 sm:gap-4 sm:px-4 sm:py-3">
                    <div className="flex min-w-0 flex-col">
                      <Label htmlFor="diary-mood-slider" className="sr-only">
                        Настроение
                      </Label>
                    {moods.length === 0 ? (
                      <p className="text-muted-foreground text-xs">Нет cfg_diary_moods.</p>
                    ) : (
                      <div className="flex h-9 min-h-9 items-center gap-2.5 sm:h-10 sm:min-h-10">
                        <IconWithBadge
                          iconName={activeMood && typeof activeMood.icon === 'string' && activeMood.icon.trim() ? activeMood.icon : null}
                          size="sm"
                        />
                        <div className="flex min-h-9 min-w-0 flex-1 items-center sm:min-h-10">
                          <Slider
                            id="diary-mood-slider"
                            value={[moodIdx]}
                            min={0}
                            max={Math.max(0, moods.length - 1)}
                            step={1}
                            className={cn(
                              'w-full py-0',
                              '[&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-muted/90',
                              '[&_[data-slot=slider-range]]:bg-foreground/65',
                              '[&_[data-slot=slider-thumb]]:size-[18px] [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:bg-background [&_[data-slot=slider-thumb]]:shadow'
                            )}
                            aria-label="Настроение"
                            aria-valuetext={activeMood?.id != null ? `Уровень ${moodIdx + 1}` : undefined}
                            onValueChange={(vals) => {
                              const idx = Math.min(moods.length - 1, Math.max(0, Math.round(Number(vals[0]) ?? 0)));
                              const m = moods[idx];
                              if (m?.id != null) setMoodId(String(m.id));
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <Label htmlFor="diary-category" className="sr-only">
                      Категория
                    </Label>
                    <div className="flex h-9 min-h-9 w-full items-center sm:h-10 sm:min-h-10">
                      <Select
                        value={categoryId || DIARY_NO_CATEGORY_VALUE}
                        onValueChange={(next) => setCategoryId(next === DIARY_NO_CATEGORY_VALUE ? '' : next)}
                        disabled={categories.length === 0}
                      >
                        <SelectTrigger
                          id="diary-category"
                          className="border-input/80 h-9 w-full bg-background/90 shadow-sm sm:h-10"
                        >
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Категории</SelectLabel>
                            <SelectItem value={DIARY_NO_CATEGORY_VALUE}>
                              <span className="flex items-center gap-2">
                                <CircleOff className="size-4 shrink-0" />
                                <span className="truncate">Без категории</span>
                              </span>
                            </SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={String(c.id)} value={String(c.id)}>
                                <span className="flex items-center gap-2">
                                  <AuraThemedIcon name={typeof c.icon === 'string' ? c.icon : null} className="size-4 shrink-0" />
                                  <span className="truncate">{String(c.title ?? c.id)}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    </div>
                  </div>
                </div>
                <div className="border-border/60 border-b">
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="hidden h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted sm:inline-flex"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('bold');
                      }}
                      title="Жирный"
                      aria-label="Жирный"
                    >
                      <Bold className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="hidden h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted lg:inline-flex"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('italic');
                      }}
                      title="Курсив"
                      aria-label="Курсив"
                    >
                      <Italic className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="hidden h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted sm:inline-flex"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('underline');
                      }}
                      title="Подчеркнутый"
                      aria-label="Подчеркнутый"
                    >
                      <Underline className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('strikeThrough');
                      }}
                      title="Зачеркнутый"
                      aria-label="Зачеркнутый"
                    >
                      <Strikethrough className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('formatBlock', 'H2');
                      }}
                      title="Заголовок"
                      aria-label="Заголовок"
                    >
                      <Heading2 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('insertUnorderedList');
                      }}
                      title="Маркированный список"
                      aria-label="Маркированный список"
                    >
                      <List className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('insertOrderedList');
                      }}
                      title="Нумерованный список"
                      aria-label="Нумерованный список"
                    >
                      <ListOrdered className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('formatBlock', 'BLOCKQUOTE');
                      }}
                      title="Цитата"
                      aria-label="Цитата"
                    >
                      <BookText className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md border border-border/60 bg-background/70 px-2.5 hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyEditorCommand('removeFormat');
                        applyEditorCommand('formatBlock', 'P');
                      }}
                      title="Очистить формат"
                      aria-label="Очистить формат"
                    >
                      <Eraser className="size-3.5" />
                    </Button>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <span className="text-muted-foreground inline-flex min-w-8 items-center justify-center gap-1 text-xs">
                        <span className="font-semibold leading-none">A</span>
                        {spellcheckEnabled ? <Check className="size-3" aria-hidden /> : null}
                      </span>
                      <Switch
                        id="diary-spellcheck"
                        checked={spellcheckEnabled}
                        onCheckedChange={setSpellcheckEnabled}
                        aria-label="Включить орфографическое выделение"
                        title="Орфография"
                        className="shrink-0"
                      />
                    </div>
                  </div>
                </div>
                <div className="relative min-h-0 h-full flex-1">
                  <div
                    id="diary-text"
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Запись…"
                    className="text-foreground empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] min-h-0 h-full flex-1 overflow-y-auto bg-transparent px-3 py-3 pb-7 text-base leading-relaxed outline-none sm:px-4 [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic"
                    spellCheck={spellcheckEnabled}
                    onInput={(e) => setText((e.currentTarget as HTMLDivElement).innerHTML)}
                    onBlur={() => {
                      saveEditorSelection();
                      const currentHtml = editorRef.current?.innerHTML;
                      persist(currentHtml);
                    }}
                    onMouseUp={saveEditorSelection}
                    onKeyUp={saveEditorSelection}
                  />
                  <span className="text-muted-foreground pointer-events-none absolute bottom-1.5 right-3 text-[10px] tabular-nums sm:right-4">
                    S {toPlainText(text).length}
                  </span>
                </div>
              </div>
            </>
          )}
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
              options={[
                { value: 'nutrition', label: 'Питание', Icon: UtensilsCrossed },
                { value: 'entries', label: 'Записи', Icon: BookText },
              ]}
            />
          </div>
          <div className="lg:hidden">
            <MegaPanelHeader title={mobileSection === 'entries' ? 'Записи' : 'Питание'} />
          </div>
        </>
      )
    : (
        <MegaPanelHeader title={showNutrition ? 'Питание' : 'Записи'} />
      );

  const resolvedRightTab: RightTab =
    mobileSection === 'entries' ? 'entries' : mobileSection === 'nutrition' ? 'nutrition' : rightTab;

  const rightPanelBody = (
    <div className={cn(MEGA_PANEL_BODY_CN, getSlideAnimationClasses(true, slideDirection))}>
      {resolvedRightTab === 'nutrition' && showNutrition ? (
        <>
          <SectionControlCard className="mb-2 border-0 bg-transparent rounded-none px-0 py-0 sm:px-0 sm:py-0">
            <NutritionDaySummaryBar totals={nutritionDayTotals} targets={nutritionDayTargets} />
          </SectionControlCard>
          {nutritionEntries.length === 0 ? (
            <EmptyState
              title="За этот день пока нет приёмов пищи."
              hint="Добавьте продукт или блюдо, чтобы здесь появилась лента питания за день."
              compact
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {nutritionEntries.map((e) => {
                const productRow =
                  e.product_id && db ? (db.getById('cfg_nutrition_products', String(e.product_id)) as AuraRow | null) : null;
                const presetRow =
                  e.preset_id && db ? (db.getById('cfg_nutrition_presets', String(e.preset_id)) as AuraRow | null) : null;
                const sourceRow = productRow ?? presetRow;
                const icon =
                  productRow != null
                    ? NUTRITION_GROUP_ICON[String(productRow.group ?? 'proteins')] ?? 'apple'
                    : sourceRow && typeof sourceRow.icon === 'string'
                      ? sourceRow.icon
                      : null;
                const color =
                  sourceRow && typeof sourceRow.color === 'string' && String(sourceRow.color).trim()
                    ? String(sourceRow.color)
                    : 'var(--primary)';
                const title =
                  sourceRow != null ? String(sourceRow.title ?? sourceRow.id ?? 'Запись') : 'Запись';

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
                      onEdit={() => {
                        setEditingNutritionEntry(e);
                        setNutritionDialogOpen(true);
                      }}
                      onDelete={() => {
                        runAuraMutation('nutrition', () => db?.deleteNutritionEntry(String(e.id)));
                        setNutritionTick((n) => n + 1);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <AddListButton
            className="mt-2"
            onClick={() => {
              setEditingNutritionEntry(null);
              setNutritionDialogOpen(true);
            }}
            disabled={!db}
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
          {monthEntries.length === 0 ? (
            <EmptyState
              title="В этом месяце пока нет записей."
              hint="Создайте заметку на любой день месяца, и она появится в списке."
              compact
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {monthEntries.map((e) => {
                const mood = e.mood_id ? moodById.get(String(e.mood_id)) : undefined;
                const cat = e.category_id ? categoryById.get(String(e.category_id)) : undefined;

                return (
                  <li key={String(e.id)}>
                    <ListItem
                      mode="diary"
                      title={String(e.date)}
                      amount={cat ? String(cat.title ?? cat.id ?? '') : 'Без категории'}
                      description={diaryTextPreview(e.text)}
                      categoryIcon={cat && typeof cat.icon === 'string' ? cat.icon : null}
                      moodLevel={Number(mood?.level ?? 0)}
                      moodLevelsTotal={moods.length}
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
        <p className="text-muted-foreground text-sm">Включите секции в настройках приложения.</p>
      </PageFrame>
    );
  }

  const bothColumns = showEntry && (showNutrition || showEntries);
  const mobileSections = [
    showEntry ? { id: 'entry' as const, label: 'Запись', icon: BookText } : null,
    showNutrition ? { id: 'nutrition' as const, label: 'Питание', icon: UtensilsCrossed } : null,
    showEntries ? { id: 'entries' as const, label: 'Записи', icon: List } : null,
  ].filter(Boolean) as Array<{ id: 'entry' | 'nutrition' | 'entries'; label: string; icon: typeof BookText }>;


  const layout = bothColumns ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {isDesktopViewport ? (
        <div className="min-h-0 min-w-0 flex-1 divide-y divide-border/60 overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {showEntry ? entryColumn : null}
          {(showNutrition || showEntries) ? rightColumn : null}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mobileSection === 'entry' ? entryColumn : rightColumn}
          </div>
          <MobileSectionSwitcher sections={mobileSections} value={mobileSection} onChange={setMobileSection} />
        </>
      )}
    </div>
  ) : (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {isDesktopViewport ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          {showEntry ? entryColumn : rightColumn}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mobileSection === 'entry' && showEntry ? entryColumn : null}
            {mobileSection !== 'entry' && (showNutrition || showEntries) ? rightColumn : null}
          </div>
          <MobileSectionSwitcher sections={mobileSections} value={mobileSection} onChange={setMobileSection} />
        </>
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
