import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, FolderOpen, ListPlus, Music2, Palette, Pencil, Settings, Trash2, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddListButton } from '@/components/ui/add-list-button';
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UniversalModalContent } from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ListItem } from '@/components/ui/list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { SettingsDialogHeader } from '@/features/settings/settings-form-primitives';
import { ColorPickerPanel } from '@/features/settings/color-picker-panel';
import { IconPickerPanel } from '@/features/settings/icon-picker-panel';
import { SettingsDialogLayout } from '@/features/settings/settings-dialog-layout';
import {
  CFG_ACCOUNT_COLOR_PRESETS,
  CFG_EXPENSE_COLOR_PRESETS,
  CFG_INCOME_COLOR_PRESETS,
  CFG_LEISURE_ESCAPE_COLOR_PRESETS,
  CFG_LEISURE_FILLING_COLOR_PRESETS,
  parseHexColor,
  type CfgColorPreset,
} from '@/features/settings/cfg-color-presets';
import { normalizeCssColorForPaint } from '@/lib/css-color';
import { CfgSelectOptionIcon } from '@/shared/lib/cfg-select-icons';
import { TASK_CATEGORY_PALETTE } from '@/shared/design/aura-palette';
import { TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';
import type { CfgFieldDef, CfgSectionSpec } from '@/features/settings/cfg-section-types';
import type { AuraRow } from '@/types/aura';
import { cn } from '@/lib/utils';
import { useSettingsTabActions } from '@/features/settings/settings-tab-actions-context';
import { calculateProductNutrition } from '@/shared/lib/nutrition-calc';
import { ActAffixValueField, ActModalFooter } from '@/features/act/ActModal';
import { LoadingShell } from '@/shared/ui/data-states';

const COLOR_PICKER_DEFAULT = '#64748b';

/** Единый ритм правой колонки CFG-модалки (высота как у `h-9`). */
const CFG_INPUT_CN =
  'border-input bg-background h-9 w-full min-w-0 rounded-md border px-3 text-center text-sm shadow-xs';
const CFG_ICON_TRIGGER_CN =
  'border-input bg-background hover:bg-muted/50 flex h-9 w-full min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 text-center text-sm font-normal aura-tx-colors shadow-xs';
type DialogSub = 'form' | { k: 'color'; field: string } | { k: 'preset-products'; field: string };

function sectionColorPresets(sectionId: string): CfgColorPreset[] | null {
  if (sectionId === 'finance-accounts') return CFG_ACCOUNT_COLOR_PRESETS;
  if (sectionId === 'finance-income') return CFG_INCOME_COLOR_PRESETS;
  if (sectionId === 'finance-expense') return CFG_EXPENSE_COLOR_PRESETS;
  if (sectionId === 'leisure-filling') return CFG_LEISURE_FILLING_COLOR_PRESETS;
  if (sectionId === 'leisure-escape') return CFG_LEISURE_ESCAPE_COLOR_PRESETS;
  return null;
}

function normalizeColorToken(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeRestrictedSectionColor(sectionId: string, raw: unknown): string | null {
  const presets = sectionColorPresets(sectionId);
  if (!presets || presets.length === 0) return null;
  const fallback = presets[0].value;
  const text = String(raw ?? '').trim();
  if (!text) return fallback;
  const hit = presets.find((p) => normalizeColorToken(p.value) === normalizeColorToken(text));
  if (hit) return hit.value;
  return fallback;
}

type TaskCategoryKey = 'rituals' | 'time' | 'body' | 'deps';
type TaskCategoryConfig = { title: string; icon: string; color: string };

const TASK_CATEGORY_DEFAULTS: Record<TaskCategoryKey, TaskCategoryConfig> = {
  rituals: { ...TASK_CATEGORY_DEFAULT_META.rituals, color: TASK_CATEGORY_PALETTE[0] },
  time: { ...TASK_CATEGORY_DEFAULT_META.time, color: TASK_CATEGORY_PALETTE[1] },
  body: { ...TASK_CATEGORY_DEFAULT_META.body, color: TASK_CATEGORY_PALETTE[2] },
  deps: { ...TASK_CATEGORY_DEFAULT_META.deps, color: TASK_CATEGORY_PALETTE[3] },
};

function sectionTaskCategoryKey(sectionId: string): TaskCategoryKey | null {
  if (sectionId === 'tasks-rituals') return 'rituals';
  if (sectionId === 'tasks-time') return 'time';
  if (sectionId === 'tasks-body') return 'body';
  if (sectionId === 'tasks-deps') return 'deps';
  return null;
}

function readTaskCategoryConfig(raw: unknown, key: TaskCategoryKey): TaskCategoryConfig {
  const def = TASK_CATEGORY_DEFAULTS[key];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return def;
    const block = (parsed as Record<string, unknown>)[key];
    if (!block || typeof block !== 'object') return def;
    const e = block as Record<string, unknown>;
    return {
      title: typeof e.title === 'string' && e.title.trim() ? e.title.trim() : def.title,
      icon: typeof e.icon === 'string' && e.icon.trim() ? e.icon.trim() : def.icon,
      color: typeof e.color === 'string' && e.color.trim() ? e.color.trim() : def.color,
    };
  } catch {
    return def;
  }
}

function suffixDynamicFromForm(f: CfgFieldDef, form: Record<string, string>): string | undefined {
  if (!f.suffixFromField) return undefined;
  const v = form[f.suffixFromField]?.trim();
  return v || undefined;
}

function cfgDisplayAffix(f: CfgFieldDef, form: Record<string, string>): string {
  const dyn = suffixDynamicFromForm(f, form) ?? '';
  const stat = f.suffix ?? '';
  return `${dyn}${stat}`;
}

/** Не textarea: число или короткий текст с суффиксом — просмотр «значение+единица» по центру, по клику пустой ввод с нуля. */
function CfgAffixValueField({
  id,
  inputKind,
  value,
  displayAffix,
  onCommit,
  ariaLabel,
  placeholder,
}: {
  id: string;
  inputKind: 'number' | 'text';
  value: string;
  displayAffix: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const snapshotRef = useRef(value);

  useEffect(() => {
    if (!editing) snapshotRef.current = value;
  }, [value, editing]);

  const displayLine = useMemo(() => {
    const t = value.trim();
    if (!t) return '—';
    const a = displayAffix.trim();
    if (!a) return t;
    return `${t}\u00a0${a}`;
  }, [value, displayAffix]);

  const start = () => {
    snapshotRef.current = value;
    setDraft('');
    setEditing(true);
  };

  const commit = () => {
    const snap = snapshotRef.current;
    const t = draft.trim();
    if (t === '') {
      onCommit(snap);
    } else if (inputKind === 'number') {
      const n = parseFloat(t.replace(',', '.'));
      onCommit(Number.isFinite(n) ? t : snap);
    } else {
      onCommit(draft);
    }
    setEditing(false);
    setDraft('');
  };

  const cancel = () => {
    setEditing(false);
    setDraft('');
  };

  const sanitizeNumericDraft = (raw: string) => {
    const normalized = raw.replace(',', '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex === -1) return cleaned;
    const intPart = cleaned.slice(0, dotIndex);
    const fracPart = cleaned
      .slice(dotIndex + 1)
      .replace(/\./g, '');
    return `${intPart}.${fracPart}`;
  };

  if (!editing) {
    return (
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        onClick={start}
        className="border-input bg-background text-foreground hover:bg-muted/20 flex h-9 w-full min-w-0 items-center justify-center rounded-md border px-3 text-center text-sm shadow-xs aura-tx-colors"
      >
        <span className={cn('max-w-full truncate', inputKind === 'number' && 'tabular-nums')}>{displayLine}</span>
      </button>
    );
  }

  return (
    <Input
      id={id}
      autoFocus
      type="text"
      inputMode={inputKind === 'number' ? 'decimal' : 'text'}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(inputKind === 'number' ? sanitizeNumericDraft(e.target.value) : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      className={cn(
        'border-input bg-background h-9 w-full min-w-0 rounded-md border px-3 text-center text-sm shadow-xs',
        inputKind === 'number' && 'tabular-nums'
      )}
    />
  );
}

function CfgModalGridRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 border-b border-border last:border-b-0 sm:grid-cols-[minmax(9rem,28%)_1fr] sm:divide-x sm:divide-border">
      <div className="flex items-center justify-center bg-muted/30 px-2 py-2 text-center sm:min-h-9 sm:px-3">
        <Label
          htmlFor={htmlFor}
          className="text-foreground cursor-default text-xs font-semibold leading-snug break-words"
        >
          {label}
        </Label>
      </div>
      <div className="flex min-w-0 w-full flex-col items-center justify-center px-2 py-2 sm:min-h-9 sm:px-3">
        {children}
      </div>
    </div>
  );
}

function matchesFilter(row: AuraRow, filter?: Record<string, string | number>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => String(row[k] ?? '') === String(v));
}

function rowTitle(row: AuraRow, keys?: string[]): string {
  const ks = keys ?? ['title', 'name', 'id'];
  for (const k of ks) {
    if (row[k] != null && String(row[k]).length) return String(row[k]);
  }
  return String(row.id ?? '');
}

function rowMetaSummary(spec: CfgSectionSpec, row: AuraRow): ReactNode | undefined {
  if (spec.table === 'cfg_diary_entry_presets') {
    const prompt = typeof row.prompt === 'string' ? row.prompt.trim().replace(/\s+/g, ' ') : '';
    const description = typeof row.description === 'string' ? row.description.trim().replace(/\s+/g, ' ') : '';
    const parts: string[] = [];
    if (prompt) parts.push(prompt.length > 96 ? `${prompt.slice(0, 96).trimEnd()}…` : prompt);
    if (description) parts.push(description.length > 72 ? `${description.slice(0, 72).trimEnd()}…` : description);
    if (Number(row.active ?? 1) === 0) parts.push('Неактивная');
    if (parts.length > 0) return <span className="text-muted-foreground">{parts.join(' · ')}</span>;
  }
  return undefined;
}

function sortRows(rows: AuraRow[], sortBy: CfgSectionSpec['sortBy']): AuraRow[] {
  if (!sortBy || sortBy === 'none') return rows;
  return [...rows].sort((a, b) => {
    if (sortBy === 'level') return (Number(a.level) || 0) - (Number(b.level) || 0);
    if (sortBy === 'name') return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru');
    return String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru');
  });
}

function allowedTaskTypesForSection(sectionId: string): string[] | null {
  if (sectionId === 'tasks-rituals') return ['checkbox', 'number', 'ritual', 'nutrition', 'list'];
  if (sectionId === 'tasks-time') return ['checkbox', 'number', 'timer', 'nutrition', 'list'];
  if (sectionId === 'tasks-body') return ['checkbox', 'number', 'nutrition', 'list'];
  if (sectionId === 'tasks-deps') return ['checkbox'];
  return null;
}

function isTaskConditionalFieldVisible(spec: CfgSectionSpec, fieldKey: string, taskType: string): boolean {
  if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') return true;
  if (fieldKey === 'ritual_type') return taskType === 'ritual';
  if (fieldKey === 'cfg_target_value' || fieldKey === 'cfg_unit') return taskType === 'number';
  if (fieldKey === 'cfg_target_hours') return taskType === 'timer';
  if (fieldKey === 'config') return taskType === 'list';
  return true;
}

function isTaskDependentFieldKey(spec: CfgSectionSpec, fieldKey: string): boolean {
  if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') return false;
  return (
    fieldKey === 'ritual_type' ||
    fieldKey === 'cfg_target_value' ||
    fieldKey === 'cfg_unit' ||
    fieldKey === 'cfg_target_hours' ||
    fieldKey === 'config'
  );
}

function taskTypeLabel(spec: CfgSectionSpec, taskType: string): string {
  const field = spec.fields.find((f) => f.key === 'task_type');
  const opt = field?.options?.find((o) => o.value === taskType);
  return opt?.label ?? taskType;
}

function applyTaskTypeTransition(
  prev: Record<string, string>,
  spec: CfgSectionSpec,
  nextTaskType: string
): Record<string, string> {
  if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') {
    return { ...prev, task_type: nextTaskType };
  }
  const next: Record<string, string> = { ...prev, task_type: nextTaskType };
  if (nextTaskType !== 'ritual') next.ritual_type = '';
  if (nextTaskType !== 'nutrition') {
    // nutrition task is driven by the daily calorie target from app settings
  }
  if (nextTaskType !== 'number') {
    next.cfg_target_value = '';
    next.cfg_unit = '';
  }
  if (nextTaskType !== 'timer') next.cfg_target_hours = '';
  if (nextTaskType !== 'list') next.config = next.config || '{"items":[]}';
  return next;
}

