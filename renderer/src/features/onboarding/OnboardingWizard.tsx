// ─── OnboardingWizard ─────────────────────────────────────────────────────────
// Оболочка мастера настройки: управляет шагами, анимацией и финальным сохранением.
// Вся конфигурация — в onboarding-config.ts, утилиты — в onboarding-utils.ts.

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  APP_SCALE_STORAGE_FIELD,
  DEFAULT_APP_SCALE,
  applyAppearanceScales,
  normalizeScale,
  readAppearanceScaleSettings,
} from '@/features/theme/appearance-scale';
import { useAuraTheme } from '@/features/theme/ThemeContext';
import type { AuraAccentPreset, AuraThemeMode } from '@/features/theme/theme-constants';
import { type AuraFontFamily } from '@/features/theme/font-constants';
import {
  enforceVisibilityInvariants,
  parsePageSectionsVisibility,
  type PageSectionsVisibility,
} from '@/shared/lib/page-sections-visibility';
import type { AuraDatabase } from '@/types/aura';

import {
  DEFAULT_PRESET_CHOICES,
  TOTAL_STEPS,
  type PresetGroupKey,
  type WizardState,
} from './onboarding-config';
import {
  resolveAmbientFolderPath,
  readAmbientFiles,
  ambientKey,
  applyPresetChoices,
} from './onboarding-utils';

// ─── Steps ────────────────────────────────────────────────────────────────────
import { StepWelcome }      from './steps/StepWelcome';
import { StepAppearance }   from './steps/StepAppearance';
import { StepSections }     from './steps/StepSections';
import { StepGoals }        from './steps/StepGoals';
import { StepPresetReview } from './steps/StepPresetReview';
import { StepDone }         from './steps/StepDone';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  db: AuraDatabase | null;
  onComplete: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingWizard({ db, onComplete }: Props) {
  const { accentPreset, setAccentPreset, theme, setTheme, fontFamily, setFontFamily } = useAuraTheme();

  const [step, setStep]                     = useState(0);
  const [animDir, setAnimDir]               = useState<'forward' | 'back'>('forward');
  const [visible, setVisible]               = useState(false);
  const [ambientFolder, setAmbientFolder]   = useState<string | null>(null);
  const [ambientFiles, setAmbientFiles]     = useState<string[]>([]);
  const [ambientImportDone, setAmbientImportDone] = useState(false);

  // Инициализируем состояние из текущих настроек БД + темы
  const [state, setState] = useState<WizardState>(() => {
    const settings = db?.getAppSettings() as Record<string, unknown> | null;
    const sections = parsePageSectionsVisibility(settings?.page_sections_visibility);
    const scales   = readAppearanceScaleSettings(settings);
    return {
      accent:     accentPreset,
      themeMode:  theme,
      fontFamily,
      appScale:   scales.appScale,
      textScale:  scales.textScale,
      sections,
      presets:    DEFAULT_PRESET_CHOICES,
      calories:   String(settings?.nutrition_target_calories ?? '2000'),
      proteins:   String(settings?.nutrition_target_proteins ?? '150'),
      fats:       String(settings?.nutrition_target_fats ?? '70'),
      carbs:      String(settings?.nutrition_target_carbs ?? '220'),
    };
  });

  // Fade-in при монтировании
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  // ─── Ambient ───────────────────────────────────────────────────────────────

  const refreshAmbient = useCallback(() => {
    const folder = resolveAmbientFolderPath();
    setAmbientFolder(folder);
    setAmbientFiles(folder ? readAmbientFiles(folder) : []);
  }, []);

  useEffect(() => { refreshAmbient(); }, [refreshAmbient]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  const goTo = useCallback((nextStep: number, dir: 'forward' | 'back') => {
    setAnimDir(dir);
    setStep(nextStep);
  }, []);

  const next = () => goTo(Math.min(step + 1, TOTAL_STEPS - 1), 'forward');
  const back = () => goTo(Math.max(step - 1, 0), 'back');

  const patchState = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  // ─── Appearance handlers ───────────────────────────────────────────────────

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
      [page]: { ...(state.sections[page] as Record<string, boolean>), [key]: !(state.sections[page] as Record<string, boolean>)[key] },
    };
    patchState({ sections: enforceVisibilityInvariants(next as PageSectionsVisibility) });
  };

  const togglePreset = (key: PresetGroupKey) => {
    patchState({ presets: { ...state.presets, [key]: !state.presets[key] } });
  };

  // ─── Ambient import ────────────────────────────────────────────────────────

  const ambientExisting = new Set(
    db?.getAll?.('cfg_ambient_music')
      ?.map((row) => ambientKey(String(row.file_name ?? '')))
      ?.filter(Boolean) ?? []
  );
  const ambientMissing = ambientFiles.filter((f) => !ambientExisting.has(ambientKey(f)));

  const importAmbient = () => {
    if (!db || ambientMissing.length === 0) return;
    for (const fileName of ambientMissing) {
      db.create('cfg_ambient_music', { name: fileName, icon: 'music-2', file_name: fileName });
    }
    setAmbientImportDone(true);
    window.dispatchEvent(new Event('settings-saved'));
    refreshAmbient();
  };

  // ─── Complete ──────────────────────────────────────────────────────────────

  /**
   * Финальное сохранение: применяет пресеты и сохраняет настройки в БД.
   * Вызывается с последнего шага.
   */
  const handleComplete = () => {
    if (!db) { onComplete(); return; }
    if (state.presets.ambient && ambientMissing.length > 0) importAmbient();
    applyPresetChoices(db, state.presets);
    const existing = (db.getAppSettings() ?? {}) as Record<string, unknown>;
    db.saveAppSettings({
      ...existing,
      accent_preset:              state.accent,
      theme_mode:                 state.themeMode,
      [APP_SCALE_STORAGE_FIELD]:  Number(state.appScale) || 1,
      page_sections_visibility:   JSON.stringify(state.sections),
      nutrition_target_calories:  Number(state.calories) || 2000,
      nutrition_target_proteins:  Number(state.proteins) || 150,
      nutrition_target_fats:      Number(state.fats) || 70,
      nutrition_target_carbs:     Number(state.carbs) || 220,
      onboarding_complete:        true,
    });
    window.dispatchEvent(new Event('settings-saved'));
    onComplete();
  };

  // ─── Step content ──────────────────────────────────────────────────────────

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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-background/85 p-4 aura-tx-colors backdrop-blur-sm sm:p-6',
        'transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="relative z-10 flex h-auto max-h-[86svh] min-h-[32rem] w-full max-w-[45rem] flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-2xl shadow-black/16">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-border/80" />

        {/* Индикатор шагов (скрыт на первом и последнем) */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="relative z-10 flex items-center justify-center gap-2 px-6 pt-5">
            {Array.from({ length: TOTAL_STEPS - 2 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-[3px] flex-1 max-w-[4rem] rounded-full transition-all duration-500',
                  i < step - 1  ? 'bg-primary'
                  : i === step - 1 ? 'bg-primary/70'
                  : 'bg-border'
                )}
              />
            ))}
          </div>
        )}

        {/* Контент шага */}
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

        {/* Навигационные кнопки (шаги 1–4) */}
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
