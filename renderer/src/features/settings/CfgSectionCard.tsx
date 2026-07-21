// ─── CfgSectionCard ───────────────────────────────────────────────────────────
// Компонент-оркестратор для CFG-секции настроек:
//   • список строк с иконками, мета-сводкой и drag-reorder
//   • диалог создания/редактирования (поля, цвет, иконка)
//   • диалог состава блюда (только для nutrition-presets)
//   • диалог внешнего вида категории задач

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PICKER_COLOR } from '@/shared/config/aura-palette';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Disc3,
  FolderOpen,
  ImageIcon,
  ListPlus,
  Music2,
  Palette,
  Pencil,
  Plus,
  Trash2,
  X,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UNIVERSAL_MODAL_COMPACT_PICKER_CN,
  UniversalModalContent,
} from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { SettingsDialogHeader } from '@/features/settings/settings-form-primitives';
import { ColorPickerPanel } from '@/features/settings/color-picker-panel';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { warmIconsManifest } from '@/features/settings/load-icons-manifest';
import { SettingsDialogLayout } from '@/features/settings/settings-dialog-layout';
import { parseHexColor } from '@/features/settings/cfg-color-presets';
import { normalizeCssColorForPaint } from '@/lib/css-color';
import { CfgSelectOptionIcon } from '@/shared/lib/cfg-select-icons';
import { NUTRITION_GROUPS, NUTRITION_GROUP_LABEL, NUTRITION_GROUP_ICON } from '@/shared/config/nutrition-meta';
import type { CfgFieldDef, CfgSectionSpec } from '@/features/settings/cfg-section-types';
import { translateCfgSectionSpec } from '@/features/settings/cfg-section-translator';
import type { AuraRow } from '@/types/aura';
import { cn } from '@/lib/utils';
import { useSettingsTabActions } from '@/features/settings/settings-tab-actions-context';
import { ActModalFooter } from '@/features/act/ActModal';
import { ActList, type ActItem } from '@/features/act-system';
import { LoadingShell } from '@/shared/ui/data-states';
import {
  resolveAmbientMusicFolderPath,
  readAmbientMusicFileNames,
  ambientMusicImportKey,
  AMBIENT_MUSIC_DEFAULT_ICON,
  resolveAmbientCoverImageUrl,
  saveAmbientCoverImageFile,
} from '@/features/timer/ambient-music-fs';

// ─── Local feature imports ─────────────────────────────────────────────────────

import { CfgAffixValueField, CfgModalGridRow, CFG_INPUT_CN, CFG_ICON_TRIGGER_CN, formatCfgIconLabel } from './cfg-primitives';
import {
  sectionColorPresets,
  rowTitle,
  ambientTrackDisplayTitle,
  rowMetaSummary,
  rowValueSummary,
  sortRows,
  rowListAccent,
  cfgListIconTint,
} from './cfg-row-display';
import {
  allowedTaskTypesForSection,
  isTaskConditionalFieldVisible,
  isTaskDependentFieldKey,
  taskTypeLabel,
  applyTaskTypeTransition,
} from './cfg-task-type-utils';
import { parseTaskListItems, encodeTaskListItems, type TaskListCfgItem } from './cfg-list-editor';
import {
  formValueFromRow,
  buildPayloadFromForm,
  cfgDisplayAffix,
  parsePresetIngredientDrafts,
  encodePresetIngredientDrafts,
  type PresetIngredientDraft,
} from './cfg-field-utils';
import {
  sectionTaskCategoryKey,
  readTaskCategoryConfig,
  TASK_CATEGORY_DEFAULTS,
  type TaskCategoryConfig,
} from './cfg-category-utils';
import { CfgPresetProductsPanel } from './CfgPresetProductsPanel';
import { CfgCategoryEditorDialog } from './CfgCategoryEditorDialog';

// ─── AmbientCoverImageField ───────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AmbientCoverImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const previewSrc = value ? resolveAmbientCoverImageUrl(value) ?? value : '';

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const savedName = await saveAmbientCoverImageFile(file);
      onChange(savedName ?? await readFileAsDataURL(file));
    } catch { /* ignore */ }
  }, [onChange]);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const onPaste = async (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); const f = item.getAsFile(); if (f) await handleFile(f); }
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleFile]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'aura-operator-row relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors',
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-soft bg-control/40 hover:border-primary/50'
        )}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'image/*';
          input.onchange = async () => { if (input.files?.[0]) await handleFile(input.files[0]); };
          input.click();
        }}
      >
        {previewSrc ? (
          <>
            <img src={previewSrc} alt="cover" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs font-medium text-white">Заменить</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-faint">
            <ImageIcon className="size-5" />
            <span className="text-xs">Перетащите, вставьте (Ctrl+V) или нажмите</span>
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-lg border border-soft text-xs text-dim hover:border-destructive/40 hover:text-destructive transition-colors"
        >
          <X className="size-3" /> Удалить обложку
        </button>
      )}
    </div>
  );
}

function AmbientTrackArtwork({ row, tint }: { row: AuraRow; tint: string }) {
  const cover = typeof row.cover_image === 'string' && row.cover_image.trim()
    ? resolveAmbientCoverImageUrl(row.cover_image)
    : null;
  return (
    <div className="flex h-12 shrink-0 items-center justify-center px-2">
      {cover ? (
        <div className="size-9 overflow-hidden rounded-lg border border-soft bg-control shadow-xs">
          <img src={cover} alt="" className="h-full w-full object-cover" draggable={false} />
        </div>
      ) : (
        <div className="rounded-lg bg-panel/45 p-0.5">
          <AuraThemedIcon name={typeof row.icon === 'string' ? row.icon : AMBIENT_MUSIC_DEFAULT_ICON} tint={cfgListIconTint(tint)} className="size-6" />
        </div>
      )}
    </div>
  );
}