type TaskListCfgItem = { title: string; percent: number };

function parseTaskListItems(raw: string | undefined): TaskListCfgItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { items?: Array<{ title?: unknown; name?: unknown; percent?: unknown; percentage?: unknown }> };
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items.map((it, idx) => {
      const t = typeof it.title === 'string' ? it.title : typeof it.name === 'string' ? it.name : `Пункт ${idx + 1}`;
      const p = Number(it.percent ?? it.percentage ?? 0);
      return { title: t, percent: Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0 };
    });
  } catch {
    return [];
  }
}

function encodeTaskListItems(items: TaskListCfgItem[]): string {
  return JSON.stringify({
    items: items.map((it) => ({
      title: String(it.title ?? '').trim() || 'Без названия',
      percent: Math.max(0, Math.min(100, Number(it.percent) || 0)),
    })),
  });
}

function formValueFromRow(def: CfgFieldDef, row: AuraRow, sectionId: string): string {
  const raw = row[def.key];
  if (sectionId === 'finance-expense' && def.key === 'type' && def.kind === 'checkbox') {
    return String(raw ?? '') === 'compulsive' ? '1' : '0';
  }
  if (def.kind === 'checkbox') return raw === 1 || raw === true ? '1' : '0';
  if (raw === null || raw === undefined) return '';
  if (def.key === 'type' && def.options?.some((o) => o.value === '__ordinary__')) {
    const s = String(raw);
    return s === '' || s === 'ordinary' ? '__ordinary__' : s;
  }
  return String(raw);
}

function coerceField(def: CfgFieldDef, str: string | undefined): unknown {
  const v = str ?? '';
  if (def.kind === 'checkbox') return v === '1' || v === 'true' ? 1 : 0;
  if (def.kind === 'number') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def.min ?? 0;
  }
  if (def.kind === 'color') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  const t = v.trim();
  if (def.key === 'type' && t === '__ordinary__') return '';
  return t === '' ? null : t;
}

