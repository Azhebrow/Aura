import { useEffect, useState } from 'react';
import {
  Check,
  Compass,
  Droplets,
  Flame,
  Gem,
  Heart,
  Languages,
  Leaf,
  Moon,
  MoonStar,
  Palette,
  Sparkles,
  Sun,
  Waves,
  Zap,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { getAuraAccentPresetColors } from '@/features/theme/apply-theme-dom';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import { useAuraLanguage } from '@/features/language/LanguageContext';
import type { AuraLanguage } from '@/i18n/language-constants';
import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import { AURA_FONT_CHOICES, AURA_FONT_STANDARD, isAuraFontFamily } from '@/features/theme/font-constants';
import type { AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

const THEMES: UniversalRadioOption<AuraThemeMode>[] = [
  { value: 'light', label: 'Светлая', Icon: Sun },
  { value: 'dim', label: 'Тихая', Icon: MoonStar },
  { value: 'dark', label: 'Тёмная', Icon: Moon },
];

const ACCENT_PRESETS: Array<{
  value: AuraAccentPreset;
  label: string;
  icon: typeof Sparkles;
}> = [
  { value: 'slate', label: 'Сланец', icon: MoonStar },
  { value: 'stone', label: 'Камень', icon: Compass },
  { value: 'graphite', label: 'Графит', icon: Zap },
  { value: 'violet', label: 'Фиолетовый', icon: Sparkles },
  { value: 'indigo', label: 'Индиго', icon: Gem },
  { value: 'blue', label: 'Синий', icon: Droplets },
  { value: 'cobalt', label: 'Кобальт', icon: Gem },
  { value: 'cyan', label: 'Циан', icon: Waves },
  { value: 'teal', label: 'Бирюза', icon: Waves },
  { value: 'emerald', label: 'Изумруд', icon: Leaf },
  { value: 'forest', label: 'Лес', icon: Compass },
  { value: 'lime', label: 'Лайм', icon: Leaf },
  { value: 'amber', label: 'Янтарь', icon: Flame },
  { value: 'rose', label: 'Роза', icon: Heart },
  { value: 'mono', label: 'Моно', icon: MoonStar },
];

const APP_SCALE_MIN = 90;
const APP_SCALE_MAX = 125;
const APP_SCALE_STEP = 5;

function scaleToSlider(value: string) {
  const n = Math.round(Number(value) * 100);
  return Number.isFinite(n) ? Math.min(APP_SCALE_MAX, Math.max(APP_SCALE_MIN, n)) : 100;
}

function sliderToScale(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, '');
}

function saveAppSettings(db: ReturnType<typeof useAuraDb>['db'], patch: Partial<AuraRow>) {
  if (!db) return;
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  db.saveAppSettings({ ...cur, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

export function AppearanceSettingsCard() {
  const { db } = useAuraDb();
  const { theme, setTheme, accentPreset, setAccentPreset, fontFamily, setFontFamily } = useAuraTheme();
  const { language, setLanguage } = useAuraLanguage();
  const [appScale, setAppScale] = useState('1');

  const LANGUAGE_OPTIONS: UniversalRadioOption<AuraLanguage>[] = [
    { value: 'ru', label: 'Русский', Icon: Languages },
    { value: 'en', label: 'English', Icon: Languages },
  ];

  useEffect(() => {
    if (!db) return;
    const settings = (db.getAppSettings() ?? {}) as AuraRow;
    const nextScale = settings.app_scale != null && settings.app_scale !== '' ? String(settings.app_scale) : '1';
    setAppScale(nextScale);
    document.documentElement.style.setProperty('--aura-ui-scale', nextScale);
  }, [db]);

  const persistAccentPreset = (preset: AuraAccentPreset) => {
    setAccentPreset(preset);
    saveAppSettings(db, { accent_preset: preset });
  };

  return (
    <SettingsSectionCard title="Оформление" leadingIcon={Palette} contentClassName="gap-2.5">
      <div className="grid grid-cols-1 gap-2.5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Тема</p>
          <UniversalRadioGroup
            value={theme}
            onValueChange={(v) => { setTheme(v); window.dispatchEvent(new Event('settings-saved')); }}
            options={THEMES}
            ariaLabel="Тема"
            fullWidth
            className="bg-muted/25 h-12 min-h-12 rounded-xl p-1"
            optionClassName="rounded-lg px-3 text-xs"
            selectedOptionClassName="bg-background text-foreground shadow-sm ring-1 ring-border"
            unselectedOptionClassName="text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Акцент</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((item) => {
              const selected = accentPreset === item.value;
              const Icon = item.icon;
              const { tint, tintFg } = getAuraAccentPresetColors(item.value, theme);
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => persistAccentPreset(item.value)}
                  className="border-border/70 flex h-10 min-w-0 items-center gap-2 rounded-full border px-3 text-left text-xs transition-[transform,box-shadow,border-color,background-color] hover:scale-[1.01]"
                  style={{
                    backgroundColor: tint,
                    color: tintFg,
                    boxShadow: selected ? `inset 0 0 0 1px ${tintFg}33, 0 0 0 2px ${tint}22` : undefined,
                    opacity: selected ? 1 : 0.94,
                  }}
                >
                  <Icon className="size-3.5 shrink-0 opacity-95" />
                  <span className="min-w-0 truncate font-medium">{item.label}</span>
                  {selected ? <Check className="ml-auto size-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Масштаб</p>
          <div className="border-border/70 bg-muted/20 rounded-xl border px-3 py-2">
            <Slider
              min={APP_SCALE_MIN}
              max={APP_SCALE_MAX}
              step={APP_SCALE_STEP}
              value={[scaleToSlider(appScale)]}
              onValueChange={(values) => {
                const next = sliderToScale(values[0] ?? APP_SCALE_MIN);
                setAppScale(next);
                saveAppSettings(db, { app_scale: next });
                document.documentElement.style.setProperty('--aura-ui-scale', next);
              }}
              className="px-1 py-2"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>90%</span>
              <span className="tabular-nums text-foreground/80">{Math.round(Number(appScale) * 100)}%</span>
              <span>125%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Шрифт</p>
          <Select
            value={fontFamily}
            onValueChange={(v) => {
              if (isAuraFontFamily(v)) { setFontFamily(v); window.dispatchEvent(new Event('settings-saved')); }
            }}
          >
            <SelectTrigger id="settings-font-family" contentAlign="start" className="h-10 w-full text-xs">
              <SelectValue>{fontFamily === AURA_FONT_STANDARD ? 'Стандартный' : fontFamily}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AURA_FONT_CHOICES.map((font) => (
                <SelectItem key={font} value={font} className="text-xs">
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

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Язык</p>
          <UniversalRadioGroup
            value={language}
            onValueChange={(v) => { setLanguage(v); window.dispatchEvent(new Event('settings-saved')); }}
            options={LANGUAGE_OPTIONS}
            ariaLabel="Язык"
            fullWidth
            className="bg-muted/25 h-12 min-h-12 rounded-xl p-1"
            optionClassName="rounded-lg px-3 text-xs"
            selectedOptionClassName="bg-background text-foreground shadow-sm ring-1 ring-border"
            unselectedOptionClassName="text-muted-foreground"
          />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
