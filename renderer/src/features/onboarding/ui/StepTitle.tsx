// ─── StepTitle ────────────────────────────────────────────────────────────────
// Заголовок шага онбординга: иконка, номер шага, заголовок и подзаголовок.

import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  step: number;
  title: string;
  subtitle: string;
};

export function StepTitle({ icon: Icon, step, title, subtitle }: Props) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
        <Icon className="size-4.5 text-primary" strokeWidth={1.75} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-widest text-primary">Шаг {step}</span>
        </div>
        <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
