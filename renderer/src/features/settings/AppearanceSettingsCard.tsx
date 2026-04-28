import { useEffect, useState } from 'react';
import {
  Check,
  Circle,
  Compass,
  Droplets,
  Flame,
  Gem,
  Heart,
  Leaf,
  Moon,
  MoonStar,
  Palette,
  Sparkles,
  Sun,
  Type,
  Waves,
  Zap,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import { AURA_FONT_CHOICES, AURA_FONT_STANDARD, isAuraFontFamily } from '@/features/theme/font-constants';
import type { AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';
import { cn } from '@/lib/utils';

const THEMES: UniversalRadioOption<AuraThemeMode>[] = [
  { value: 'light', label: 'Светлая', Icon: Sun },
  { value: 'dim', label: 'Приглушённая', Icon: Circle },
  { value: 'dark', label: 'Тёмная', Icon: Moon },
];

const ACCENT_PRESETS: UniversalRadioOption<AuraAccentPreset>[] = [
  { value: 'violet', label: 'Фиолетовый', Icon: Sparkles },
  { value: 'blue', label: 'Синий', Icon: Droplets },
  { value: 'emerald', label: 'Изумруд', Icon: Leaf },
  { value: 'amber', label: 'Графит', Icon: MoonStar },
  { value: 'rose', label: 'Розовый', Icon: Heart },
  { value: 'mono', label: 'Моно', Icon: Circle },
  { value: 'cyan', label: 'Циан', Icon: Waves },
  { value: 'orange', label: 'Оранжевый', Icon: Flame },
  { value: 'lime', label: 'Лайм', Icon: Zap },
  { value: 'red', label: 'Красный', Icon: Sun },
  { value: 'indigo', label: 'Индиго', Icon: Gem },
  { value: 'teal', label: 'Тил', Icon: Compass },
];

const ACCENT_SWATCH: Record<AuraAccentPreset, string> = {
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-zinc-900 dark:bg-zinc-50',
  rose: 'bg-rose-500',
  mono: 'bg-slate-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  lime: 'bg-lime-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
};

const FONT_SCALE_OPTIONS = [
  { value: '85', label: '85%' },
  { value: '90', label: '90%' },
  { value: '95', label: '95%' },
  { value: '100', label: '100%' },
  { value: '105', label: '105%' },
  { value: '110', label: '110%' },
  { value: '115', label: '115%' },
  { value: '120', label: '120%' },
];

function FontScaleCard() {
  const [fontScale, setFontScale] = useState(100);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aura-font-scale');
      if (raw) {
        const v = parseInt(raw, 10);
        if (v >= 85 && v <= 120) {
          setFontScale(v);
          document.documentElement.style.setProperty('--aura-font-scale', String(v / 100));
        }
      }
    } catch { /* ignore */ }
  }, []);

  const apply = (val: number) => {
    setFontScale(val);
    document.documentElement.style.setProperty('--aura-font-scale', String(val / 100));
    try { localStorage.setItem('aura-font-scale', String(val)); } catch { /* ignore */ }
  };

  return (
    <SettingsSectionCard title="Масштаб текста" leadingIcon={Type}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FONT_SCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => apply(parseInt(opt.value, 10))}
              className={cn(
                'h-8 min-w-[3rem] rounded-md border px-2 text-xs font-medium transition-colors aura-tx-colors',
                fontScale === parseInt(opt.value, 10)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-card hover:bg-muted/50 text-foreground/80'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Текущий масштаб: {fontScale}%</p>
      </div>
    </SettingsSectionCard>
  );
}

