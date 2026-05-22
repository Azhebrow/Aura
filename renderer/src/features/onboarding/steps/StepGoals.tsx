// ─── StepGoals ────────────────────────────────────────────────────────────────
// Шаг 3: система очков, нормы КБЖУ, подключение ambient-музыки.

import { Apple, Award, FolderOpen, Music2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getNodeRequire } from '../onboarding-utils';
import { type WizardState } from '../onboarding-config';
import { StepTitle } from '../ui/StepTitle';

// ─── AmbientOnboardingPanel ───────────────────────────────────────────────────

type AmbientPanelProps = {
  folder: string | null;
  found: number;
  connected: number;
  missing: number;
  importDone: boolean;
  onImport: () => void;
};

/** Панель подключения ambient-папки: показывает состояние и кнопку импорта */
function AmbientOnboardingPanel({ folder, found, connected, missing, importDone, onImport }: AmbientPanelProps) {
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
        <Button
          type="button"
          variant={missing > 0 ? 'default' : 'secondary'}
          size="sm"
          onClick={onImport}
          disabled={missing === 0}
          className="shrink-0 gap-1.5"
        >
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

// ─── StepGoals ────────────────────────────────────────────────────────────────

type Props = {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  ambientFolder: string | null;
  ambientFound: number;
  ambientConnected: number;
  ambientMissing: number;
  ambientImportDone: boolean;
  onImportAmbient: () => void;
};

export function StepGoals({
  state,
  onChange,
  ambientFolder,
  ambientFound,
  ambientConnected,
  ambientMissing,
  ambientImportDone,
  onImportAmbient,
}: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={Target} step={3} title="База дня" subtitle="Очки, питание и музыка без лишней теории" />

      {/* Пояснение */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-4">
        <p className="text-sm font-bold text-foreground">Идея простая: день должен давать ясный сигнал.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          AURA считает прогресс, показывает слабые места и превращает стабильность в очки. Настройте только численные нормы, а стартовые данные подтвердите на следующем шаге.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        {/* Система очков */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-primary" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-foreground">Система очков</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            50% это ноль, выше 50% день идёт в плюс, ниже 50% показывает просадку.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {([['100%', '+100'], ['50%', '0'], ['0%', '-100']] as const).map(([pct, pts]) => (
              <div key={pct} className="rounded-lg border border-border/45 bg-background/35 px-2 py-1.5">
                <p className="font-mono text-xs font-bold text-foreground">{pts}</p>
                <p className="text-nano text-muted-foreground">{pct}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Нормы КБЖУ */}
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
              { key: 'calories' as const, label: 'Калории',   unit: 'ккал', color: 'text-amber-500' },
              { key: 'proteins' as const, label: 'Белки',     unit: 'г',    color: 'text-[var(--nutrition-proteins)]' },
              { key: 'fats'     as const, label: 'Жиры',      unit: 'г',    color: 'text-[var(--nutrition-fats)]' },
              { key: 'carbs'    as const, label: 'Углеводы',  unit: 'г',    color: 'text-[var(--nutrition-carbs)]' },
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