function cleanupRow(table: string, payload: AuraRow): AuraRow {
  const p = { ...payload };
  if (table === 'cfg_tasks' && p.task_type !== 'ritual') {
    delete p.ritual_type;
  }
  if (table === 'cfg_tasks' && p.task_type !== 'number') {
    delete p.cfg_target_value;
    delete p.cfg_unit;
  }
  if (table === 'cfg_tasks' && p.task_type !== 'timer') {
    delete p.cfg_target_hours;
  }
  if (table === 'cfg_tasks' && p.task_type !== 'list') {
    delete p.config;
  }
  if (
    table === 'cfg_tasks' ||
    table === 'cfg_vows' ||
    table === 'cfg_nutrition_products' ||
    table === 'cfg_nutrition_presets' ||
    table === 'cfg_ambient_music'
  ) {
    p.color = null;
  }
  return p;
}

const NUTRITION_PRODUCT_GROUPS = ['proteins', 'fats', 'carbs'] as const;
const NUTRITION_PRODUCT_GROUP_LABEL: Record<(typeof NUTRITION_PRODUCT_GROUPS)[number], string> = {
  proteins: 'Белки',
  fats: 'Жиры',
  carbs: 'Углеводы',
};
const NUTRITION_PRODUCT_GROUP_ICON: Record<(typeof NUTRITION_PRODUCT_GROUPS)[number], string> = {
  proteins: 'beef',
  fats: 'flame',
  carbs: 'wheat',
};

type PresetIngredientDraft = {
  product_id: string;
  amount: string;
  unit: 'portions' | 'grams';
};

function parsePresetIngredientDrafts(raw: string | undefined): PresetIngredientDraft[] {
  try {
    const parsed = JSON.parse(raw || '[]') as Array<{ product_id?: unknown; portions?: unknown }>;
    if (!Array.isArray(parsed)) return [];
    const mapped = parsed
      .map((it) => ({
        product_id: typeof it?.product_id === 'string' ? it.product_id : '',
        amount: String(Number(it?.portions ?? 0) || 0),
        unit: 'portions' as const,
      }))
      .filter((it) => it.product_id);
    return mapped.length > 0 ? mapped : [{ product_id: '', amount: '1', unit: 'portions' }];
  } catch {
    return [{ product_id: '', amount: '1', unit: 'portions' }];
  }
}

function encodePresetIngredientDrafts(items: PresetIngredientDraft[], productsById: Record<string, AuraRow>): string {
  const out = items
    .map((it) => {
      const rawAmount = Number.parseFloat(String(it.amount).replace(',', '.'));
      if (!Number.isFinite(rawAmount) || rawAmount <= 0 || !it.product_id) return null;
      let portions = rawAmount;
      if (it.unit === 'grams') {
        const product = productsById[it.product_id];
        const portionWeight = Number(product?.portion_weight) || 0;
        if (portionWeight <= 0) return null;
        portions = rawAmount / portionWeight;
      }
      return {
        product_id: it.product_id,
        portions,
      };
    })
    .filter((x): x is { product_id: string; portions: number } => x != null);
  return JSON.stringify(out);
}

const AMBIENT_MUSIC_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);
const AMBIENT_MUSIC_DEFAULT_ICON = 'music-2';

function getNodeRequire() {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function') {
    return (globalThis as { require: (id: string) => unknown }).require;
  }
  if (typeof require === 'function') return require;
  return null;
}

function resolveAmbientMusicFolderPath(): string | null {
  const req = getNodeRequire();
  if (!req) return null;
  try {
    const fs = req('fs') as {
      existsSync: (path: string) => boolean;
      mkdirSync: (path: string, opts?: { recursive?: boolean }) => void;
    };
    const path = req('path') as { join: (...parts: string[]) => string };
    const userDataPath = window.__auraUserDataPath;
    const appPath = window.__auraAppPath;
    if (userDataPath) {
      const ambientDir = path.join(userDataPath, 'ambient');
      if (!fs.existsSync(ambientDir)) fs.mkdirSync(ambientDir, { recursive: true });
      return ambientDir;
    }
    if (appPath) return path.join(appPath, 'public', 'ambient-stock');
  } catch {
    return null;
  }
  return null;
}

function readAmbientMusicFileNames(folderPath: string): string[] {
  const req = getNodeRequire();
  if (!req) return [];
  try {
    const fs = req('fs') as {
      readdirSync: (path: string, opts?: { withFileTypes?: boolean }) => Array<{ isFile: () => boolean; name: string }>;
    };
    const path = req('path') as { extname: (path: string) => string };
    return fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => AMBIENT_MUSIC_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  } catch {
    return [];
  }
}

function ambientMusicImportKey(fileName: string): string {
  return fileName.trim().toLowerCase();
}

/** Акцент иконки в списке CFG: задачи — всегда цвет категории; остальное — из БД или запасной токен. */
function rowListAccent(spec: CfgSectionSpec, row: AuraRow): string {
  if (spec.table === 'cfg_rituals_morning') return 'var(--rituals-morning)';
  if (spec.table === 'cfg_rituals_evening') return 'var(--rituals-evening)';
  if (spec.table === 'cfg_vows') return 'var(--rituals-vows)';
  if (spec.table === 'cfg_ambient_music') return 'var(--ambient-music)';
  if (spec.table === 'cfg_tasks') {
    const cat = String(row.category_type ?? '');
    if (cat === 'rituals' || cat === 'time' || cat === 'body' || cat === 'deps') {
      return `var(--task-${cat})`;
    }
  }

  if (spec.table === 'cfg_nutrition_products') {
    const g = String(row.group ?? 'proteins');
    if (g === 'proteins') return 'var(--nutrition-proteins)';
    if (g === 'fats') return 'var(--nutrition-fats)';
    if (g === 'carbs') return 'var(--nutrition-carbs)';
  }
  if (spec.table === 'cfg_nutrition_presets') return 'var(--primary)';
  if (spec.table === 'cfg_diary_entry_presets') return 'var(--primary)';

  if (
    spec.table === 'cfg_income_categories' ||
    spec.table === 'cfg_expense_categories' ||
    spec.table === 'cfg_accounts' ||
    spec.table === 'cfg_leisure_tasks'
  ) {
    const restricted = normalizeRestrictedSectionColor(spec.sectionId, row.color);
    if (restricted) return restricted;
    const fromHex = parseHexColor(row.color);
    if (fromHex) return fromHex;
    if (row.color != null) {
      const paint = normalizeCssColorForPaint(String(row.color));
      if (paint) return paint;
    }
  }

  if (spec.table === 'cfg_income_categories') return 'var(--finance-income)';
  if (spec.table === 'cfg_expense_categories') return 'var(--finance-expense)';
  if (spec.table === 'cfg_accounts') return 'var(--finance-transfer)';
  if (spec.table === 'cfg_leisure_tasks') {
    const lt = String(row.leisure_type ?? '');
    if (lt === 'filling') return 'var(--leisure-filling)';
    if (lt === 'escape') return 'var(--leisure-escape)';
  }

  return 'var(--muted-foreground)';
}

function buildPayloadFromForm(
  spec: CfgSectionSpec,
  form: Record<string, string>,
  mode: 'create' | 'edit',
  editId?: string
): AuraRow {
  const out: AuraRow = {};
  if (mode === 'create') {
    Object.assign(out, spec.filter ?? {}, spec.createExtra ?? {});
  }
  if (mode === 'edit' && editId != null) out.id = editId;
  for (const f of spec.fields) {
    if (spec.sectionId === 'finance-expense' && f.key === 'type') {
      out[f.key] = form[f.key] === '1' ? 'compulsive' : '';
    } else {
      out[f.key] = coerceField(f, form[f.key]);
    }
  }
  return cleanupRow(spec.table, out);
}