export function AppearanceSettingsCard() {
  const { db } = useAuraDb();
  const { theme, setTheme, accentPreset, setAccentPreset, fontFamily, setFontFamily } = useAuraTheme();
  const [appScale, setAppScale] = useState('1');
  const [pageTransitionsEnabled, setPageTransitionsEnabled] = useState(true);

  useEffect(() => {
    if (!db) return;
    const settings = (db.getAppSettings() ?? {}) as AuraRow;
    setAppScale(settings.app_scale != null ? String(settings.app_scale) : '1');
    setPageTransitionsEnabled(settings.page_transitions_enabled !== 0 && settings.page_transitions_enabled !== false);
    applyLiveAppearance({
      appScale: settings.app_scale != null ? String(settings.app_scale) : '1',
      transitionsEnabled: settings.page_transitions_enabled !== 0 && settings.page_transitions_enabled !== false,
    });
  }, [db]);

  const persistAccentPreset = (preset: AuraAccentPreset) => {
    setAccentPreset(preset);
    if (!db) return;
    try {
      const cur = (db.getAppSettings() ?? {}) as AuraRow;
      db.saveAppSettings({ ...cur, accent_preset: preset });
    } catch {
      /* ignore */
    }
  };

  const saveAppearancePatch = (patch: Partial<AuraRow>) => {
    if (!db) return;
    try {
      const cur = (db.getAppSettings() ?? {}) as AuraRow;
      db.saveAppSettings({ ...cur, ...patch });
    } catch {
      /* ignore */
    }
  };

  const applyLiveAppearance = ({
    appScale: nextScale,
    transitionsEnabled,
  }: {
    appScale: string;
    transitionsEnabled: boolean;
  }) => {
    const root = document.documentElement;
    const scaleNum = Number(nextScale);
    const safeScale = Number.isFinite(scaleNum) && scaleNum > 0 ? scaleNum : 1;
    root.style.setProperty('--aura-ui-scale', String(safeScale));
    root.setAttribute('data-page-transitions', transitionsEnabled ? 'on' : 'off');
    root.style.setProperty('--aura-gradient-intensity', '1');
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionCard title="Быстрая тема" leadingIcon={Palette}>
        <UniversalRadioGroup
          value={theme}
          onValueChange={setTheme}
          options={THEMES}
          ariaLabel="Тема окна"
          fullWidth
          className="bg-muted/50 p-1"
          optionClassName="h-11 rounded-md px-3 text-sm"
        />
      </SettingsSectionCard>

      <SettingsSectionCard title="Цветовой акцент" leadingIcon={Palette}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {ACCENT_PRESETS.map((item) => {
              const selected = accentPreset === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={selected}
                  onClick={() => persistAccentPreset(item.value)}
                  className={cn(
                    'relative inline-flex size-9 items-center justify-center rounded-full transition-transform duration-200 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    ACCENT_SWATCH[item.value],
                    selected && 'ring-2 ring-foreground/40 ring-offset-2 ring-offset-background scale-110'
                  )}
                >
                  {selected ? (
                    <Check className="size-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" strokeWidth={3} />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">
            {ACCENT_PRESETS.find((p) => p.value === accentPreset)?.label ?? ''}
          </p>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Визуальные эффекты" leadingIcon={Sparkles}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={appScale}
            onValueChange={(v) => {
              setAppScale(v);
              saveAppearancePatch({ app_scale: v });
              applyLiveAppearance({
                appScale: v,
                transitionsEnabled: pageTransitionsEnabled,
              });
            }}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Масштаб интерфейса" />
            </SelectTrigger>
            <SelectContent>
              {['0.9', '1', '1.1', '1.15', '1.25'].map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  Масштаб: {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => {
              const next = !pageTransitionsEnabled;
              setPageTransitionsEnabled(next);
              saveAppearancePatch({ page_transitions_enabled: next ? 1 : 0 });
              applyLiveAppearance({
                appScale,
                transitionsEnabled: next,
              });
            }}
            className="border-border bg-card hover:bg-muted/40 flex h-9 items-center justify-between rounded-md border px-3 text-xs aura-tx-colors"
          >
            <span>Переходы страниц</span>
            <span className="text-muted-foreground">{pageTransitionsEnabled ? 'Вкл' : 'Выкл'}</span>
          </button>
        </div>
      </SettingsSectionCard>

      <FontScaleCard />

      <SettingsSectionCard title="Шрифт интерфейса" leadingIcon={Type}>
        <Select
          value={fontFamily}
          onValueChange={(v) => {
            if (isAuraFontFamily(v)) setFontFamily(v);
          }}
        >
          <SelectTrigger id="settings-font-family" contentAlign="start" className="h-8 w-full text-xs">
            <SelectValue>{fontFamily === AURA_FONT_STANDARD ? 'Стандартный' : fontFamily}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AURA_FONT_CHOICES.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                <Type className="text-muted-foreground size-3.5" />
                {font === AURA_FONT_STANDARD ? (
                  <span className="font-sans">Стандартный</span>
                ) : (
                  <span style={{ fontFamily: `'${font}', ui-sans-serif, system-ui, sans-serif` }}>{font}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsSectionCard>
    </div>
  );
}
