// ─── StepAppearance ───────────────────────────────────────────────────────────
// Шаг 1: тема, шрифт, масштаб и акцентный цвет.

import { Check, Moon, Sun, SunDim } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import {
  AURA_FONT_CHOICES,
  AURA_FONT_STANDARD,
  isAuraFontFamily,
  type AuraFontFamily,
} from '@/features/theme/font-constants';
import { ACCENT_PRESETS, type WizardState } from '../onboarding-config';
import { StepTitle } from '../ui/StepTitle';

const THEMES: { value: AuraThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Светлая', icon: Sun    },
  { value: 'dim',   label: 'Тихая',   icon: SunDim },
  { value: 'dark',  label: 'Тёмная',  icon: Moon   },
];

type Props = {
  state: WizardState;
  onAccent: (v: AuraAccentPreset) => void;
  onTheme: (v: AuraThemeMode) => void;
  onFontFamily: (v: AuraFontFamily) => void;
  onAppScale: (v: string) => void;
};

export function StepAppearance({ state, onAccent, onTheme, onFontFamily, onAppScale }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={Sun} step={1} title="Внешний вид" subtitle="Тема, шрифт, масштаб и акцент" />

      {/* Выбор темы */}
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

      {/* Выбор шрифта */}
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

      {/* Масштаб интерфейса */}
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

      {/* Акцентный цвет */}
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
