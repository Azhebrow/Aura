// ─── StepSections ─────────────────────────────────────────────────────────────
// Шаг 2: выбор видимых разделов интерфейса по страницам.

import { Check, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageSectionsVisibility } from '@/shared/lib/page-sections-visibility';
import { SECTION_DEFS, PAGE_LABELS, PAGE_HINTS } from '../onboarding-config';
import { StepTitle } from '../ui/StepTitle';

type Props = {
  sections: PageSectionsVisibility;
  onToggle: (page: keyof PageSectionsVisibility, key: string) => void;
};

export function StepSections({ sections, onToggle }: Props) {
  const pages = Array.from(new Set(SECTION_DEFS.map((s) => s.page)));
  const enabledCount = SECTION_DEFS.filter((s) => (sections[s.page] as Record<string, boolean>)[s.key]).length;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7">
      <StepTitle icon={LayoutDashboard} step={2} title="Разделы" subtitle="Оставьте только то, что реально будет на экране" />

      {/* Счётчик + подсказка */}
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

      {/* Группы по страницам */}
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
