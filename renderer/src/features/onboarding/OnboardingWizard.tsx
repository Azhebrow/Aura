import { useState, useEffect, useCallback } from 'react';
import {
  Apple,
  Award,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  FolderOpen,
  Music2,
  LayoutDashboard,
  Moon,
  Settings2,
  Smile,
  Sparkle,
  Sun,
  SunDim,
  Target,
  Trophy,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  APP_SCALE_STORAGE_FIELD,
  DEFAULT_APP_SCALE,
  applyAppearanceScales,
  normalizeScale,
  readAppearanceScaleSettings,
} from '@/features/theme/appearance-scale';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import {
  AURA_FONT_CHOICES,
  AURA_FONT_STANDARD,
  isAuraFontFamily,
  type AuraFontFamily,
} from '@/features/theme/font-constants';
import { rankImageSrc } from '@/shared/config/ranks-model';
import {
  enforceVisibilityInvariants,
  parsePageSectionsVisibility,
  type PageSectionsVisibility,
} from '@/shared/lib/page-sections-visibility';
import type { AuraDatabase } from '@/types/aura';

// ─── Accent presets ─────────────────────────────────────────────────────────
const ACCENT_PRESETS: Array<{ value: AuraAccentPreset; label: string; hsl: string }> = [
  { value: 'mono',    label: 'Моно',     hsl: '215 14% 48%' },
  { value: 'slate',   label: 'Сланец',   hsl: '215 25% 50%' },
  { value: 'violet',  label: 'Фиолет',   hsl: '263 60% 58%' },
  { value: 'indigo',  label: 'Индиго',   hsl: '238 60% 60%' },
  { value: 'blue',    label: 'Синий',    hsl: '214 70% 56%' },
  { value: 'cobalt',  label: 'Кобальт',  hsl: '220 80% 52%' },
  { value: 'cyan',    label: 'Циан',     hsl: '188 64% 48%' },
  { value: 'teal',    label: 'Бирюза',   hsl: '174 60% 40%' },
  { value: 'emerald', label: 'Изумруд',  hsl: '152 58% 44%' },
  { value: 'lime',    label: 'Лайм',     hsl: '84 52% 44%'  },
  { value: 'amber',   label: 'Янтарь',   hsl: '45 84% 50%'  },
  { value: 'orange',  label: 'Апельсин', hsl: '24 72% 52%'  },
  { value: 'rose',    label: 'Красный',  hsl: '354 68% 54%' },
  { value: 'pink',    label: 'Розовый',  hsl: '330 54% 56%' },
];

// ─── Section definitions ─────────────────────────────────────────────────────
type SectionDef = {
  page: keyof PageSectionsVisibility;
  key: string;
  label: string;
  desc: string;
  example: string;
};

const SECTION_DEFS: SectionDef[] = [
  { page: 'home', key: 'tasksCategories',     label: 'Категории задач',  desc: '4 карточки с % дня', example: 'Рутина 80%, Фокус 45%, Тонус 60%' },
  { page: 'home', key: 'transactions',        label: 'Транзакции',       desc: 'Список денег за день', example: '−450 кофе, +5000 доход' },
  { page: 'home', key: 'dailyPlans',          label: 'Планы дня',        desc: 'Утренний/вечерний текст', example: 'Утром: 3 главные задачи' },
  { page: 'home', key: 'categoryProgressChart', label: 'График прогресса', desc: 'Мини-график активности', example: 'Неделя по категориям' },
  { page: 'rituals', key: 'rituals',          label: 'Ритуалы',          desc: 'Чек-лист утра/вечера', example: 'Вода, зарядка, чтение' },
  { page: 'rituals', key: 'vows',             label: 'Обеты',            desc: 'Длинные обещания', example: '30 дней без сахара' },
  { page: 'rituals', key: 'goals',            label: 'Цели',             desc: 'Проекты со стадиями', example: 'Курс → модуль → задача' },
  { page: 'diary',   key: 'entryPanel',       label: 'Запись дневника',  desc: 'Текст + настроение', example: 'Что понял сегодня?' },
  { page: 'diary',   key: 'contentNutrition', label: 'Питание',          desc: 'КБЖУ за день', example: '1820 ккал, белки 120г' },
  { page: 'ranks',   key: 'rank',             label: 'Ранг',             desc: 'Текущий уровень', example: 'Воин, 4800 очков' },
  { page: 'ranks',   key: 'pointsHistory',    label: 'История очков',    desc: 'Таблица результатов', example: '+72 сегодня, −15 вчера' },
];

