// ─── StepDone ─────────────────────────────────────────────────────────────────
// Шаг 5: финальный экран с разблокированным рангом и сводкой настроек.

import { ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rankImageSrc } from '@/shared/config/ranks-model';
import { AURA_FONT_STANDARD } from '@/features/theme/font-constants';
import {
  ACCENT_PRESETS,
  SECTION_DEFS,
  PRESET_GROUPS,
  type WizardState,
} from '../onboarding-config';
import { SummaryRow } from '../ui/SummaryRow';

type Props = {
  state: WizardState;
  onComplete: () => void;
};

export function StepDone({ state, onComplete }: Props) {
  const rankSrc = rankImageSrc(1);
  const accentLabel = ACCENT_PRESETS.find((p) => p.value === state.accent)?.label ?? state.accent;

  const enabledSections = SECTION_DEFS.filter(
    (s) => (state.sections[s.page] as Record<string, boolean>)[s.key]
  );
  const enabledPresets = PRESET_GROUPS.filter((group) => state.presets[group.key]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
      {/* Разблокированный ранг */}
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

      {/* Сводка настроек */}
      <div className="w-full max-w-xs space-y-2 rounded-xl border border-border/60 bg-card p-4">
        <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">Ваши настройки</p>
        <div className="space-y-1.5">
          <SummaryRow label="Цвет"             value={accentLabel} />
          <SummaryRow label="Шрифт"            value={state.fontFamily === AURA_FONT_STANDARD ? 'Стандартный' : state.fontFamily} />
          <SummaryRow label="Разделы включены" value={`${enabledSections.length} из ${SECTION_DEFS.length}`} />
          <SummaryRow label="Пресеты"          value={`${enabledPresets.length} из ${PRESET_GROUPS.length}`} />
          <SummaryRow label="Калории"          value={`${state.calories} ккал/день`} />
        </div>
      </div>

      <Button size="lg" onClick={onComplete} className="gap-2 px-8 shadow-lg shadow-primary/20">
        Открыть AURA
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