function AmbientTrackShelf({
  rows,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  rows: AuraRow[];
  onEdit: (row: AuraRow) => void;
  onDelete: (row: AuraRow) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Пока нет треков."
        hint="Добавьте трек вручную или загрузите музыку из папки."
        compact
      />
    );
  }

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(180, el.clientWidth * 0.75), behavior: 'smooth' });
  };

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-2 overflow-hidden">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg bg-control/45 text-dim aura-tx-interactive hover:bg-control hover:text-foreground"
          onClick={() => scrollByPage(-1)}
          aria-label="Прокрутить треки влево"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg bg-control/45 text-dim aura-tx-interactive hover:bg-control hover:text-foreground"
          onClick={() => scrollByPage(1)}
          aria-label="Прокрутить треки вправо"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div ref={scrollRef} className="block w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:thin]">
        <ul className="flex w-max max-w-none gap-3 pr-1">
          {rows.map((row, index) => {
            const title = ambientTrackDisplayTitle(row);
            const tint = rowListAccent({ table: 'cfg_ambient_music', sectionId: 'ambient-music', title: '', description: '', fields: [], sortBy: 'none' }, row);
            const cover = typeof row.cover_image === 'string' && row.cover_image.trim()
              ? resolveAmbientCoverImageUrl(row.cover_image)
              : null;
            const icon = typeof row.icon === 'string' && row.icon.trim() ? row.icon : AMBIENT_MUSIC_DEFAULT_ICON;
            return (
              <li key={String(row.id)} className="w-36 shrink-0 sm:w-40">
                <article className="group flex min-h-48 flex-col overflow-hidden rounded-xl border border-soft bg-card/95 shadow-xs aura-tx-surface hover:bg-hover/60">
                  <button
                    type="button"
                    className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-control/35"
                    onClick={() => onEdit(row)}
                    aria-label={`Изменить ${title}`}
                  >
                    {cover ? (
                      <img src={cover} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <div
                        className="relative flex size-24 items-center justify-center rounded-full border border-soft shadow-inner"
                        style={{
                          background:
                            `radial-gradient(circle at center, var(--card) 0 12%, transparent 13% 20%, ${cfgListIconTint(tint)} 21% 22%, transparent 23%), ` +
                            `linear-gradient(135deg, color-mix(in oklab, ${tint} 24%, transparent), color-mix(in oklab, var(--card) 88%, var(--foreground)))`,
                        }}
                      >
                        <Disc3 className="absolute inset-0 m-auto size-20 text-foreground/10" aria-hidden />
                        <AuraThemedIcon name={icon} tint={cfgListIconTint(tint)} className="size-8" />
                      </div>
                    )}
                    <span className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <span className="rounded-md bg-background/85 px-1.5 py-1 text-[10px] font-semibold text-foreground shadow-sm">
                        Изменить
                      </span>
                    </span>
                  </button>
                  <div className="flex min-h-20 flex-1 flex-col gap-2 p-2.5">
                    <p className="line-clamp-2 min-h-9 text-xs font-semibold leading-snug text-foreground" title={title}>
                      {title}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-7 flex-1 items-center justify-center rounded-lg bg-control/35 text-dim aura-tx-interactive hover:bg-control hover:text-foreground disabled:opacity-35"
                        onClick={() => onMoveUp(index)}
                        disabled={index === 0}
                        aria-label={`Переместить ${title} влево`}
                      >
                        <ChevronLeft className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="flex h-7 flex-1 items-center justify-center rounded-lg bg-control/35 text-dim aura-tx-interactive hover:bg-control hover:text-foreground disabled:opacity-35"
                        onClick={() => onMoveDown(index)}
                        disabled={index === rows.length - 1}
                        aria-label={`Переместить ${title} вправо`}
                      >
                        <ChevronRight className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-control/45 text-xs font-medium text-dim aura-tx-interactive hover:bg-control hover:text-foreground"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Изм.
                      </button>
                      <button
                        type="button"
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-control/45 text-dim aura-tx-interactive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(row)}
                        aria-label={`Удалить ${title}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_PICKER_DEFAULT = DEFAULT_PICKER_COLOR;

/** Подвид открытого диалога: главная форма | цвет | состав блюда. */
type DialogSub = 'form' | { k: 'color'; field: string } | { k: 'preset-products'; field: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Возвращает Node.js `require` в среде Electron, иначе null. */
function getNodeRequire() {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function') {
    return (globalThis as { require: (id: string) => unknown }).require;
  }
  if (typeof require === 'function') return require;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { spec: CfgSectionSpec };

export function CfgSectionCard({ spec }: Props) {
  const { t } = useTranslation();
  const { db } = useAuraDb();
  const setTabActions = useSettingsTabActions();

  // Переводим spec один раз — все рендеры получают стабильную ссылку
  const translatedSpec = useMemo(() => translateCfgSectionSpec(spec, t), [spec, t]);

  // ─── Row state ────────────────────────────────────────────────────────────

  const [rows, setRows] = useState<AuraRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!db) { setRows([]); return; }
    let list = db.getAll(spec.table).filter((r) => spec.table === 'cfg_ambient_music' || r.id != null);
    list = list.filter((r) => {
      if (!spec.filter) return true;
      return Object.entries(spec.filter).every(([k, v]) => String(r[k] ?? '') === String(v));
    });
    setRows(sortRows(list, spec.sortBy));
  }, [db, spec.filter, spec.sortBy, spec.table]);

  const canReorder = spec.sortBy === 'level' && (spec.table === 'cfg_ambient_music' || translatedSpec.fields.some((f) => f.key === 'level'));
  const hideRowReorder = spec.sectionId.startsWith('finance-') || spec.sectionId.startsWith('nutrition-');

  // Считаем только для cfg_accounts — иначе 0 без итерации по rows
  const visibleHomeAccountsCount = useMemo(
    () => spec.table !== 'cfg_accounts' ? 0 : rows.filter((r) => Number(r.home_visible) !== 0).length,
    [rows, spec.table]
  );

  // ─── Dialog state ─────────────────────────────────────────────────────────

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogSub, setDialogSub] = useState<DialogSub>('form');
  const [cfgIconField, setCfgIconField] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState(COLOR_PICKER_DEFAULT);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const currentTaskType = String(form.task_type ?? '');
  const restrictedColorPresets = useMemo(() => sectionColorPresets(spec.sectionId), [spec.sectionId]);

  // Поля, не зависящие от task_type (основная часть формы)
  const baseVisibleFields = useMemo(
    () =>
      translatedSpec.fields.filter(
        (f) =>
          f.key !== 'level' &&
          !(translatedSpec.hideFormKeys ?? []).includes(f.key) &&
          !isTaskDependentFieldKey(translatedSpec, f.key)
      ),
    [translatedSpec]
  );

  // Поля, зависящие от task_type (раскрывающийся раздел)
  const conditionalVisibleFields = useMemo(
    () =>
      translatedSpec.fields.filter(
        (f) =>
          f.key !== 'level' &&
          !(translatedSpec.hideFormKeys ?? []).includes(f.key) &&
          isTaskDependentFieldKey(translatedSpec, f.key) &&
          isTaskConditionalFieldVisible(translatedSpec, f.key, currentTaskType)
      ),
    [translatedSpec, currentTaskType]
  );

  // ─── Task list items (для задач типа «список») ───────────────────────────

  const [taskListItems, setTaskListItems] = useState<TaskListCfgItem[]>([]);

  // Синхронизируем taskListItems → form.config при каждом изменении
  useEffect(() => {
    if (!open) return;
    if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') return;
    if (currentTaskType !== 'list') return;
    setForm((prev) => ({ ...prev, config: encodeTaskListItems(taskListItems) }));
  }, [taskListItems, currentTaskType, open, spec.table]);

  // ─── Nutrition preset ingredients ────────────────────────────────────────

  const [presetIngredients, setPresetIngredients] = useState<PresetIngredientDraft[]>([]);

  const nutritionProducts = useMemo(
    () =>
      spec.table === 'cfg_nutrition_presets' && db
        ? db
            .getAll('cfg_nutrition_products')
            .filter((p) => p.id)
            .sort((a, b) => {
              const diff = (Number(b.usage_count) || 0) - (Number(a.usage_count) || 0);
              return diff !== 0 ? diff : String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru');
            })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, spec.table, open]
  );

  const nutritionProductsById = useMemo(() => {
    const map: Record<string, AuraRow> = {};
    nutritionProducts.forEach((p) => { map[String(p.id)] = p; });
    return map;
  }, [nutritionProducts]);

  // ─── Ambient music ────────────────────────────────────────────────────────

  const [ambientMusicFolderPath, setAmbientMusicFolderPath] = useState<string | null>(null);
  const [ambientMusicFiles, setAmbientMusicFiles] = useState<string[]>([]);
  const [ambientMusicImporting, setAmbientMusicImporting] = useState(false);

  const refreshAmbientMusicFiles = useCallback(() => {
    if (spec.table !== 'cfg_ambient_music') return;
    const folderPath = resolveAmbientMusicFolderPath();
    setAmbientMusicFolderPath(folderPath);
    setAmbientMusicFiles(folderPath ? readAmbientMusicFileNames(folderPath) : []);
  }, [spec.table]);

  const importAmbientMusicFiles = useCallback(() => {
    if (!db || spec.table !== 'cfg_ambient_music' || ambientMusicImporting) return;
    const folderPath = resolveAmbientMusicFolderPath();
    setAmbientMusicFolderPath(folderPath);
    if (!folderPath) { window.alert('Папка музыки не найдена.'); return; }
    const files = readAmbientMusicFileNames(folderPath);
    setAmbientMusicFiles(files);
    if (files.length === 0) { window.alert('В папке музыки не найдено поддерживаемых файлов.'); return; }
    const existing = new Set(
      db.getAll('cfg_ambient_music').map((r) => ambientMusicImportKey(String(r.file_name ?? ''))).filter(Boolean)
    );
    const missing = files.filter((f) => !existing.has(ambientMusicImportKey(f)));
    if (missing.length === 0) { window.alert('Все файлы музыки уже добавлены.'); return; }
    setAmbientMusicImporting(true);
    try {
      let added = 0;
      for (const fileName of missing) {
        const level = existing.size + added;
        if (db.create('cfg_ambient_music', {
          id: `ambient_${Date.now()}_${added}`,
          name: fileName,
          icon: AMBIENT_MUSIC_DEFAULT_ICON,
          file_name: fileName,
          level,
        })) added += 1;
      }
      reload();
      refreshAmbientMusicFiles();
      window.alert(`Добавлено ${added} ${added === 1 ? 'файл' : 'файлов'} музыки.`);
    } catch (e) {
      console.error('[CfgSectionCard] ambient music import', e);
      window.alert(e instanceof Error ? e.message : 'Не удалось загрузить файлы музыки.');
    } finally {
      setAmbientMusicImporting(false);
    }
  }, [ambientMusicImporting, db, refreshAmbientMusicFiles, reload, spec.table]);

  const openAmbientMusicFolder = useCallback(async () => {
    const folderPath = resolveAmbientMusicFolderPath();
    setAmbientMusicFolderPath(folderPath);
    if (!folderPath) return;
    refreshAmbientMusicFiles();
    const req = getNodeRequire();
    const electron = req
      ? (req('electron') as { shell?: { openPath: (p: string) => Promise<string> } })
      : null;
    if (electron?.shell) await electron.shell.openPath(folderPath);
  }, [refreshAmbientMusicFiles]);

  // ─── Category editor ──────────────────────────────────────────────────────

  const taskCategoryKey = sectionTaskCategoryKey(spec.sectionId);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryIconPickerOpen, setCategoryIconPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<TaskCategoryConfig>(TASK_CATEGORY_DEFAULTS.rituals);

  const openCategoryEditor = useCallback(() => {
    if (!db || !taskCategoryKey) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    setCategoryForm(readTaskCategoryConfig(cur.task_categories_config, taskCategoryKey));
    setCategoryError(null);
    setCategoryIconPickerOpen(false);
    setCategoryOpen(true);
  }, [db, taskCategoryKey]);

  const saveCategoryEditor = useCallback(() => {
    if (!db || !taskCategoryKey) return;
    const title = categoryForm.title.trim();
    if (!title) { setCategoryError('Введите название категории.'); return; }
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    const id = String(cur.id ?? 'app_settings_1');
    let parsed: Record<string, unknown> = {};
    try {
      const p = cur.task_categories_config;
      const j = typeof p === 'string' ? JSON.parse(p) : p;
      if (j && typeof j === 'object') parsed = j as Record<string, unknown>;
    } catch { parsed = {}; }
    parsed[taskCategoryKey] = {
      ...(parsed[taskCategoryKey] && typeof parsed[taskCategoryKey] === 'object'
        ? (parsed[taskCategoryKey] as Record<string, unknown>) : {}),
      title,
      icon: categoryForm.icon.trim() || TASK_CATEGORY_DEFAULTS[taskCategoryKey].icon,
      color: categoryForm.color,
    };
    db.saveAppSettings({ ...cur, id, task_categories_config: JSON.stringify(parsed) });
    window.dispatchEvent(new CustomEvent('task-categories-config-changed'));
    setCategoryOpen(false);
  }, [db, taskCategoryKey, categoryForm]);

  // ─── Row reorder ──────────────────────────────────────────────────────────

  const moveRow = useCallback(
    (currentRows: AuraRow[], fromIndex: number, toIndex: number) => {
      if (!db || !canReorder) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentRows.length || toIndex >= currentRows.length) return;
      if (fromIndex === toIndex) return;
      const next = [...currentRows];
      const [picked] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, picked);
      try {
        next.forEach((row, idx) => {
          const rowId = String(row.id ?? '');
          if (rowId) db.update(spec.table, rowId, { level: idx });
        });
        reload();
      } catch (e) {
        console.error('[CfgSectionCard] move', e);
        setListError(e instanceof Error ? e.message : 'Ошибка изменения порядка');
      }
    },
    [db, canReorder, spec.table, reload]
  );

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { refreshAmbientMusicFiles(); }, [refreshAmbientMusicFiles]);

  // ─── Dialog open helpers ──────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    refreshAmbientMusicFiles();
    setDialogSub('form');
    setCfgIconField(null);
    setDialogError(null);
    const init: Record<string, string> = {};
    for (const f of translatedSpec.fields) {
      if (f.kind === 'checkbox') init[f.key] = '0';
      else if (f.kind === 'number') init[f.key] = String(f.min ?? 0);
      else init[f.key] = '';
    }
    for (const [k, v] of Object.entries(spec.createExtra ?? {})) {
      if (translatedSpec.fields.some((f) => f.key === k)) init[k] = String(v);
    }
    const maxLv = rows.reduce((m, r) => Math.max(m, Number(r.level) || 0), -1);
    if (translatedSpec.fields.some((f) => f.key === 'level') || spec.table === 'cfg_ambient_music') init.level = String(maxLv + 1);
    if (spec.table === 'cfg_tasks') {
      const allowed = allowedTaskTypesForSection(spec.sectionId);
      init.task_type = allowed?.[0] ?? 'checkbox';
      if (spec.filter?.category_type === 'rituals') init.ritual_type = 'sunrise';
    }
    if (spec.table === 'cfg_leisure_tasks') init.task_type = 'timer';
    if (translatedSpec.fields.some((x) => x.key === 'type' && x.options?.some((o) => o.value === '__ordinary__'))) {
      init.type = '__ordinary__';
    }
    if (spec.table === 'cfg_rituals_morning' || spec.table === 'cfg_rituals_evening') init.active = '1';
    if (spec.table === 'cfg_nutrition_presets') setPresetIngredients(parsePresetIngredientDrafts(init.products));
    else setPresetIngredients([]);
    setForm(init);
    setTaskListItems(parseTaskListItems(init.config));
    setMode('create');
    setEditId(null);
    setAdvancedOpen(true);
    setOpen(true);
  }, [refreshAmbientMusicFiles, rows, spec, translatedSpec]);

  useLayoutEffect(() => {
    const isAmbientMusic = spec.table === 'cfg_ambient_music';
    setTabActions(
      <>
        {taskCategoryKey ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-8 gap-1.5 px-2 text-xs font-normal"
            onClick={openCategoryEditor}
            disabled={!db}
          >
            <Palette className="size-3.5" aria-hidden />
            Вид блока
          </Button>
        ) : null}
        {isAmbientMusic ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-8 gap-1.5 px-2 text-xs font-normal"
              onClick={() => void importAmbientMusicFiles()}
              disabled={!db || ambientMusicImporting}
            >
              <Music2 className="size-3.5" aria-hidden />
              Загрузить
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-8 gap-1.5 px-2 text-xs font-normal"
              onClick={() => void openAmbientMusicFolder()}
              disabled={!db}
            >
              <FolderOpen className="size-3.5" aria-hidden />
              Папка
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs font-semibold text-foreground hover:bg-hover"
          disabled={!db}
          onClick={openCreate}
        >
          <Plus className="size-3.5" aria-hidden />
          Добавить
        </Button>
      </>
    );
    return () => setTabActions(null);
  }, [
    setTabActions,
    db,
    spec.table,
    taskCategoryKey,
    openCategoryEditor,
    openCreate,
    importAmbientMusicFiles,
    ambientMusicImporting,
    openAmbientMusicFolder,
  ]);

  const openEdit = (row: AuraRow) => {
    refreshAmbientMusicFiles();
    setDialogSub('form');
    setCfgIconField(null);
    setDialogError(null);
    const id = String(row.id);
    const init: Record<string, string> = {};
    for (const f of translatedSpec.fields) init[f.key] = formValueFromRow(f, row, spec.sectionId);
    if (spec.table === 'cfg_nutrition_presets') setPresetIngredients(parsePresetIngredientDrafts(init.products));
    else setPresetIngredients([]);
    setForm(init);
    setTaskListItems(parseTaskListItems(init.config));
    setMode('edit');
    setEditId(id);
    setAdvancedOpen(true);
    setOpen(true);
  };

  // ─── Save / delete ────────────────────────────────────────────────────────

  const save = () => {
    if (!db) return;
    setDialogError(null);
    try {
      if (spec.table === 'cfg_tasks') {
        const payload = buildPayloadFromForm(spec, form, mode, editId ?? undefined);
        if (String(payload.task_type ?? '') === 'nutrition') {
          const hasOther = rows.some((r) => {
            if (mode === 'edit' && String(r.id) === editId) return false;
            return String(r.task_type ?? '') === 'nutrition';
          });
          if (hasOther) { setDialogError('Тип "Питание" может быть только у одной задачи.'); return; }
        }
        if (mode === 'create') {
          const created = db.create(spec.table, payload);
          if (!created) throw new Error('Не удалось создать запись в базе данных.');
        } else if (editId) {
          const { id: _id, ...rest } = payload;
          db.update(spec.table, editId, { ...rest, updated_at: new Date().toISOString() });
        }
      } else if (mode === 'create') {
        const created = db.create(spec.table, buildPayloadFromForm(spec, form, 'create'));
        if (!created) throw new Error('Не удалось создать запись в базе данных.');
      } else if (editId) {
        const payload = buildPayloadFromForm(spec, form, 'edit', editId);
        const { id: _id, ...rest } = payload;
        db.update(spec.table, editId, { ...rest, updated_at: new Date().toISOString() });
      }
      window.dispatchEvent(new Event('settings-saved'));
      setCfgIconField(null);
      setOpen(false);
      reload();
    } catch (e) {
      console.error('[CfgSectionCard]', e);
      setDialogError(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  const remove = (row: AuraRow) => {
    if (!db) return;
    setListError(null);
    try {
      db.delete(spec.table, String(row.id));
      window.dispatchEvent(new Event('settings-saved'));
      reload();
    } catch (e) {
      console.error('[CfgSectionCard] delete', e);
      setListError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const buildActItem = (
    row: AuraRow,
    index: number,
    scopeRows: AuraRow[],
    iconName?: string | null
  ): ActItem => {
    const tint = rowListAccent(spec, row);
    const title = spec.table === 'cfg_ambient_music'
      ? ambientTrackDisplayTitle(row)
      : rowTitle(row, spec.rowTitleKeys);
    return {
      id: String(row.id),
      kind: 'diary',
	      icon: iconName ?? (typeof row.icon === 'string' ? row.icon : null),
	      iconTint: cfgListIconTint(tint),
	      leading: spec.table === 'cfg_ambient_music' ? <AmbientTrackArtwork row={row} tint={tint} /> : undefined,
	      title:
        spec.table === 'cfg_expense_categories' && String(row.type ?? '') === 'compulsive' ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="truncate">{title}</span>
            <span
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-1 py-0.5 text-[10px] leading-none text-amber-700 dark:text-amber-200"
              title="Импульсивная категория"
            >
              <AlertTriangle className="size-3" aria-hidden />
            </span>
          </span>
      ) : title,
      description: rowMetaSummary(translatedSpec, row),
      value: rowValueSummary(translatedSpec, row),
      density: 'compact',
      onActivate: () => openEdit(row),
      onEdit: () => openEdit(row),
      onDelete: () => remove(row),
      onMoveUp: !hideRowReorder && canReorder && index > 0 ? () => moveRow(scopeRows, index, index - 1) : undefined,
      onMoveDown:
        !hideRowReorder && canReorder && index < scopeRows.length - 1
          ? () => moveRow(scopeRows, index, index + 1)
          : undefined,
    };
  };

  // ─── Field renderer ───────────────────────────────────────────────────────

  /**
   * Рендерит контрол для отдельного поля формы в зависимости от его kind.
   * Локальная функция (не компонент) — нужен прямой доступ к form/setForm.
   */
  const renderFieldControl = (f: CfgFieldDef): ReactNode => {
    const fid = `cfg-${spec.sectionId}-${f.key}`;

    // Nutrition preset: поле products открывает панель состава
    if (spec.table === 'cfg_nutrition_presets' && f.key === 'products') {
      return (
        <button
          id={fid}
          type="button"
          onClick={() => setDialogSub({ k: 'preset-products', field: f.key })}
          className="border-soft bg-transparent hover:bg-hover flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-none aura-tx-colors"
        >
          <span className="truncate">
            {presetIngredients.length > 0 ? `Ингредиентов: ${presetIngredients.length}` : 'Добавить ингредиенты'}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">Настроить</span>
        </button>
      );
    }

    if (spec.table === 'cfg_ambient_music' && f.key === 'cover_image') {
      const imgSrc = form[f.key] || '';
      return (
        <AmbientCoverImageField
          value={imgSrc}
          onChange={(v) => setForm((prev) => ({ ...prev, cover_image: v }))}
        />
      );
    }

    if (f.kind === 'textarea') {
      const tall = f.key === 'config' || f.key === 'products';
      return (
        <Textarea
          id={fid}
          value={form[f.key] ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
          rows={tall ? 8 : 4}
          className={cn(
            'border-soft bg-control/55 w-full min-w-0 resize-none rounded-lg border px-3 py-2 text-left text-sm shadow-none focus-visible:bg-control/75',
            tall && 'text-xs leading-relaxed'
          )}
        />
      );
    }

    if (f.kind === 'text' && f.key === 'icon') {
      const name = (form[f.key] ?? '').trim();
      return (
        <button
          id={fid}
          type="button"
          onMouseEnter={warmIconsManifest}
          onFocus={warmIconsManifest}
          onClick={() => setCfgIconField(f.key)}
          className={CFG_ICON_TRIGGER_CN}
        >
          <span className="aura-inline-icon flex size-5 shrink-0 items-center justify-center text-current">
            <AuraThemedIcon name={name || null} size={14} tint="currentColor" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{formatCfgIconLabel(name)}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      );
    }

    if (f.kind === 'text') {
      // Ambient music: выбор файла из Select вместо Input
      if (spec.table === 'cfg_ambient_music' && f.key === 'file_name') {
        return (
          <Select
            value={form[f.key] || '__none__'}
            onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === '__none__' ? '' : v }))}
          >
          <SelectTrigger
            id={fid}
            contentAlign="start"
            className={CFG_INPUT_CN}
          >
              <SelectValue placeholder={ambientMusicFiles.length > 0 ? 'Выберите файл' : 'Файлы не найдены'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не выбрано</SelectItem>
              {ambientMusicFiles.map((fileName) => (
                <SelectItem key={fileName} value={fileName}>{fileName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (f.suffix || f.suffixFromField || f.suffixHint) {
        return (
          <CfgAffixValueField
            id={fid}
            inputKind="text"
            value={form[f.key] ?? ''}
            displayAffix={cfgDisplayAffix(f, form)}
            ariaLabel={f.label}
            placeholder={f.placeholder}
            onCommit={(next) => setForm((prev) => ({ ...prev, [f.key]: next }))}
          />
        );
      }
      return (
        <Input
          id={fid}
          className={CFG_INPUT_CN}
          value={form[f.key] ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
        />
      );
    }

    if (f.kind === 'number') {
      return (
        <CfgAffixValueField
          id={fid}
          inputKind="number"
          value={form[f.key] ?? ''}
          displayAffix={cfgDisplayAffix(f, form)}
          ariaLabel={f.label}
          onCommit={(next) => setForm((prev) => ({ ...prev, [f.key]: next }))}
        />
      );
    }

    if (f.kind === 'color') {
      const raw = form[f.key] || '';
      const parsed = parseHexColor(raw);
      const paint = normalizeCssColorForPaint(raw) ?? parsed;
      const pickerSeed = paint ?? COLOR_PICKER_DEFAULT;
      const emptyPattern =
        'linear-gradient(135deg,var(--muted)_25%,transparent_25%,transparent_50%,var(--muted)_50%,var(--muted)_75%,transparent_75%,transparent)';
      return (
        <button
          id={fid}
          type="button"
          onClick={() => { setColorDraft(pickerSeed); setDialogSub({ k: 'color', field: f.key }); }}
          className="border-soft bg-control/55 text-foreground hover:bg-hover focus-visible:ring-ring/70 flex h-9 w-full min-w-0 items-center justify-start gap-2 rounded-lg border px-3 text-left text-sm shadow-none aura-tx-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label={f.label}
        >
          <span
            className="size-5 shrink-0 rounded-md border border-soft shadow-xs"
            style={{
              backgroundColor: paint ?? undefined,
              backgroundImage: paint ? undefined : emptyPattern,
              backgroundSize: paint ? undefined : '6px 6px',
            }}
            aria-hidden
          />
          <span className="min-w-0 truncate font-medium tabular-nums">{raw.trim() || '—'}</span>
        </button>
      );
    }

    if (f.kind === 'select' && f.options) {
      const options =
        f.key === 'task_type'
          ? f.options.filter((o) => {
              const allowed = allowedTaskTypesForSection(spec.sectionId);
              return !allowed || allowed.includes(o.value);
            })
          : f.options;
      return (
        <Select
          value={form[f.key] ?? ''}
          onValueChange={(v) => {
            if (f.key === 'task_type') {
              // Вычисляем переход снаружи setForm — нужен доступ к nextForm.config
              // для синхронного обновления taskListItems без захвата через изменяемую переменную
              const nextForm = applyTaskTypeTransition(form, spec, v);
              setForm(nextForm);
              if (v === 'list') setTaskListItems(parseTaskListItems(nextForm.config));
            } else {
              setForm((prev) => ({ ...prev, [f.key]: v }));
            }
          }}
        >
          <SelectTrigger
            id={fid}
            contentAlign="start"
            className={CFG_INPUT_CN}
          >
            <SelectValue placeholder="Выберите" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value || 'empty'} value={o.value}>
                <span className="flex min-w-0 items-center gap-2 text-foreground">
                  {CfgSelectOptionIcon(spec.table, f.key, o.value)}
                  <span className="truncate">{o.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  // ─── Checkbox row helper ──────────────────────────────────────────────────

  /** Строка формы для поля-чекбокса (с учётом лимита счётов на главной). */
  const renderCheckboxRow = (f: CfgFieldDef) => {
    const fid = `cfg-${spec.sectionId}-${f.key}`;
    const isHomeVisible = spec.table === 'cfg_accounts' && f.key === 'home_visible';
    const checked = form[f.key] === '1';
    const currentRowVisible =
      mode === 'edit' && editId
        ? String(rows.find((r) => String(r.id) === editId)?.home_visible ?? '1') !== '0'
        : false;
    const maxedOut = isHomeVisible && !checked && visibleHomeAccountsCount >= 2 && !currentRowVisible;
    return (
      <CfgModalGridRow key={f.key} label={f.label} htmlFor={fid}>
        <div className="border-soft bg-transparent flex min-h-9 w-full items-center justify-center rounded-md border px-3 shadow-none">
          <Switch
            id={fid}
            checked={checked}
            disabled={maxedOut}
            onCheckedChange={(ch) => setForm((prev) => ({ ...prev, [f.key]: ch ? '1' : '0' }))}
          />
          <div className="ml-2 min-w-0 flex-1">
            {spec.sectionId === 'finance-expense' && f.key === 'type' ? (
              <span className="text-foreground text-xs font-medium">{checked ? 'Да' : 'Нет'}</span>
            ) : null}
            {isHomeVisible ? (
              <p className="text-muted-foreground text-caption leading-snug">
                {maxedOut
                  ? 'Максимум 2 счета уже выбрано для главной.'
                  : checked
                    ? `Показывается на главной. После выключения останется ${Math.max(0, visibleHomeAccountsCount - 1)}.`
                    : `Сейчас видно ${visibleHomeAccountsCount} из 2.`}
              </p>
            ) : null}
          </div>
        </div>
      </CfgModalGridRow>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Row list ── */}
      <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
        {listError ? (
          <p className="rounded-lg border border-soft bg-panel/55 px-3 py-2 text-sm text-subtle" role="status">
            {listError}
          </p>
        ) : null}

        {!db ? (
          <LoadingShell />
        ) : spec.table === 'cfg_ambient_music' ? (
          <AmbientTrackShelf
            rows={rows}
            onEdit={openEdit}
            onDelete={remove}
            onMoveUp={(index) => moveRow(rows, index, index - 1)}
            onMoveDown={(index) => moveRow(rows, index, index + 1)}
          />
        ) : spec.sectionId === 'nutrition-products' ? (
          /* Nutrition products: сгруппированы по типу */
          <div className="flex flex-col gap-3">
            {NUTRITION_GROUPS.map((gKey) => {
              const inGroup = rows.filter((r) => String(r.group ?? 'proteins') === gKey);
              if (inGroup.length === 0) return null;
              return (
                <div key={gKey} className="flex flex-col gap-2">
                  <p className="text-muted-foreground px-0.5 text-xs font-semibold tracking-wide uppercase">
                    {NUTRITION_GROUP_LABEL[gKey]}
                  </p>
                  <ActList
                    items={inGroup.map((r, idx) => buildActItem(r, idx, inGroup, NUTRITION_GROUP_ICON[gKey]))}
                    emptyTitle="Пока нет записей."
                  />
                </div>
              );
            })}
            {/* Ungrouped products */}
            {(() => {
              const known = new Set<string>(NUTRITION_GROUPS);
              const other = rows.filter((r) => !known.has(String(r.group ?? '')));
              if (other.length === 0) return null;
              return (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground px-0.5 text-xs font-semibold tracking-wide uppercase">Другое</p>
                  <ActList
                    items={other.map((r, idx) => {
                      const g = String(r.group ?? 'proteins');
                      const iconName = g === 'proteins' || g === 'fats' || g === 'carbs' ? NUTRITION_GROUP_ICON[g] : 'apple';
                      return buildActItem(r, idx, other, iconName);
                    })}
                    emptyTitle="Пока нет записей."
                  />
                </div>
              );
            })()}
            {rows.length === 0 ? (
              <EmptyState
                title="Пока нет записей."
                hint="Создайте первую запись, и она сразу появится в списке."
                compact
              />
            ) : null}
          </div>
        ) : (
          /* Standard flat list */
          <div className="flex min-h-0 flex-col gap-3">
            <ActList
              items={rows.map((r, idx) => buildActItem(r, idx, rows))}
              emptyTitle="Пока нет записей."
              emptyHint="Создайте первую запись, и она сразу появится в списке."
            />
          </div>
        )}

        {spec.table === 'cfg_ambient_music' && ambientMusicFolderPath ? (
          <p className="text-muted-foreground text-xs">Папка музыки: {ambientMusicFolderPath}</p>
        ) : null}
      </div>

      {/* ── Create / edit dialog ── */}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) { setOpen(false); setDialogError(null); setDialogSub('form'); setCfgIconField(null); }
        }}
      >
        <UniversalModalContent
          size="md"
          showCloseButton={false}
          className="origin-center data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-aura-slow data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-aura-base"
        >
          <SettingsDialogLayout
            header={
              dialogSub === 'form' ? (
                <SettingsDialogHeader icon={Pencil} title={translatedSpec.title} showCloseButton />
              ) : dialogSub.k === 'preset-products' ? (
                <SettingsDialogHeader icon={ListPlus} title="Состав блюда" showCloseButton={false} />
              ) : (
                <SettingsDialogHeader icon={Palette} title="Палитра" showCloseButton={false} />
              )
            }
            footer={
              dialogSub === 'form' ? (
                <ActModalFooter
                  cancelLabel="Отмена"
                  submitLabel="Сохранить"
                  onCancel={() => setOpen(false)}
                  onSubmit={save}
                  submitDisabled={!db}
                />
              ) : dialogSub.k === 'preset-products' ? (
                <ActModalFooter
                  cancelLabel="Назад"
                  submitLabel="Применить состав"
                  onCancel={() => setDialogSub('form')}
                  onSubmit={() => {
                    const field = (dialogSub as { k: 'preset-products'; field: string }).field;
                    setForm((prev) => ({ ...prev, [field]: encodePresetIngredientDrafts(presetIngredients, nutritionProductsById) }));
                    setDialogSub('form');
                  }}
                />
              ) : (
                <ActModalFooter
                  cancelLabel="Назад"
                  submitLabel="Применить цвет"
                  onCancel={() => setDialogSub('form')}
                  onSubmit={() => {
                    const field = (dialogSub as { k: 'color'; field: string }).field;
                    const picked = (normalizeCssColorForPaint(colorDraft) ?? colorDraft.trim()) || COLOR_PICKER_DEFAULT;
                    setForm((prev) => ({ ...prev, [field]: picked }));
                    setDialogSub('form');
                  }}
                />
              )
            }
          >
            {dialogSub === 'form' ? (
              /* ── Form fields ── */
              <div className="flex flex-col gap-3">
                {dialogError ? (
                  <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm" role="alert">
                    {dialogError}
                  </p>
                ) : null}
                <div className="overflow-hidden rounded-lg border border-soft divide-y divide-soft/70">
                  {/* Base fields */}
                  {baseVisibleFields.map((f) =>
                    f.kind === 'checkbox' ? renderCheckboxRow(f) : (
                      <CfgModalGridRow key={f.key} label={f.label} htmlFor={`cfg-${spec.sectionId}-${f.key}`}>
                        {renderFieldControl(f)}
                      </CfgModalGridRow>
                    )
                  )}

                  {/* Conditional (task-type-dependent) fields — collapsible */}
                  {conditionalVisibleFields.length > 0 ? (
                    <div>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-subtle hover:bg-hover hover:text-foreground aura-tx-colors"
                        onClick={() => setAdvancedOpen((v) => !v)}
                      >
                        <span>Параметры типа: {taskTypeLabel(translatedSpec, currentTaskType)}</span>
                        <ChevronDown className={cn('size-3.5 text-faint transition-transform duration-200', advancedOpen && 'rotate-180')} />
                      </button>
                      {advancedOpen ? (
                        <div className="divide-y divide-soft/70 border-t border-soft bg-panel/30">
                          {conditionalVisibleFields.map((f) =>
                            f.kind === 'checkbox' ? renderCheckboxRow(f) : (
                              <CfgModalGridRow key={f.key} label={f.label} htmlFor={`cfg-${spec.sectionId}-${f.key}`}>
                                {renderFieldControl(f)}
                              </CfgModalGridRow>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Task-list items editor */}
                  {(spec.table === 'cfg_tasks' || spec.table === 'cfg_leisure_tasks') && currentTaskType === 'list' ? (
                    <div className="rounded-lg border border-soft/55 bg-transparent p-2">
                      <div className="border-soft bg-transparent overflow-hidden rounded-md border p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">Элементы списка</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() => setTaskListItems((prev) => [...prev, { title: `Пункт ${prev.length + 1}`, percent: 0 }])}
                          >
                            Добавить
                          </Button>
                        </div>
                        {taskListItems.length === 0 ? (
                          <EmptyState
                            title="Пока нет элементов."
                            hint="Добавьте первый пункт, чтобы сформировать список."
                            className="mx-1"
                            compact
                          />
                        ) : (
                          <div className="flex flex-col gap-2">
                            {taskListItems.map((it, idx) => (
                              <div key={idx} className="border-border/70 grid grid-cols-[1.2rem_minmax(0,1fr)_5.5rem_auto] items-center gap-2 rounded-md border p-2">
                                <span className="text-muted-foreground text-center text-xs tabular-nums">{idx + 1}</span>
                                <Input
                                  value={it.title}
                                  onChange={(e) => setTaskListItems((prev) => prev.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))}
                                  placeholder="Название пункта"
                                  className="h-8 text-left text-xs"
                                />
                                <Input
                                  value={String(it.percent)}
                                  inputMode="numeric"
                                  onChange={(e) =>
                                    setTaskListItems((prev) =>
                                      prev.map((x, i) =>
                                        i === idx
                                          ? { ...x, percent: Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)) }
                                          : x
                                      )
                                    )
                                  }
                                  className="h-8 text-center text-xs tabular-nums"
                                  aria-label="Процент выполнения"
                                />
                                <div className="flex items-center gap-1">
                                  <Button type="button" size="icon-sm" variant="ghost" className="h-7 w-7" disabled={idx === 0}
                                    onClick={() => setTaskListItems((prev) => {
                                      if (idx === 0) return prev;
                                      const next = [...prev];
                                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                      return next;
                                    })}>↑</Button>
                                  <Button type="button" size="icon-sm" variant="ghost" className="h-7 w-7" disabled={idx === taskListItems.length - 1}
                                    onClick={() => setTaskListItems((prev) => {
                                      if (idx >= prev.length - 1) return prev;
                                      const next = [...prev];
                                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                      return next;
                                    })}>↓</Button>
                                  <Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7"
                                    onClick={() => setTaskListItems((prev) => prev.filter((_, i) => i !== idx))}>
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : dialogSub.k === 'preset-products' ? (
              /* ── Nutrition preset ingredients ── */
              <CfgPresetProductsPanel
                presetIngredients={presetIngredients}
                onIngredientsChange={setPresetIngredients}
                nutritionProducts={nutritionProducts}
                nutritionProductsById={nutritionProductsById}
              />
            ) : (
              /* ── Color picker ── */
              <ColorPickerPanel
                value={colorDraft}
                onChange={setColorDraft}
                presets={restrictedColorPresets ?? undefined}
                onPresetPick={(picked) => {
                  const field = (dialogSub as { k: 'color'; field: string }).field;
                  const next = normalizeCssColorForPaint(picked) ?? picked;
                  setForm((prev) => ({ ...prev, [field]: next }));
                  setDialogSub('form');
                }}
              />
            )}
          </SettingsDialogLayout>
        </UniversalModalContent>
      </Dialog>

      {/* ── Icon picker dialog ── */}
      <Dialog open={cfgIconField != null} onOpenChange={(next) => !next && setCfgIconField(null)}>
        <UniversalModalContent
          size="picker"
          scroll="content"
          className={UNIVERSAL_MODAL_COMPACT_PICKER_CN}
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 border-b border-border/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-xs" onClick={() => setCfgIconField(null)}>
                ← К форме
              </Button>
              <DialogTitle className="min-w-0 flex-1 text-center text-sm font-semibold leading-tight">
                <span className="inline-flex items-center justify-center gap-2">
                  <Pencil className="size-4" />
                  <span>Каталог иконок</span>
                </span>
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {cfgIconField ? (
              <IconPickerPanel
                current={form[cfgIconField] || undefined}
                onPick={(name) => {
                  setForm((prev) => ({ ...prev, [cfgIconField]: name }));
                  setCfgIconField(null);
                }}
              />
            ) : null}
          </div>
        </UniversalModalContent>
      </Dialog>

      {/* ── Category editor + icon picker (extracted component) ── */}
      <CfgCategoryEditorDialog
        open={categoryOpen}
        onOpenChange={(next) => { setCategoryOpen(next); if (!next) setCategoryError(null); }}
        categoryForm={categoryForm}
        onCategoryFormChange={setCategoryForm}
        categoryError={categoryError}
        iconPickerOpen={categoryIconPickerOpen}
        onIconPickerOpenChange={setCategoryIconPickerOpen}
        onSave={saveCategoryEditor}
        disabled={!db || !taskCategoryKey}
      />
    </>
  );
}