const PAGE_LABELS: Record<keyof PageSectionsVisibility, string> = {
  home: 'Главная',
  rituals: 'Ритуалы',
  diary: 'Дневник',
  ranks: 'Очки',
};

const PAGE_HINTS: Record<keyof PageSectionsVisibility, { title: string; desc: string }> = {
  home: {
    title: 'Центр дня',
    desc: 'Быстрый обзор задач, планов, денег и прогресса.',
  },
  rituals: {
    title: 'Стабильность',
    desc: 'Утро, вечер, обеты и цели держат систему в ритме.',
  },
  diary: {
    title: 'Память и питание',
    desc: 'Записи, настроение и КБЖУ собираются в дневник.',
  },
  ranks: {
    title: 'Игра в долгую',
    desc: 'Очки дня превращаются в прогресс ранга.',
  },
};

type PresetGroupKey = 'tasks' | 'rituals' | 'finance' | 'diary' | 'nutrition' | 'ambient';

const PRESET_GROUPS: Array<{
  key: PresetGroupKey;
  title: string;
  desc: string;
  icon: typeof Sun;
  tables: string[];
}> = [
  {
    key: 'tasks',
    title: 'Задачи',
    desc: 'Категории дня, фокус, тонус, детокс и стартовые пункты.',
    icon: Check,
    tables: ['cfg_task_categories', 'cfg_tasks'],
  },
  {
    key: 'rituals',
    title: 'Ритуалы и цели',
    desc: 'Утро, вечер, обеты, цели, стадии и подзадачи.',
    icon: Sun,
    tables: ['cfg_rituals_morning', 'cfg_rituals_evening', 'cfg_vows', 'cfg_goals', 'cfg_goal_stages', 'cfg_goal_tasks'],
  },
  {
    key: 'finance',
    title: 'Финансы',
    desc: 'Счета, доходы и категории расходов.',
    icon: Wallet,
    tables: ['cfg_accounts', 'cfg_income_categories', 'cfg_expense_categories'],
  },
  {
    key: 'diary',
    title: 'Дневник',
    desc: 'Категории записей, настроения и быстрые шаблоны.',
    icon: BookOpen,
    tables: ['cfg_diary_categories', 'cfg_diary_moods', 'cfg_diary_entry_presets'],
  },
  {
    key: 'nutrition',
    title: 'Питание',
    desc: 'Продукты, пресеты блюд и дневные нормы КБЖУ.',
    icon: Apple,
    tables: ['cfg_nutrition_products', 'cfg_nutrition_presets'],
  },
  {
    key: 'ambient',
    title: 'Музыка',
    desc: 'Фоновые треки для фокуса, секундомера и перерывов.',
    icon: Music2,
    tables: ['cfg_ambient_music'],
  },
];

const DEFAULT_PRESET_CHOICES: Record<PresetGroupKey, boolean> = {
  tasks: true,
  rituals: true,
  finance: true,
  diary: true,
  nutrition: true,
  ambient: true,
};


const AMBIENT_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);

function getNodeRequire() {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function') {
    return (globalThis as { require: (id: string) => unknown }).require;
  }
  if (typeof require === 'function') return require;
  return null;
}