type Props = { spec: CfgSectionSpec };

export function CfgSectionCard({ spec }: Props) {
  const { db } = useAuraDb();
  const setTabActions = useSettingsTabActions();
  const [rows, setRows] = useState<AuraRow[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const currentTaskType = String(form.task_type ?? '');
  const restrictedColorPresets = useMemo(() => sectionColorPresets(spec.sectionId), [spec.sectionId]);
  const baseVisibleFields = useMemo(
    () =>
      spec.fields.filter(
        (f) =>
          f.key !== 'level' &&
          !(spec.hideFormKeys ?? []).includes(f.key) &&
          !isTaskDependentFieldKey(spec, f.key)
      ),
    [spec.fields, spec.hideFormKeys, spec]
  );
  const conditionalVisibleFields = useMemo(
    () =>
      spec.fields.filter(
        (f) =>
          f.key !== 'level' &&
          !(spec.hideFormKeys ?? []).includes(f.key) &&
          isTaskDependentFieldKey(spec, f.key) &&
          isTaskConditionalFieldVisible(spec, f.key, currentTaskType)
      ),
    [spec.fields, spec.hideFormKeys, spec, currentTaskType]
  );
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [dialogSub, setDialogSub] = useState<DialogSub>('form');
  const [cfgIconField, setCfgIconField] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState(COLOR_PICKER_DEFAULT);
  /** Доп. поля типа задачи свёрнуты по умолчанию — меньше шума при открытии формы. */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [taskListItems, setTaskListItems] = useState<TaskListCfgItem[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryIconPickerOpen, setCategoryIconPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<TaskCategoryConfig>(TASK_CATEGORY_DEFAULTS.rituals);
  const [presetIngredients, setPresetIngredients] = useState<PresetIngredientDraft[]>([]);
  const [ambientMusicFolderPath, setAmbientMusicFolderPath] = useState<string | null>(null);
  const [ambientMusicFiles, setAmbientMusicFiles] = useState<string[]>([]);
  const [ambientMusicImporting, setAmbientMusicImporting] = useState(false);
  const taskCategoryKey = sectionTaskCategoryKey(spec.sectionId);
  const visibleHomeAccountsCount = useMemo(
    () =>
      spec.table === 'cfg_accounts'
        ? rows.filter((row) => Number(row.home_visible) !== 0).length
        : 0,
    [rows, spec.table]
  );

  const nutritionProducts = useMemo(
    () =>
      spec.table === 'cfg_nutrition_presets' && db
        ? db
            .getAll('cfg_nutrition_products')
            .filter((p) => p.id)
            .sort((a, b) => {
              const countDiff = (Number(b.usage_count) || 0) - (Number(a.usage_count) || 0);
              if (countDiff !== 0) return countDiff;
              return String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru');
            })
        : [],
    [db, spec.table, open]
  );

  const nutritionProductsById = useMemo(() => {
    const map: Record<string, AuraRow> = {};
    nutritionProducts.forEach((p) => {
      map[String(p.id)] = p;
    });
    return map;
  }, [nutritionProducts]);

  const reload = useCallback(() => {
    if (!db) {
      setRows([]);
      return;
    }
    let list = db.getAll(spec.table).filter((r) => spec.table === 'cfg_ambient_music' || r.id != null);
    list = list.filter((r) => matchesFilter(r, spec.filter));
    setRows(sortRows(list, spec.sortBy));
  }, [db, spec.filter, spec.sortBy, spec.table]);

  const canReorder = spec.sortBy === 'level' && spec.fields.some((f) => f.key === 'level');
  const hideRowReorder = spec.sectionId.startsWith('finance-') || spec.sectionId.startsWith('nutrition-');

  const refreshAmbientMusicFiles = useCallback(() => {
    if (spec.table !== 'cfg_ambient_music') return;
    const folderPath = resolveAmbientMusicFolderPath();
    setAmbientMusicFolderPath(folderPath);
    setAmbientMusicFiles(folderPath ? readAmbientMusicFileNames(folderPath) : []);
  }, [spec.table]);

  const importAmbientMusicFiles = useCallback(() => {
    if (!db || spec.table !== 'cfg_ambient_music') return;
    if (ambientMusicImporting) return;

    const folderPath = resolveAmbientMusicFolderPath();
    setAmbientMusicFolderPath(folderPath);
    if (!folderPath) {
      window.alert('Папка музыки не найдена.');
      return;
    }

    const files = readAmbientMusicFileNames(folderPath);
    setAmbientMusicFiles(files);
    if (files.length === 0) {
      window.alert('В папке музыки не найдено поддерживаемых файлов.');
      return;
    }

    const existing = new Set(
      db
        .getAll('cfg_ambient_music')
        .map((row) => ambientMusicImportKey(String(row.file_name ?? '')))
        .filter(Boolean)
    );
    const missing = files.filter((fileName) => !existing.has(ambientMusicImportKey(fileName)));
    if (missing.length === 0) {
      window.alert('Все файлы музыки уже добавлены.');
      return;
    }

    setAmbientMusicImporting(true);
    try {
      let added = 0;
      for (const fileName of missing) {
        const ok = db.create('cfg_ambient_music', {
          name: fileName,
          icon: AMBIENT_MUSIC_DEFAULT_ICON,
          file_name: fileName,
        });
        if (ok) added += 1;
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

  const moveRow = useCallback(
    (currentRows: AuraRow[], fromIndex: number, toIndex: number) => {
      if (!db) return;
      if (!canReorder) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentRows.length || toIndex >= currentRows.length) return;
      if (fromIndex === toIndex) return;

      const next = [...currentRows];
      const [picked] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, picked);

      try {
        next.forEach((row, idx) => {
          const id = String(row.id ?? '');
          if (!id) return;
          db.update(spec.table, id, { level: idx });
        });
        reload();
      } catch (e) {
        console.error('[CfgSectionCard] move', e);
        setListError(e instanceof Error ? e.message : 'Ошибка изменения порядка');
      }
    },
    [db, canReorder, spec.table, reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    refreshAmbientMusicFiles();
  }, [refreshAmbientMusicFiles]);

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
    if (!title) {
      setCategoryError('Введите название категории.');
      return;
    }
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    const id = String(cur.id ?? 'app_settings_1');
    let parsed: Record<string, unknown> = {};
    try {
      const p = cur.task_categories_config;
      const j = typeof p === 'string' ? JSON.parse(p) : p;
      if (j && typeof j === 'object') parsed = j as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    parsed[taskCategoryKey] = {
      ...(parsed[taskCategoryKey] && typeof parsed[taskCategoryKey] === 'object'
        ? (parsed[taskCategoryKey] as Record<string, unknown>)
        : {}),
      title,
      icon: categoryForm.icon.trim() || TASK_CATEGORY_DEFAULTS[taskCategoryKey].icon,
      color: categoryForm.color,
    };
    db.saveAppSettings({
      ...cur,
      id,
      task_categories_config: JSON.stringify(parsed),
    });
    window.dispatchEvent(new CustomEvent('task-categories-config-changed'));
    setCategoryOpen(false);
  }, [db, taskCategoryKey, categoryForm]);

  const openCreate = useCallback(() => {
    refreshAmbientMusicFiles();
    setDialogSub('form');
    setCfgIconField(null);
    setDialogError(null);
    const init: Record<string, string> = {};
    for (const f of spec.fields) {
      if (f.kind === 'checkbox') init[f.key] = '0';
      else if (f.kind === 'number') init[f.key] = String(f.min ?? 0);
      else init[f.key] = '';
    }
    for (const [k, v] of Object.entries(spec.createExtra ?? {})) {
      if (spec.fields.some((f) => f.key === k)) init[k] = String(v);
    }
    const maxLv = rows.reduce((m, r) => Math.max(m, Number(r.level) || 0), -1);
    if (spec.fields.some((f) => f.key === 'level')) {
      init.level = String(maxLv + 1);
    }
    if (spec.table === 'cfg_tasks') {
      const allowed = allowedTaskTypesForSection(spec.sectionId);
      init.task_type = allowed?.[0] ?? 'checkbox';
      if (spec.filter?.category_type === 'rituals') init.ritual_type = 'sunrise';
    }
    if (spec.table === 'cfg_leisure_tasks') {
      init.task_type = 'timer';
    }
    if (spec.fields.some((x) => x.key === 'type' && x.options?.some((o) => o.value === '__ordinary__'))) {
      init.type = '__ordinary__';
    }
    if (spec.table === 'cfg_rituals_morning' || spec.table === 'cfg_rituals_evening') {
      init.active = '1';
    }
    if (spec.table === 'cfg_nutrition_presets') {
      setPresetIngredients(parsePresetIngredientDrafts(init.products));
    } else {
      setPresetIngredients([]);
    }
    setForm(init);
    setTaskListItems(parseTaskListItems(init.config));
    setMode('create');
    setEditId(null);
    setAdvancedOpen(true);
    setOpen(true);
  }, [refreshAmbientMusicFiles, rows, spec]);

  useLayoutEffect(() => {
    setTabActions(
      <div className="flex items-center gap-2">
        {taskCategoryKey ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-8 px-2 text-xs font-normal"
            onClick={openCategoryEditor}
            disabled={!db}
          >
            <Palette className="mr-1 size-3.5" aria-hidden />
            Вид блока
          </Button>
        ) : null}
      </div>
    );
    return () => setTabActions(null);
  }, [setTabActions, db, taskCategoryKey, openCategoryEditor]);

  const openEdit = (row: AuraRow) => {
    refreshAmbientMusicFiles();
    setDialogSub('form');
    setCfgIconField(null);
    setDialogError(null);
    const id = String(row.id);
    const init: Record<string, string> = {};
    for (const f of spec.fields) {
      init[f.key] = formValueFromRow(f, row, spec.sectionId);
    }
    if (spec.table === 'cfg_nutrition_presets') {
      setPresetIngredients(parsePresetIngredientDrafts(init.products));
    } else {
      setPresetIngredients([]);
    }
    setForm(init);
    setTaskListItems(parseTaskListItems(init.config));
    setMode('edit');
    setEditId(id);
    setAdvancedOpen(true);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    if (spec.table !== 'cfg_tasks' && spec.table !== 'cfg_leisure_tasks') return;
    if (currentTaskType !== 'list') return;
    setForm((prev) => ({ ...prev, config: encodeTaskListItems(taskListItems) }));
  }, [taskListItems, currentTaskType, open, spec.table]);

  const save = () => {
    if (!db) return;
    setDialogError(null);
    try {
      if (spec.table === 'cfg_tasks') {
        const payload = buildPayloadFromForm(spec, form, mode, editId ?? undefined);
        if (String(payload.task_type ?? '') === 'nutrition') {
          const hasOtherNutrition = rows.some((row) => {
            if (mode === 'edit' && String(row.id) === editId) return false;
            return String(row.task_type ?? '') === 'nutrition';
          });
          if (hasOtherNutrition) {
            setDialogError('Тип "Питание" может быть только у одной задачи.');
            return;
          }
        }
        if (mode === 'create') {
          db.create(spec.table, payload);
        } else if (editId) {
          const { id: _id, ...rest } = payload;
          db.update(spec.table, editId, {
            ...rest,
            updated_at: new Date().toISOString(),
          });
        }
      } else if (mode === 'create') {
        const payload = buildPayloadFromForm(spec, form, 'create');
        db.create(spec.table, payload);
      } else if (editId) {
        const payload = buildPayloadFromForm(spec, form, 'edit', editId);
        const { id: _id, ...rest } = payload;
        db.update(spec.table, editId, {
          ...rest,
          updated_at: new Date().toISOString(),
        });
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
    const id = String(row.id);
    if (!window.confirm(`Удалить «${rowTitle(row, spec.rowTitleKeys)}»?`)) return;
    try {
      db.delete(spec.table, id);
      window.dispatchEvent(new Event('settings-saved'));
      reload();
    } catch (e) {
      console.error('[CfgSectionCard] delete', e);
      setListError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const dialogTitle = spec.title;

  const renderFieldControl = (f: CfgFieldDef) => {
    const fid = `cfg-${spec.sectionId}-${f.key}`;
    if (spec.table === 'cfg_nutrition_presets' && f.key === 'products') {
      const ingredientsCount = presetIngredients.length;
      return (
        <button
          id={fid}
          type="button"
          onClick={() => setDialogSub({ k: 'preset-products', field: f.key })}
          className="border-input bg-background hover:bg-muted/40 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-xs aura-tx-colors"
        >
          <span className="truncate">{ingredientsCount > 0 ? `Ингредиентов: ${ingredientsCount}` : 'Добавить ингредиенты'}</span>
          <span className="text-muted-foreground shrink-0 text-xs">Настроить</span>
        </button>
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
            'border-input bg-background w-full min-w-0 resize-y rounded-md border px-3 py-2 text-sm shadow-xs',
            tall ? 'text-left font-mono text-xs leading-relaxed' : 'text-center'
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
          onClick={() => setCfgIconField(f.key)}
          className={CFG_ICON_TRIGGER_CN}
        >
          <AuraThemedIcon name={name || null} className="size-4 shrink-0 opacity-80" />
          <span className="text-foreground/90 min-w-0 truncate text-sm">{name || '—'}</span>
        </button>
      );
    }
    if (f.kind === 'text') {
      if (spec.table === 'cfg_ambient_music' && f.key === 'file_name') {
        return (
          <Select
            value={form[f.key] || '__none__'}
            onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger
              id={fid}
              contentAlign="start"
              className="border-input bg-background h-9 w-full min-w-0 justify-center shadow-xs"
            >
              <SelectValue placeholder={ambientMusicFiles.length > 0 ? 'Выберите файл' : 'Файлы не найдены'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не выбрано</SelectItem>
              {ambientMusicFiles.map((fileName) => (
                <SelectItem key={fileName} value={fileName}>
                  {fileName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (f.suffix || f.suffixFromField || f.suffixHint) {
        const affix = cfgDisplayAffix(f, form);
        return (
          <CfgAffixValueField
            id={fid}
            inputKind="text"
            value={form[f.key] ?? ''}
            displayAffix={affix}
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
      const affix = cfgDisplayAffix(f, form);
      return (
        <CfgAffixValueField
          id={fid}
          inputKind="number"
          value={form[f.key] ?? ''}
          displayAffix={affix}
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
          onClick={() => {
            setColorDraft(pickerSeed);
            setDialogSub({ k: 'color', field: f.key });
          }}
          className="border-input focus-visible:ring-ring/70 h-9 w-full min-w-0 overflow-hidden rounded-md border shadow-xs aura-tx-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          style={{
            backgroundColor: paint ?? undefined,
            backgroundImage: paint ? undefined : emptyPattern,
            backgroundSize: paint ? undefined : '6px 6px',
          }}
          aria-label={f.label}
        />
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
            let nextForm: Record<string, string> | null = null;
            setForm((prev) => {
              const next = f.key === 'task_type' ? applyTaskTypeTransition(prev, spec, v) : { ...prev, [f.key]: v };
              nextForm = next;
              return next;
            });
            if (f.key === 'task_type' && v === 'list') {
              setTaskListItems(parseTaskListItems(nextForm?.['config']));
            }
          }}
        >
          <SelectTrigger
            id={fid}
            contentAlign="center"
            className="border-input bg-background h-9 w-full min-w-0 justify-center shadow-xs"
          >
            <SelectValue placeholder="Выберите" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value || 'empty'} value={o.value}>
                <span className="flex items-center justify-center gap-2 text-center">
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

  return (
    <>
      <div className="flex flex-col gap-5">
        {listError ? (
          <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm" role="alert">
            {listError}
          </p>
        ) : null}
        {!db ? (
          <LoadingShell />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Пока нет записей."
            hint="Создайте первую запись, и она сразу появится в списке."
            className="mx-auto w-full max-w-md"
            compact
          />
        ) : spec.sectionId === 'nutrition-products' ? (
          <div className="flex flex-col gap-5">
            {NUTRITION_PRODUCT_GROUPS.map((gKey) => {
              const inGroup = rows.filter((r) => String(r.group ?? 'proteins') === gKey);
              if (inGroup.length === 0) return null;
              return (
                <div key={gKey} className="flex flex-col gap-2">
                  <p className="text-muted-foreground px-0.5 text-xs font-semibold tracking-wide uppercase">
                    {NUTRITION_PRODUCT_GROUP_LABEL[gKey]}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {inGroup.map((r, idx) => {
                      const tint = rowListAccent(spec, r);
                      return (
                        <li key={String(r.id)}>
                          <ListItem
                            mode="edit-delete"
                            icon={NUTRITION_PRODUCT_GROUP_ICON[gKey]}
                            iconTint={tint}
                            title={rowTitle(r, spec.rowTitleKeys)}
                            description={rowMetaSummary(spec, r)}
                            actionsAlwaysVisible
                            showDisabledMoveButtons
                            onMoveUp={
                              !hideRowReorder && canReorder && idx > 0
                                ? () => {
                                    moveRow(inGroup, idx, idx - 1);
                                  }
                                : undefined
                            }
                            onMoveDown={
                              !hideRowReorder && canReorder && idx < inGroup.length - 1
                                ? () => {
                                    moveRow(inGroup, idx, idx + 1);
                                  }
                                : undefined
                            }
                            onEdit={() => openEdit(r)}
                            onDelete={() => remove(r)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {(() => {
              const known = new Set<string>(NUTRITION_PRODUCT_GROUPS);
              const other = rows.filter((r) => !known.has(String(r.group ?? '')));
              if (other.length === 0) return null;
              return (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground px-0.5 text-xs font-semibold tracking-wide uppercase">
                    Другое
                  </p>
                  <ul className="flex flex-col gap-2">
                    {other.map((r, idx) => {
                      const tint = rowListAccent(spec, r);
                      const g = String(r.group ?? 'proteins');
                      const iconName =
                        g === 'proteins' || g === 'fats' || g === 'carbs'
                          ? NUTRITION_PRODUCT_GROUP_ICON[g]
                          : 'apple';
                      return (
                        <li key={String(r.id)}>
                          <ListItem
                            mode="edit-delete"
                            icon={iconName}
                            iconTint={tint}
                            title={rowTitle(r, spec.rowTitleKeys)}
                            description={rowMetaSummary(spec, r)}
                            actionsAlwaysVisible
                            showDisabledMoveButtons
                            onMoveUp={
                              !hideRowReorder && canReorder && idx > 0
                                ? () => {
                                    moveRow(other, idx, idx - 1);
                                  }
                                : undefined
                            }
                            onMoveDown={
                              !hideRowReorder && canReorder && idx < other.length - 1
                                ? () => {
                                    moveRow(other, idx, idx + 1);
                                  }
                                : undefined
                            }
                            onEdit={() => openEdit(r)}
                            onDelete={() => remove(r)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r, idx) => {
              const tint = rowListAccent(spec, r);
              return (
                <li key={String(r.id)}>
                  <ListItem
                    mode="edit-delete"
                    icon={typeof r.icon === 'string' ? r.icon : null}
                    iconTint={tint}
                    title={
                      spec.table === 'cfg_expense_categories' && String(r.type ?? '') === 'compulsive' ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{rowTitle(r, spec.rowTitleKeys)}</span>
                          <span
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-xs leading-none text-amber-700 dark:text-amber-200"
                            title="Импульсивная категория"
                          >
                            <AlertTriangle className="size-3" aria-hidden />
                          </span>
                        </span>
                      ) : (
                        rowTitle(r, spec.rowTitleKeys)
                      )
                    }
                    description={rowMetaSummary(spec, r)}
                    actionsAlwaysVisible
                    showDisabledMoveButtons
                    onMoveUp={
                      !hideRowReorder && canReorder && idx > 0
                        ? () => {
                            moveRow(rows, idx, idx - 1);
                          }
                        : undefined
                    }
                    onMoveDown={
                      !hideRowReorder && canReorder && idx < rows.length - 1
                        ? () => {
                            moveRow(rows, idx, idx + 1);
                          }
                        : undefined
                    }
                    onEdit={() => openEdit(r)}
                    onDelete={() => remove(r)}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <AddListButton onClick={openCreate} disabled={!db} />
          {spec.table === 'cfg_ambient_music' ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => void importAmbientMusicFiles()}
              disabled={!db || ambientMusicImporting}
            >
              <Music2 className="size-4" />
              Загрузить музыку из папки
            </Button>
          ) : null}
          {spec.table === 'cfg_ambient_music' ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={async () => {
                const folderPath = resolveAmbientMusicFolderPath();
                setAmbientMusicFolderPath(folderPath);
                if (!folderPath) return;
                refreshAmbientMusicFiles();
                const req = getNodeRequire();
                const electron = req ? (req('electron') as { shell?: { openPath: (path: string) => Promise<string> } }) : null;
                if (!electron?.shell) return;
                await electron.shell.openPath(folderPath);
              }}
              disabled={!db}
            >
              <FolderOpen className="size-4" />
              Открыть папку с музыкой
            </Button>
          ) : null}
        </div>
        {spec.table === 'cfg_ambient_music' && ambientMusicFolderPath ? (
          <p className="text-muted-foreground text-xs">Папка музыки: {ambientMusicFolderPath}</p>
        ) : null}
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setDialogError(null);
            setDialogSub('form');
            setCfgIconField(null);
          }
        }}
      >
        <UniversalModalContent
          size="md"
          showCloseButton={false}
          className={cn(
            'origin-center data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-aura-slow data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-aura-base'
          )}
        >
          <SettingsDialogLayout
            header={
              dialogSub === 'form' ? (
                <SettingsDialogHeader icon={Pencil} title={dialogTitle} showCloseButton />
              ) : dialogSub.k === 'preset-products' ? (
                <SettingsDialogHeader icon={ListPlus} title="Состав блюда" showCloseButton={false} />
              ) : (
                <SettingsDialogHeader icon={Palette} title="Палитра" showCloseButton={false} />
              )
            }
            footer={
              dialogSub === 'form' ? (
                <ActModalFooter cancelLabel="Отмена" submitLabel="Сохранить" onCancel={() => setOpen(false)} onSubmit={save} submitDisabled={!db} />
              ) : dialogSub.k === 'preset-products' ? (
                <ActModalFooter
                  cancelLabel="Назад"
                  submitLabel="Применить состав"
                  onCancel={() => setDialogSub('form')}
                  onSubmit={() => {
                    const nextProducts = encodePresetIngredientDrafts(presetIngredients, nutritionProductsById);
                    setForm((prev) => ({ ...prev, [dialogSub.field]: nextProducts }));
                    setDialogSub('form');
                  }}
                />
              ) : (
                <ActModalFooter
                  cancelLabel="Назад"
                  submitLabel="Применить цвет"
                  onCancel={() => setDialogSub('form')}
                  onSubmit={() => {
                    const picked = (normalizeCssColorForPaint(colorDraft) ?? colorDraft.trim()) || COLOR_PICKER_DEFAULT;
                    setForm((prev) => ({ ...prev, [dialogSub.field]: picked }));
                    setDialogSub('form');
                  }}
                />
              )
            }
          >
            {dialogSub === 'form' ? (
              <div className="flex flex-col gap-3">
                {dialogError ? (
                  <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm" role="alert">
                    {dialogError}
                  </p>
                ) : null}
                <div className="overflow-hidden rounded-lg border border-border">
                  {baseVisibleFields.map((f) => {
                    const fid = `cfg-${spec.sectionId}-${f.key}`;
                    if (f.kind === 'checkbox') {
                      const isHomeVisible = spec.table === 'cfg_accounts' && f.key === 'home_visible';
                      const checked = form[f.key] === '1';
                      const currentRowVisible = mode === 'edit' && editId ? (String(rows.find((r) => String(r.id) === editId)?.home_visible ?? '1') !== '0') : false;
                      const maxedOut = isHomeVisible && !checked && visibleHomeAccountsCount >= 2 && !currentRowVisible;
                      return (
                        <CfgModalGridRow key={f.key} label={f.label} htmlFor={fid}>
                          <div className="border-input bg-background flex min-h-9 w-full items-center justify-center rounded-md border px-3 shadow-xs">
                            <Switch
                              id={fid}
                              checked={checked}
                              disabled={maxedOut}
                              onCheckedChange={(checked) =>
                                setForm((prev) => ({ ...prev, [f.key]: checked ? '1' : '0' }))
                              }
                            />
                            <div className="ml-2 min-w-0 flex-1">
                              {spec.sectionId === 'finance-expense' && f.key === 'type' ? (
                                <span className="text-foreground text-xs font-medium">
                                  {checked ? 'Да' : 'Нет'}
                                </span>
                              ) : null}
                              {isHomeVisible ? (
                                <p className="text-muted-foreground text-[11px] leading-snug">
                                  {maxedOut
                                    ? 'Максимум 3 счета уже выбрано для главной.'
                                    : checked
                                      ? `Показывается на главной. После выключения останется ${Math.max(0, visibleHomeAccountsCount - 1)}.`
                                      : `Сейчас видно ${visibleHomeAccountsCount} из 3.`}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </CfgModalGridRow>
                      );
                    }
                    return (
                      <CfgModalGridRow key={f.key} label={f.label} htmlFor={fid}>
                        {renderFieldControl(f)}
                      </CfgModalGridRow>
                    );
                  })}
                  {conditionalVisibleFields.length > 0 ? (
                    <div className="border-t border-border/70 bg-muted/10 p-2">
                      <button
                        type="button"
                        className="border-input bg-background hover:bg-muted/40 flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-xs font-medium aura-tx-colors"
                        onClick={() => setAdvancedOpen((v) => !v)}
                      >
                        <span>Параметры типа: {taskTypeLabel(spec, currentTaskType)}</span>
                        <span className="text-muted-foreground">{advancedOpen ? 'Свернуть' : 'Развернуть'}</span>
                      </button>
                      {advancedOpen ? (
                        <div className="mt-2 overflow-hidden rounded-md border border-border/70">
                          {conditionalVisibleFields.map((f) => {
                            const fid = `cfg-${spec.sectionId}-${f.key}`;
                            if (f.kind === 'checkbox') {
                              const isHomeVisible = spec.table === 'cfg_accounts' && f.key === 'home_visible';
                              const checked = form[f.key] === '1';
                              const currentRowVisible = mode === 'edit' && editId ? (String(rows.find((r) => String(r.id) === editId)?.home_visible ?? '1') !== '0') : false;
                              const maxedOut = isHomeVisible && !checked && visibleHomeAccountsCount >= 2 && !currentRowVisible;
                              return (
                                <CfgModalGridRow key={f.key} label={f.label} htmlFor={fid}>
                                  <div className="border-input bg-background flex min-h-9 w-full items-center justify-center rounded-md border px-3 shadow-xs">
                                    <Switch
                                      id={fid}
                                      checked={checked}
                                      disabled={maxedOut}
                                      onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, [f.key]: checked ? '1' : '0' }))
                                      }
                                    />
                                    <div className="ml-2 min-w-0 flex-1">
                                      {spec.sectionId === 'finance-expense' && f.key === 'type' ? (
                                        <span className="text-foreground text-xs font-medium">
                                          {checked ? 'Да' : 'Нет'}
                                        </span>
                                      ) : null}
                                      {isHomeVisible ? (
                                        <p className="text-muted-foreground text-[11px] leading-snug">
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
                            }
                            return (
                              <CfgModalGridRow key={f.key} label={f.label} htmlFor={fid}>
                                {renderFieldControl(f)}
                              </CfgModalGridRow>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {(spec.table === 'cfg_tasks' || spec.table === 'cfg_leisure_tasks') && currentTaskType === 'list' ? (
                    <div className="border-t border-border/70 bg-muted/10 p-2">
                      <div className="border-input bg-background overflow-hidden rounded-md border p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">Элементы списка</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              setTaskListItems((prev) => [...prev, { title: `Пункт ${prev.length + 1}`, percent: 0 }])
                            }
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
                                  onChange={(e) =>
                                    setTaskListItems((prev) =>
                                      prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                                    )
                                  }
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
                                          ? {
                                              ...x,
                                              percent: Math.max(
                                                0,
                                                Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)
                                              ),
                                            }
                                          : x
                                      )
                                    )
                                  }
                                  className="h-8 text-center text-xs tabular-nums"
                                  aria-label="Процент выполнения"
                                />
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      setTaskListItems((prev) => {
                                        if (idx === 0) return prev;
                                        const next = [...prev];
                                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                        return next;
                                      })
                                    }
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={idx === taskListItems.length - 1}
                                    onClick={() =>
                                      setTaskListItems((prev) => {
                                        if (idx >= prev.length - 1) return prev;
                                        const next = [...prev];
                                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                        return next;
                                      })
                                    }
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-destructive h-7 w-7"
                                    onClick={() => setTaskListItems((prev) => prev.filter((_, i) => i !== idx))}
                                  >
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
              <div className="flex flex-col gap-3">
                <div className="border-input bg-muted/20 flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-muted-foreground text-xs">Добавьте продукты и укажите порции или граммовку.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      const firstProductId = nutritionProducts[0]?.id != null ? String(nutritionProducts[0].id) : '';
                      setPresetIngredients((prev) => [...prev, { product_id: firstProductId, amount: '1', unit: 'portions' }]);
                    }}
                    disabled={nutritionProducts.length === 0}
                  >
                    Добавить продукт
                  </Button>
                </div>
                {nutritionProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Сначала добавьте продукты в разделе «Продукты».</p>
                ) : presetIngredients.length === 0 ? (
                  <EmptyState
                    title="Пока нет ингредиентов в составе блюда."
                    hint="Добавьте продукты в состав, чтобы считать КБЖУ автоматически."
                    compact
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {presetIngredients.map((it, idx) => {
                      const selectedProduct = nutritionProductsById[it.product_id];
                      const amountNum = Number.parseFloat(String(it.amount).replace(',', '.'));
                      const portionWeight = Number(selectedProduct?.portion_weight) || 0;
                      const previewPortions =
                        Number.isFinite(amountNum) && amountNum > 0
                          ? it.unit === 'grams'
                            ? portionWeight > 0
                              ? amountNum / portionWeight
                              : 0
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
                          <Select
                            value={it.product_id || '__none__'}
                            onValueChange={(v) =>
                              setPresetIngredients((prev) =>
                                prev.map((x, i) => {
                                  if (i !== idx) return x;
                                  const nextProductId = v === '__none__' ? '' : v;
                                  const next = { ...x, product_id: nextProductId };
                                  if (next.unit === 'grams') {
                                    const p = nutritionProductsById[nextProductId];
                                    const current = Number.parseFloat(String(next.amount).replace(',', '.'));
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
                          <ActAffixValueField
                            id={`preset-ingredient-amount-${idx}`}
                            ariaLabel="Количество"
                            value={it.amount}
                            onCommit={(next) =>
                              setPresetIngredients((prev) =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, amount: next } : x
                                )
                              )
                            }
                            placeholder={it.unit === 'grams' ? '0' : '0'}
                            inputKind="number"
                            suffix={it.unit === 'grams' ? 'г' : 'порц'}
                          />
                          <Select
                            value={it.unit}
                            onValueChange={(v) =>
                              setPresetIngredients((prev) =>
                                prev.map((x, i) => {
                                  if (i !== idx) return x;
                                  const nextUnit = v as 'portions' | 'grams';
                                  if (nextUnit === x.unit) return x;
                                  const next = { ...x, unit: nextUnit };
                                  const p = nutritionProductsById[next.product_id];
                                  const portionWeight = Number(p?.portion_weight) || 0;
                                  const current = Number.parseFloat(String(next.amount).replace(',', '.'));
                                  if (portionWeight > 0 && Number.isFinite(current) && current > 0) {
                                    next.amount =
                                      nextUnit === 'grams'
                                        ? String(Math.max(1, current * portionWeight))
                                        : String(Math.max(0.1, current / portionWeight));
                                  } else if (nextUnit === 'grams') {
                                    next.amount = String(Math.max(1, portionWeight || 100));
                                  } else {
                                    next.amount = String(Math.max(0.1, Number.isFinite(current) ? current : 1));
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 justify-self-end"
                            onClick={() =>
                              setPresetIngredients((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                return next.length > 0 ? next : [{ product_id: '', amount: '1', unit: 'portions' }];
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          <div className="text-muted-foreground col-span-full text-xs">
                            {rowNutrition ? (
                              <span>
                                ~{Math.round(rowNutrition.weight)}г · {Math.round(rowNutrition.calories)} ккал · Б{' '}
                                {rowNutrition.proteins.toFixed(1)} · Ж {rowNutrition.fats.toFixed(1)} · У{' '}
                                {rowNutrition.carbs.toFixed(1)}
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
            ) : (
              <ColorPickerPanel
                value={colorDraft}
                onChange={setColorDraft}
                presets={restrictedColorPresets ?? undefined}
                onPresetPick={(picked) => {
                  const next = normalizeCssColorForPaint(picked) ?? picked;
                  setForm((prev) => ({ ...prev, [dialogSub.field]: next }));
                  setDialogSub('form');
                }}
              />
            )}
          </SettingsDialogLayout>
        </UniversalModalContent>
      </Dialog>
      <Dialog open={cfgIconField != null} onOpenChange={(next) => !next && setCfgIconField(null)}>
        <UniversalModalContent size="picker" scroll="content" className="flex max-h-[min(92svh,48rem)] flex-col gap-0 p-0" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
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
      <Dialog
        open={categoryOpen}
        onOpenChange={(next) => {
          setCategoryOpen(next);
          if (!next) {
            setCategoryError(null);
            setCategoryIconPickerOpen(false);
          }
        }}
      >
        <UniversalModalContent size="md" className="flex flex-col gap-0 p-0" showCloseButton={false}>
          <SettingsDialogLayout
            header={<SettingsDialogHeader icon={Settings} title="Внешний вид на главной" showCloseButton />}
            footer={
              <ActModalFooter
                cancelLabel="Отмена"
                submitLabel="Сохранить"
                onCancel={() => setCategoryOpen(false)}
                onSubmit={saveCategoryEditor}
                submitDisabled={!db || !taskCategoryKey}
              />
            }
          >
            <div className="flex flex-col gap-3">
              {categoryError ? (
                <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm">{categoryError}</p>
              ) : null}
              <div className="overflow-hidden rounded-lg border border-border">
                <CfgModalGridRow label="Название">
                  <Input
                    value={categoryForm.title}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, title: e.target.value }))}
                    className={CFG_INPUT_CN}
                  />
                </CfgModalGridRow>
                <CfgModalGridRow label="Иконка">
                  <button type="button" className={CFG_ICON_TRIGGER_CN} onClick={() => setCategoryIconPickerOpen(true)}>
                    <AuraThemedIcon name={categoryForm.icon || null} className="size-4 shrink-0 opacity-80" />
                    <span className="text-foreground/90 truncate text-sm">{categoryForm.icon || 'Выбрать иконку'}</span>
                  </button>
                </CfgModalGridRow>
                <CfgModalGridRow label="Цвет">
                  <div className="grid w-full grid-cols-5 gap-1.5 sm:grid-cols-6">
                    {TASK_CATEGORY_PALETTE.map((c, idx) => (
                      <button
                        key={c}
                        type="button"
                        title={`Цвет ${idx + 1}`}
                        onClick={() => setCategoryForm((prev) => ({ ...prev, color: c }))}
                        className={cn(
                          'h-8 rounded-md border aura-tx-transform hover:scale-[1.02]',
                          categoryForm.color === c ? 'border-primary ring-primary/25 ring-2' : 'border-border/70'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </CfgModalGridRow>
              </div>
            </div>
          </SettingsDialogLayout>
        </UniversalModalContent>
      </Dialog>
      <Dialog open={categoryIconPickerOpen} onOpenChange={setCategoryIconPickerOpen}>
        <UniversalModalContent size="picker" scroll="content" className="flex max-h-[min(92svh,48rem)] flex-col gap-0 p-0" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" size="sm" variant="ghost" className="px-2 text-xs" onClick={() => setCategoryIconPickerOpen(false)}>
                ← Назад
              </Button>
              <DialogTitle className="text-sm">
                <span className="inline-flex items-center justify-center gap-2">
                  <Settings className="size-4" />
                  <span>Иконка категории</span>
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
            <IconPickerPanel
              current={categoryForm.icon || undefined}
              onPick={(name) => {
                setCategoryForm((prev) => ({ ...prev, icon: name }));
                setCategoryIconPickerOpen(false);
              }}
            />
          </div>
        </UniversalModalContent>
      </Dialog>
    </>
  );
}
