import { useEffect, useState } from 'react';
import { Moon, Palette, Scaling, ShieldCheck, Sun, Sunset, Type } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { getAuraAccentPresetColors } from '@/features/theme/apply-theme-dom';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import { AURA_FONT_CHOICES, AURA_FONT_STANDARD, isAuraFontFamily } from '@/features/theme/font-constants';
import {
  APP_SCALE_STORAGE_FIELD,
  DEFAULT_APP_SCALE,
  DEFAULT_TEXT_SCALE,
  TEXT_SCALE_STORAGE_FIELD,
  applyAppearanceScales,
  readAppearanceScaleSettings,
} from '@/features/theme/appearance-scale';
import type { AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

const THEMES: UniversalRadioOption<AuraThemeMode>[] = [
  { value: 'light',  label: 'Светлое',      Icon: Sun },
  { value: 'tinted', label: 'Тонированное', Icon: Sunset },
  { value: 'dark',   label: 'Тёмное',       Icon: Moon },
];

const ACCENT_PRESETS: Array<{ value: AuraAccentPreset; label: string }> = [
  { value: 'fantasy',  label: 'Fantasy' },
  { value: 'blue',    label: 'Синий' },
  { value: 'teal',    label: 'Бирюза' },
  { value: 'emerald', label: 'Изумруд' },
  { value: 'amber',   label: 'Янтарь' },
  { value: 'rose',    label: 'Красный' },
  { value: 'slate',   label: 'Сталь' },
  { value: 'graphite', label: 'Графит' },
];

const APP_SCALE_MIN  = 90;
const APP_SCALE_MAX  = 125;
const APP_SCALE_STEP = 5;
const TEXT_SCALE_MIN  = 90;
const TEXT_SCALE_MAX  = 120;
const TEXT_SCALE_STEP = 5;

function scaleToSlider(value: string, min = APP_SCALE_MIN, max = APP_SCALE_MAX) {
  const n = Math.round(Number(value) * 100);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 100;
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

function SettingRow({
  icon: Icon,
  label,
  meta,
  children,
}: {
  icon: typeof Palette;
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-14 grid-cols-1 gap-2 border-t border-soft/55 px-3 py-2.5 first:border-t-0 sm:grid-cols-[minmax(11rem,1fr)_minmax(13rem,1.4fr)] sm:items-center">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-control/60 text-subtle">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">{label}</p>
          {meta ? <p className="mt-0.5 truncate text-xs text-dim">{meta}</p> : null}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ScaleControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-2">
      <span className="text-xs font-medium text-dim">{label}</span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[scaleToSlider(value, min, max)]}
        onValueChange={(values) => onChange(sliderToScale(values[0] ?? 100))}
        className="min-w-0 px-0.5"
      />
      <span className="text-right tabular-nums text-xs font-semibold text-foreground">
        {Math.round(Number(value) * 100)}%
      </span>
    </div>
  );
}

export function AppearanceSettingsCard() {
  const { db } = useAuraDb();
  const {
    theme,
    setTheme,
    accentPreset,
    setAccentPreset,
    fontFamily,
    setFontFamily,
    iconTheme,
    setIconTheme,
    strictMode,
    setStrictMode,
  } = useAuraTheme();
  const [appScale, setAppScale]   = useState(DEFAULT_APP_SCALE);
  const [textScale, setTextScale] = useState(DEFAULT_TEXT_SCALE);

  useEffect(() => {
    if (iconTheme !== 'filled') setIconTheme('filled');
  }, [iconTheme, setIconTheme]);

  useEffect(() => {
    if (!db) return;
    const settings = (db.getAppSettings() ?? {}) as AuraRow;
    const next = readAppearanceScaleSettings(settings);
    setAppScale(next.appScale);
    setTextScale(next.textScale);
    applyAppearanceScales(next.appScale, next.textScale);
  }, [db]);

  const activeAccent = ACCENT_PRESETS.find((p) => p.value === accentPreset) ?? ACCENT_PRESETS[0];
  const { tint: activeAccentTint } = getAuraAccentPresetColors(activeAccent.value, theme);
  const themeMeta = theme === 'light' ? 'Светлое' : theme === 'tinted' ? 'Тонированное' : 'Тёмное';

  return (
    <SettingsSectionCard title="Оформление" leadingIcon={Palette} contentClassName="gap-3">
      <div className="overflow-hidden rounded-xl border border-soft/70 bg-card/60">
        <SettingRow icon={Sun} label="Тема" meta={themeMeta}>
          <UniversalRadioGroup
            value={theme}
            onValueChange={(v) => { setTheme(v); saveAppSettings(db, { theme_mode: v }); }}
            options={THEMES}
            ariaLabel="Тема"
            fullWidth
          />
        </SettingRow>

        <SettingRow icon={Type} label="Шрифт" meta={fontFamily === AURA_FONT_STANDARD ? 'Стандартный' : fontFamily}>
        <Select
          value={fontFamily}
          onValueChange={(v) => {
            if (isAuraFontFamily(v)) { setFontFamily(v); window.dispatchEvent(new Event('settings-saved')); }
          }}
        >
          <SelectTrigger id="settings-font-family" contentAlign="start" className="w-full">
            <SelectValue>
              {fontFamily === AURA_FONT_STANDARD ? 'Стандартный' : fontFamily}
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
        </SettingRow>

        <SettingRow icon={ShieldCheck} label="Операторский режим" meta={strictMode === 'on' ? 'Чёрно-белый контроль' : 'Обычный интерфейс'}>
          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="min-w-0 truncate text-right text-xs font-medium text-dim">
              {strictMode === 'on' ? 'Цвета отключены' : 'Акценты включены'}
            </span>
            <Switch
              id="settings-strict-mode"
              checked={strictMode === 'on'}
              onCheckedChange={(checked) => {
                const next = checked ? 'on' : 'off';
                setStrictMode(next);
                saveAppSettings(db, { strict_visual_mode: next });
              }}
              aria-label="Операторский режим"
            />
          </div>
        </SettingRow>

        {strictMode !== 'on' ? (
          <SettingRow icon={Palette} label="Акцент" meta={activeAccent.label}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="aura-operator-swatch size-7 shrink-0 rounded-lg border border-soft shadow-xs" style={{ backgroundColor: activeAccentTint }} aria-hidden />
              <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5 sm:grid-cols-8">
                {ACCENT_PRESETS.map((item) => {
                  const selected = accentPreset === item.value;
                  const { tint } = getAuraAccentPresetColors(item.value, theme);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => { setAccentPreset(item.value); saveAppSettings(db, { accent_preset: item.value }); }}
                      className="aura-operator-control flex h-7 min-w-0 items-center justify-center rounded-lg border border-soft/70 bg-control/30 aura-tx-interactive hover:bg-hover"
                    >
                      <span
                        className="aura-operator-swatch size-4 rounded-full"
                        style={{
                          backgroundColor: tint,
                          boxShadow: selected ? `0 0 0 2px var(--background), 0 0 0 3px ${tint}` : undefined,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingRow>
        ) : null}

        <SettingRow icon={Scaling} label="Масштаб" meta="Интерфейс и текст">
          <div className="flex flex-col gap-2">
            <ScaleControl
              label="Интерфейс"
              value={appScale}
              min={APP_SCALE_MIN}
              max={APP_SCALE_MAX}
              step={APP_SCALE_STEP}
              onChange={(next) => {
                setAppScale(next);
                saveAppSettings(db, { [APP_SCALE_STORAGE_FIELD]: next });
                applyAppearanceScales(next, textScale);
              }}
            />
            <ScaleControl
              label="Текст"
              value={textScale}
              min={TEXT_SCALE_MIN}
              max={TEXT_SCALE_MAX}
              step={TEXT_SCALE_STEP}
              onChange={(next) => {
                setTextScale(next);
                saveAppSettings(db, { [TEXT_SCALE_STORAGE_FIELD]: next });
                applyAppearanceScales(appScale, next);
              }}
            />
          </div>
        </SettingRow>
      </div>
    </SettingsSectionCard>
  );
}