function resolveAmbientFolderPath(): string | null {
  const req = getNodeRequire();
  if (!req) return null;
  try {
    const fs = req('fs') as { existsSync: (path: string) => boolean; mkdirSync: (path: string, opts?: { recursive?: boolean }) => void };
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

function readAmbientFiles(folderPath: string): string[] {
  const req = getNodeRequire();
  if (!req) return [];
  try {
    const fs = req('fs') as { readdirSync: (path: string, opts?: { withFileTypes?: boolean }) => Array<{ isFile: () => boolean; name: string }> };
    const path = req('path') as { extname: (path: string) => string };
    return fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => AMBIENT_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  } catch {
    return [];
  }
}

function ambientKey(fileName: string) {
  return fileName.trim().toLowerCase();
}

function applyPresetChoices(db: AuraDatabase, presets: Record<PresetGroupKey, boolean>) {
  for (const group of PRESET_GROUPS) {
    if (presets[group.key]) continue;
    for (const table of group.tables) {
      const rows = db.getAll?.(table) ?? [];
      for (const row of rows) {
        if (row.id != null) db.delete(table, String(row.id));
      }
    }
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────
type Props = {
  db: AuraDatabase | null;
  onComplete: () => void;
};

// ─── Wizard state ─────────────────────────────────────────────────────────────
type WizardState = {
  accent: AuraAccentPreset;
  themeMode: AuraThemeMode;
  fontFamily: AuraFontFamily;
  appScale: string;
  textScale: string;
  sections: PageSectionsVisibility;
  presets: Record<PresetGroupKey, boolean>;
  calories: string;
  proteins: string;
  fats: string;
  carbs: string;
};

const TOTAL_STEPS = 6;

export function OnboardingWizard({ db, onComplete }: Props) {
  const { accentPreset, setAccentPreset, theme, setTheme, fontFamily, setFontFamily } = useAuraTheme();

  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [visible, setVisible] = useState(false);
  const [ambientFolder, setAmbientFolder] = useState<string | null>(null);
  const [ambientFiles, setAmbientFiles] = useState<string[]>([]);
  const [ambientImportDone, setAmbientImportDone] = useState(false);

  // Load initial settings from db/theme context
  const [state, setState] = useState<WizardState>(() => {
    const settings = db?.getAppSettings() as Record<string, unknown> | null;
    const sections = parsePageSectionsVisibility(settings?.page_sections_visibility);
    const scales = readAppearanceScaleSettings(settings);
    return {
      accent: accentPreset,
      themeMode: theme,
      fontFamily,
      appScale: scales.appScale,
      textScale: scales.textScale,
      sections,
      presets: DEFAULT_PRESET_CHOICES,
      calories: String(settings?.nutrition_target_calories ?? '2000'),
      proteins: String(settings?.nutrition_target_proteins ?? '150'),
      fats:     String(settings?.nutrition_target_fats ?? '70'),
      carbs:    String(settings?.nutrition_target_carbs ?? '220'),
    };
  });

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const refreshAmbient = useCallback(() => {
    const folder = resolveAmbientFolderPath();
    setAmbientFolder(folder);
    setAmbientFiles(folder ? readAmbientFiles(folder) : []);
  }, []);

  useEffect(() => {
    refreshAmbient();
  }, [refreshAmbient]);

  const goTo = useCallback((nextStep: number, dir: 'forward' | 'back') => {
    setAnimDir(dir);
    setStep(nextStep);
  }, []);

  const next = () => goTo(Math.min(step + 1, TOTAL_STEPS - 1), 'forward');
  const back = () => goTo(Math.max(step - 1, 0), 'back');

  const patchState = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  const handleAccent = (preset: AuraAccentPreset) => {
    setAccentPreset(preset);
    patchState({ accent: preset });
  };

  const handleTheme = (mode: AuraThemeMode) => {
    setTheme(mode);
    patchState({ themeMode: mode });
  };

  const handleFontFamily = (font: AuraFontFamily) => {
    setFontFamily(font);
    patchState({ fontFamily: font });
  };

  const handleAppScale = (value: string) => {
    const appScale = normalizeScale(value, DEFAULT_APP_SCALE);
    applyAppearanceScales(appScale, state.textScale);
    patchState({ appScale });
  };

  const toggleSection = (page: keyof PageSectionsVisibility, key: string) => {
    const next = {
      ...state.sections,
      [page]: {
        ...(state.sections[page] as Record<string, boolean>),
        [key]: !(state.sections[page] as Record<string, boolean>)[key],
      },
    };
    patchState({
      sections: enforceVisibilityInvariants(next as PageSectionsVisibility),
    });
  };

  const togglePreset = (key: PresetGroupKey) => {
    patchState({
      presets: {
        ...state.presets,
        [key]: !state.presets[key],
      },
    });
  };

  const handleComplete = () => {
    if (!db) { onComplete(); return; }
    if (state.presets.ambient && ambientMissing.length > 0) importAmbient();
    applyPresetChoices(db, state.presets);
    const existing = (db.getAppSettings() ?? {}) as Record<string, unknown>;
    db.saveAppSettings({
      ...existing,
      accent_preset: state.accent,
      theme_mode: state.themeMode,
      [APP_SCALE_STORAGE_FIELD]: Number(state.appScale) || 1,
      page_sections_visibility: JSON.stringify(state.sections),
      nutrition_target_calories: Number(state.calories) || 2000,
      nutrition_target_proteins: Number(state.proteins) || 150,
      nutrition_target_fats:     Number(state.fats) || 70,
      nutrition_target_carbs:    Number(state.carbs) || 220,
      onboarding_complete: true,
    });
    window.dispatchEvent(new Event('settings-saved'));
    onComplete();
  };

  const ambientExisting = new Set(
    db
      ?.getAll?.('cfg_ambient_music')
      ?.map((row) => ambientKey(String(row.file_name ?? '')))
      ?.filter(Boolean) ?? []
  );
  const ambientMissing = ambientFiles.filter((fileName) => !ambientExisting.has(ambientKey(fileName)));

  const importAmbient = () => {
    if (!db || ambientMissing.length === 0) return;
    for (const fileName of ambientMissing) {
      db.create('cfg_ambient_music', {
        name: fileName,
        icon: 'music-2',
        file_name: fileName,
      });
    }
    setAmbientImportDone(true);
    window.dispatchEvent(new Event('settings-saved'));
    refreshAmbient();
  };

  const stepContent = [
    <StepWelcome key="welcome" onNext={next} />,
    <StepAppearance
      key="appearance"
      state={state}
      onAccent={handleAccent}
      onTheme={handleTheme}
      onFontFamily={handleFontFamily}
      onAppScale={handleAppScale}
    />,
    <StepSections key="sections" sections={state.sections} onToggle={toggleSection} />,
    <StepGoals
      key="goals"
      state={state}
      onChange={patchState}
      ambientFolder={ambientFolder}
      ambientFound={ambientFiles.length}
      ambientConnected={ambientFiles.length - ambientMissing.length}
      ambientMissing={ambientMissing.length}
      ambientImportDone={ambientImportDone}
      onImportAmbient={importAmbient}
    />,
    <StepPresetReview
      key="presets"
      presets={state.presets}
      onToggle={togglePreset}
      ambientFound={ambientFiles.length}
      ambientMissing={ambientMissing.length}
    />,
    <StepDone key="done" state={state} onComplete={handleComplete} />,
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-background/85 p-4 aura-tx-colors backdrop-blur-sm sm:p-6',
        'transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        className="relative z-10 flex h-auto max-h-[86svh] min-h-[32rem] w-full max-w-[45rem] flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-2xl shadow-black/16"
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-border/80" />

        {/* Step progress bar */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="relative z-10 flex items-center justify-center gap-2 px-6 pt-5">
            {Array.from({ length: TOTAL_STEPS - 2 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-[3px] flex-1 max-w-[4rem] rounded-full transition-all duration-500',
                  i < step - 1
                    ? 'bg-primary'
                    : i === step - 1
                    ? 'bg-primary/70'
                    : 'bg-border'
                )}
              />
            ))}
          </div>
        )}

        {/* Step content */}
        <div
          key={step}
          className={cn(
            'relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden',
            'animate-in fade-in duration-300',
            animDir === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
          )}
        >
          {stepContent[step]}
        </div>

        {/* Navigation footer (steps 1–3) */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="relative z-10 flex items-center justify-between border-t border-border/60 bg-background/35 px-5 py-3.5">
            <Button variant="ghost" onClick={back} className="text-muted-foreground">
              ← Назад
            </Button>
            <span className="text-caption font-medium text-muted-foreground tabular-nums">
              {step} / {TOTAL_STEPS - 2}
            </span>
            <Button onClick={next} className="gap-1.5">
              Далее <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 sm:px-8">
      {/* Glow + logo */}
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/50">
            <Sparkle className="size-6 text-primary" strokeWidth={1.6} />
          </div>
          <span
            className="font-heading text-4xl font-bold tracking-tight text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            AURA
          </span>
        </div>
        <p className="relative max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          Собери день в одну ясную систему: что сделать, где просадка, какой ритм держит тебя в форме.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {[
          { icon: LayoutDashboard, label: 'Всё в одном' },
          { icon: Trophy,          label: 'Геймификация' },
          { icon: Sparkle,         label: 'Личный ритм' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-xs"
          >
            <Icon className="size-3.5 text-primary opacity-80" strokeWidth={1.75} />
            {label}
          </div>
        ))}
      </div>

      {/* Feature preview icons */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {[
          { icon: Check,     label: 'Задачи'    },
          { icon: Sun,       label: 'Ритуалы'   },
          { icon: BookOpen,  label: 'Дневник'   },
          { icon: Wallet,    label: 'Финансы'   },
          { icon: Apple,     label: 'Питание'   },
          { icon: BarChart3, label: 'Статистика'},
          { icon: Smile,     label: 'Настроение'},
          { icon: Award,     label: 'Ранги'     },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-background/45 shadow-xs">
              <Icon className="size-4 text-primary/80" strokeWidth={1.75} />
            </div>
            <span className="text-nano text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-background/35 p-3">
        <p className="mb-3 text-center text-caption font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Как работает день в AURA
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
        {[
          { n: '1', title: 'Отмечай день', text: 'Ритуалы, задачи, таймер и дневник.' },
          { n: '2', title: 'Смотри сигнал', text: 'Главная показывает, где просадка.' },
          { n: '3', title: 'Копи ранг', text: 'Прогресс дня превращается в очки.' },
        ].map((item, idx, arr) => (
          <div key={item.n} className="contents">
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/12 text-nano font-bold text-primary">
                  {item.n}
                </span>
                <p className="truncate text-xs font-bold text-foreground">{item.title}</p>
              </div>
              <p className="text-caption leading-snug text-muted-foreground">{item.text}</p>
            </div>
            {idx < arr.length - 1 ? (
              <div className="hidden items-center justify-center text-muted-foreground/50 sm:flex">
                <ChevronRight className="size-4" />
              </div>
            ) : null}
          </div>
        ))}
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="gap-2 px-7 shadow-md shadow-primary/20">
        Начать настройку
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ─── Step 1: Appearance ───────────────────────────────────────────────────────
function StepAppearance({
  state,
  onAccent,
  onTheme,
  onFontFamily,
  onAppScale,
}: {
  state: WizardState;
  onAccent: (v: AuraAccentPreset) => void;
  onTheme: (v: AuraThemeMode) => void;
  onFontFamily: (v: AuraFontFamily) => void;
  onAppScale: (v: string) => void;
}) {
  const THEMES: { value: AuraThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Светлая', icon: Sun    },
    { value: 'dim',   label: 'Тихая',   icon: SunDim },
    { value: 'dark',  label: 'Тёмная',  icon: Moon   },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 sm:px-7">
      <div>
        <StepTitle icon={Sun} step={1} title="Внешний вид" subtitle="Тема, шрифт, масштаб и акцент" />
      </div>

      {/* Theme mode */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Тема</p>
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-200',
                state.themeMode === value
                  ? 'border-primary/50 bg-primary/8 ring-1 ring-primary/25'
                  : 'border-border/60 bg-card hover:border-border hover:bg-card/80'
              )}
            >
              <Icon
                className={cn('size-6', state.themeMode === value ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={1.5}
              />
              <span className={cn('text-xs font-medium', state.themeMode === value ? 'text-primary' : 'text-foreground/70')}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-background/35 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Шрифт</p>
            <p className="mt-1 text-xs text-muted-foreground">Выберите характер интерфейса: нейтральный, мягкий или выразительный.</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {state.fontFamily === AURA_FONT_STANDARD ? 'AURA' : state.fontFamily}
          </span>
        </div>
        <Select
          value={state.fontFamily}
          onValueChange={(value) => {
            if (isAuraFontFamily(value)) onFontFamily(value);
          }}
        >
          <SelectTrigger className="h-10 w-full bg-card text-sm" contentAlign="start">
            <SelectValue>
              {state.fontFamily === AURA_FONT_STANDARD ? 'Стандартный шрифт' : state.fontFamily}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AURA_FONT_CHOICES.map((font) => (
              <SelectItem key={font} value={font}>
                {font === AURA_FONT_STANDARD ? (
                  <span className="font-sans">Стандартный</span>
                ) : (
                  <span style={{ fontFamily: `'${font}', ui-sans-serif, system-ui, sans-serif` }}>{font}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* UI scale */}
      <div className="space-y-3 rounded-2xl border border-border/60 bg-background/35 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Масштаб интерфейса</p>
            <p className="mt-1 text-xs text-muted-foreground">Можно сделать AURA компактнее или просторнее сразу.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
            {Math.round(Number(state.appScale) * 100)}%
          </span>
        </div>
        <Slider
          min={90}
          max={125}
          step={5}
          value={[Math.round(Number(state.appScale) * 100)]}
          onValueChange={(values) => onAppScale(String((values[0] ?? 100) / 100))}
          className="px-0.5"
        />
        <div className="flex justify-between text-nano font-medium text-muted-foreground">
          <span>90%</span>
          <span>125%</span>
        </div>
      </div>

      {/* Accent color */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Акцентный цвет</p>
        <div className="grid grid-cols-7 gap-1.5">
          {ACCENT_PRESETS.map(({ value, label, hsl }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => onAccent(value)}
              className={cn(
                'group relative flex aspect-square items-center justify-center rounded-lg border-2 transition-all duration-200',
                state.accent === value ? 'scale-110 border-foreground/40 shadow-md' : 'border-transparent hover:scale-105'
              )}
              style={{ background: `hsl(${hsl})` }}
            >
              {state.accent === value && (
                <Check className="size-3 text-white drop-shadow" strokeWidth={3} />
              )}
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Выбрано: <span className="font-medium text-foreground">{ACCENT_PRESETS.find(p => p.value === state.accent)?.label}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Sections ─────────────────────────────────────────────────────────
function StepSections({
  sections,
  onToggle,
}: {
  sections: PageSectionsVisibility;
  onToggle: (page: keyof PageSectionsVisibility, key: string) => void;
}) {
  const pages = Array.from(new Set(SECTION_DEFS.map((s) => s.page)));
  const enabledCount = SECTION_DEFS.filter((s) => (sections[s.page] as Record<string, boolean>)[s.key]).length;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={LayoutDashboard} step={2} title="Разделы" subtitle="Оставьте только то, что реально будет на экране" />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
          <p className="text-nano font-bold uppercase tracking-wider text-muted-foreground">Включено</p>
          <p className="mt-0.5 text-2xl font-black tabular-nums text-foreground">{enabledCount}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-primary/20 bg-primary/[0.045] px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Это не пресеты и не данные.</p>
          <p className="mt-1 text-caption leading-snug text-muted-foreground">
            Здесь решается только видимость блоков. Всё можно вернуть позже в настройках.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {pages.map((page) => (
          <div key={page} className="rounded-2xl border border-border/60 bg-card p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {PAGE_LABELS[page]} · {PAGE_HINTS[page].title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{PAGE_HINTS[page].desc}</p>
              </div>
              <span className="shrink-0 rounded-full border border-border/60 bg-background/45 px-2 py-1 text-nano font-semibold text-muted-foreground">
                {SECTION_DEFS.filter((s) => s.page === page && (sections[page] as Record<string, boolean>)[s.key]).length}/
                {SECTION_DEFS.filter((s) => s.page === page).length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {SECTION_DEFS.filter((s) => s.page === page).map((sec) => {
                const active = Boolean((sections[page] as Record<string, boolean>)[sec.key]);
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => onToggle(page, sec.key)}
                    className={cn(
                      'flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-primary/25 bg-primary/[0.04]' : 'border-border/55 bg-background/30 hover:bg-muted/25'
                    )}
                  >
                    <div className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-background'
                    )}>
                      {active && <Check className="size-3" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight text-foreground">{sec.label}</p>
                      <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{sec.desc}</p>
                    </div>
                    <span className="hidden max-w-[10rem] shrink-0 truncate rounded-full bg-background/45 px-2 py-1 text-nano text-muted-foreground sm:block">
                      {sec.example}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Goals ────────────────────────────────────────────────────────────
function StepGoals({
  state,
  onChange,
  ambientFolder,
  ambientFound,
  ambientConnected,
  ambientMissing,
  ambientImportDone,
  onImportAmbient,
}: {
  state: WizardState;
  onChange: (p: Partial<WizardState>) => void;
  ambientFolder: string | null;
  ambientFound: number;
  ambientConnected: number;
  ambientMissing: number;
  ambientImportDone: boolean;
  onImportAmbient: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={Target} step={3} title="База дня" subtitle="Очки, питание и музыка без лишней теории" />

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-4">
        <p className="text-sm font-bold text-foreground">Идея простая: день должен давать ясный сигнал.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          AURA считает прогресс, показывает слабые места и превращает стабильность в очки. Настройте только численные нормы, а стартовые данные подтвердите на следующем шаге.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-primary" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-foreground">Система очков</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            50% это ноль, выше 50% день идёт в плюс, ниже 50% показывает просадку.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {[
              ['100%', '+100'],
              ['50%', '0'],
              ['0%', '-100'],
            ].map(([pct, pts]) => (
              <div key={pct} className="rounded-lg border border-border/45 bg-background/35 px-2 py-1.5">
                <p className="font-mono text-xs font-bold text-foreground">{pts}</p>
                <p className="text-nano text-muted-foreground">{pct}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Apple className="size-4 text-primary" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-foreground">Нормы КБЖУ в день</p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Поставьте ориентиры для дневника питания. Они влияют на прогресс и подсветку.
          </p>
          <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'calories' as const, label: 'Калории', unit: 'ккал', color: 'text-amber-500' },
            { key: 'proteins' as const, label: 'Белки',   unit: 'г',    color: 'text-[var(--nutrition-proteins)]' },
            { key: 'fats'     as const, label: 'Жиры',    unit: 'г',    color: 'text-[var(--nutrition-fats)]' },
            { key: 'carbs'    as const, label: 'Углеводы', unit: 'г',   color: 'text-[var(--nutrition-carbs)]' },
          ].map(({ key, label, unit, color }) => (
            <div key={key} className="space-y-1">
              <label className={cn('text-xs font-medium', color)}>{label}</label>
              <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-2">
                <input
                  type="number"
                  value={state[key]}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="shrink-0 text-caption text-muted-foreground">{unit}</span>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      <AmbientOnboardingPanel
        folder={ambientFolder}
        found={ambientFound}
        connected={ambientConnected}
        missing={ambientMissing}
        importDone={ambientImportDone}
        onImport={onImportAmbient}
      />
    </div>
  );
}

function AmbientOnboardingPanel({
  folder,
  found,
  connected,
  missing,
  importDone,
  onImport,
}: {
  folder: string | null;
  found: number;
  connected: number;
  missing: number;
  importDone: boolean;
  onImport: () => void;
}) {
  const openFolder = async () => {
    if (!folder) return;
    const req = getNodeRequire();
    const electron = req ? (req('electron') as { shell?: { openPath: (path: string) => Promise<string> } }) : null;
    await electron?.shell?.openPath(folder);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/45 text-primary">
            <Music2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Музыка для таймера</p>
            <p className="text-caption leading-snug text-muted-foreground">
              Найдено {found}, новых {missing}. Можно добавить сейчас или оставить пусто.
            </p>
          </div>
        </div>
        <Button type="button" variant={missing > 0 ? 'default' : 'secondary'} size="sm" onClick={onImport} disabled={missing === 0} className="shrink-0 gap-1.5">
          {importDone ? 'Добавлено' : missing > 0 ? `Добавить ${missing}` : 'Всё добавлено'}
        </Button>
      </div>

      {folder ? (
        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/45 bg-background/35 px-3 py-2 text-caption">
          <p className="min-w-0 truncate text-muted-foreground">
            Уже в AURA: <span className="font-semibold text-foreground">{connected}</span>
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={openFolder} className="h-7 shrink-0 gap-1.5 px-2 text-caption">
            <FolderOpen className="size-3.5" />
            Папка
          </Button>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-border/45 bg-background/35 px-3 py-2 text-caption text-muted-foreground">
          Папка музыки будет создана автоматически в данных приложения.
        </p>
      )}
    </div>
  );
}

// ─── Step 4: Presets ─────────────────────────────────────────────────────────
function StepPresetReview({
  presets,
  onToggle,
  ambientFound,
  ambientMissing,
}: {
  presets: Record<PresetGroupKey, boolean>;
  onToggle: (key: PresetGroupKey) => void;
  ambientFound: number;
  ambientMissing: number;
}) {
  const enabled = PRESET_GROUPS.filter((group) => presets[group.key]).length;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={Settings2} step={4} title="Пресеты" subtitle="Подтвердите, какие стартовые данные оставить" />

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">Вы управляете стартом.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Включённые наборы останутся в AURA. Выключенные будут удалены при завершении онбординга.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold tabular-nums text-primary">
            {enabled}/{PRESET_GROUPS.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRESET_GROUPS.map((group) => {
          const active = presets[group.key];
          const Icon = group.icon;
          const meta =
            group.key === 'ambient'
              ? ambientFound > 0
                ? `${ambientFound} файлов, ${ambientMissing} новых`
                : 'файлы можно добавить позже'
              : `${group.tables.length} таблиц данных`;

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onToggle(group.key)}
              className={cn(
                'flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition-colors',
                active ? 'border-primary/30 bg-primary/[0.045]' : 'border-border/60 bg-card hover:bg-muted/25'
              )}
            >
              <div className={cn(
                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border',
                active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/60 bg-background/45 text-muted-foreground'
              )}>
                <Icon className="size-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{group.title}</p>
                  <span className={cn(
                    'ml-auto shrink-0 rounded-full px-2 py-0.5 text-nano font-semibold',
                    active ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {active ? 'оставить' : 'убрать'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{group.desc}</p>
                <p className="mt-2 text-nano font-medium uppercase tracking-wider text-muted-foreground/80">{meta}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────
function StepDone({ state, onComplete }: { state: WizardState; onComplete: () => void }) {
  const rankSrc = rankImageSrc(1);
  const accentLabel = ACCENT_PRESETS.find(p => p.value === state.accent)?.label ?? state.accent;
  const enabledSections = SECTION_DEFS.filter(
    (s) => (state.sections[s.page] as Record<string, boolean>)[s.key]
  );
  const enabledPresets = PRESET_GROUPS.filter((group) => state.presets[group.key]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
      {/* Rank unlock */}
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <img
            src={rankSrc}
            alt="Никчёмный"
            className="size-24 rounded-2xl object-cover shadow-xl ring-1 ring-primary/20"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary shadow-md">
            <Trophy className="size-3.5 text-primary-foreground" strokeWidth={2} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ранг разблокирован</p>
          <p className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground">НИКЧЁМНЫЙ</p>
          <p className="mt-1 text-sm text-muted-foreground">Стартовый ранг — первый шаг к легенде</p>
        </div>
      </div>

      {/* Summary */}
      <div className="w-full max-w-xs space-y-2 rounded-xl border border-border/60 bg-card p-4">
        <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">Ваши настройки</p>
        <div className="space-y-1.5">
          <SummaryRow label="Цвет" value={accentLabel} />
          <SummaryRow label="Шрифт" value={state.fontFamily === AURA_FONT_STANDARD ? 'Стандартный' : state.fontFamily} />
          <SummaryRow label="Разделы включены" value={`${enabledSections.length} из ${SECTION_DEFS.length}`} />
          <SummaryRow label="Пресеты" value={`${enabledPresets.length} из ${PRESET_GROUPS.length}`} />
          <SummaryRow label="Калории" value={`${state.calories} ккал/день`} />
        </div>
      </div>

      <Button size="lg" onClick={onComplete} className="gap-2 px-8 shadow-lg shadow-primary/20">
        Открыть AURA
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StepTitle({
  icon: Icon,
  step,
  title,
  subtitle,
}: {
  icon: typeof Sun;
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
        <Icon className="size-4.5 text-primary" strokeWidth={1.75} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-widest text-primary">Шаг {step}</span>
        </div>
        <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
