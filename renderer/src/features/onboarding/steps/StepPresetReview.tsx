// ─── StepPresetReview ─────────────────────────────────────────────────────────
// Шаг 4: подтверждение стартовых пресетов — какие наборы данных оставить.

import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRESET_GROUPS, type PresetGroupKey } from '../onboarding-config';
import { StepTitle } from '../ui/StepTitle';

type Props = {
  presets: Record<PresetGroupKey, boolean>;
  onToggle: (key: PresetGroupKey) => void;
  ambientFound: number;
  ambientMissing: number;
};

export function StepPresetReview({ presets, onToggle, ambientFound, ambientMissing }: Props) {
  const enabled = PRESET_GROUPS.filter((group) => presets[group.key]).length;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={Settings2} step={4} title="Пресеты" subtitle="Подтвердите, какие стартовые данные оставить" />

      {/* Информационный блок */}
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

      {/* Список групп пресетов */}
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
