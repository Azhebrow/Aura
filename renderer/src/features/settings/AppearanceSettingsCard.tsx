import { useEffect, useState } from 'react';
import { Moon, MoonStar, Palette, Sun, Sparkles, Drama, CircleDashed, Flame, Snowflake, Cloud, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { UniversalRadioGroup, type UniversalRadioOption } from '@/components/ui/header-segmented-radio';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { getAuraAccentPresetColors, applyAuraColorFilter } from '@/features/theme/apply-theme-dom';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import type { AuraAccentPreset, AuraColorFilter, AuraThemeMode } from '@/features/theme/theme-constants';
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
import { cn } from '@/lib/utils';

const THEMES: UniversalRadioOption<AuraThemeMode>[] = [
  { value: 'light', label: 'Светлая', Icon: Sun },
  { value: 'dim',   label: 'Тихая',   Icon: MoonStar },
  { value: 'dark',  label: 'Тёмная',  Icon: Moon },
];

const ACCENT_PRESETS: Array<{ value: AuraAccentPreset; label: string }> = [
  { value: 'mono',    label: 'Моно' },
  { value: 'slate',   label: 'Сланец' },
  { value: 'violet',  label: 'Фиолет' },
  { value: 'blue',    label: 'Синий' },
  { value: 'cyan',    label: 'Циан' },
  { value: 'teal',    label: 'Бирюза' },
  { value: 'emerald', label: 'Изумруд' },
  { value: 'lime',    label: 'Лайм' },
  { value: 'amber',   label: 'Янтарь' },
  { value: 'orange',  label: 'Апельсин' },
  { value: 'rose',    label: 'Красный' },
  { value: 'pink',    label: 'Розовый' },
];

const COLOR_FILTERS: UniversalRadioOption<AuraColorFilter>[] = [
  { value: 'vivid',    label: 'Яркий',     Icon: Sparkles },
  { value: 'serious',  label: 'Серьёзный', Icon: Drama },
  { value: 'warm',     label: 'Тёплый',    Icon: Flame },
  { value: 'cool',     label: 'Холодный',  Icon: Snowflake },
  { value: 'pastel',   label: 'Пастель',   Icon: Cloud },
  { value: 'contrast', label: 'Контраст',  Icon: Zap },
  { value: 'bw',       label: 'Ч/Б',       Icon: CircleDashed },
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

function SectionDivider() {
  return <div className="-mx-3 h-px bg-[var(--aura-border-soft)] sm:-mx-4" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aura-text-muted)]">
      {children}
    </p>
  );
}

export function AppearanceSettingsCard() {
  const { db } = useAuraDb();
  const { theme, setTheme, accentPreset, setAccentPreset, fontFamily, setFontFamily, colorFilter, setColorFilter } = useAuraTheme();
  const [appScale, setAppScale]   = useState(DEFAULT_APP_SCALE);
  const [textScale, setTextScale] = useState(DEFAULT_TEXT_SCALE);

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

  return (
    <SettingsSectionCard title="Оформление" leadingIcon={Palette} contentClassName="gap-4">

      {/* ── Тема ── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Тема</SectionLabel>
        <UniversalRadioGroup
          value={theme}
          onValueChange={(v) => { setTheme(v); saveAppSettings(db, { theme_mode: v }); }}
          options={THEMES}
          ariaLabel="Тема"
          fullWidth
        />
      </div>

      <SectionDivider />

      {/* ── Настроение ── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Настроение</SectionLabel>
        <div className="grid w-full grid-cols-7 gap-1" role="group" aria-label="Цветовой фильтр">
          {COLOR_FILTERS.map(({ value: v, label, Icon }) => {
            const active = colorFilter === v;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                title={label}
                onClick={() => { setColorFilter(v); applyAuraColorFilter(v); }}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1 rounded-lg py-2 text-center transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[var(--aura-surface-control)] text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground',
                )}
              >
                {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
                <span className="w-full truncate px-0.5 text-[9px] font-medium leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <SectionDivider />

      {/* ── Шрифт ── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Шрифт</SectionLabel>
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
      </div>

      <SectionDivider />

      {/* ── Акцентный цвет ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Акцентный цвет</SectionLabel>
          <span className="text-xs font-semibold" style={{ color: activeAccentTint }}>
            {activeAccent.label}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
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
                className="aspect-square w-full rounded-full transition-transform duration-150 hover:scale-110 active:scale-90"
                style={{
                  backgroundColor: tint,
                  boxShadow: selected
                    ? `0 0 0 2px var(--aura-surface-panel), 0 0 0 3.5px ${tint}`
                    : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      <SectionDivider />

      {/* ── Масштаб ── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Масштаб</SectionLabel>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-medium text-foreground/80">Интерфейс</span>
          <Slider
            min={APP_SCALE_MIN}
            max={APP_SCALE_MAX}
            step={APP_SCALE_STEP}
            value={[scaleToSlider(appScale, APP_SCALE_MIN, APP_SCALE_MAX)]}
            onValueChange={(values) => {
              const next = sliderToScale(values[0] ?? APP_SCALE_MIN);
              setAppScale(next);
              saveAppSettings(db, { [APP_SCALE_STORAGE_FIELD]: next });
              applyAppearanceScales(next, textScale);
            }}
            className="flex-1 px-0.5"
          />
          <span className="w-9 shrink-0 text-right tabular-nums text-xs font-medium text-[var(--aura-text-muted)]">
            {Math.round(Number(appScale) * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-medium text-foreground/80">Текст</span>
          <Slider
            min={TEXT_SCALE_MIN}
            max={TEXT_SCALE_MAX}
            step={TEXT_SCALE_STEP}
            value={[scaleToSlider(textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX)]}
            onValueChange={(values) => {
              const next = sliderToScale(values[0] ?? 100);
              setTextScale(next);
              saveAppSettings(db, { [TEXT_SCALE_STORAGE_FIELD]: next });
              applyAppearanceScales(appScale, next);
            }}
            className="flex-1 px-0.5"
          />
          <span className="w-9 shrink-0 text-right tabular-nums text-xs font-medium text-[var(--aura-text-muted)]">
            {Math.round(Number(textScale) * 100)}%
          </span>
        </div>
      </div>

    </SettingsSectionCard>
  );
}
