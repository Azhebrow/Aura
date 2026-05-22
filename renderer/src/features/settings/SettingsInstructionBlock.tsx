import type { SettingsInstruction } from '@/features/settings/settings-instructions-simple';

type Props = {
  instruction: SettingsInstruction;
};

export function SettingsInstructionBlock({ instruction }: Props) {
  return (
    <section className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] p-4 space-y-3.5">
      {/* ЧТО ЭТО */}
      <div>
        <p className="text-sm leading-relaxed text-muted-foreground">{instruction.whatIs}</p>
      </div>

      {/* ГДЕ В ПРОГРАММЕ */}
      <div className="pt-2 border-t border-[var(--aura-border-soft)]">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Где найти</p>
        <p className="text-sm text-muted-foreground">{instruction.whereInApp}</p>
      </div>

      {/* КАК ИСПОЛЬЗОВАТЬ */}
      {instruction.howToUse.length > 0 && (
        <div className="pt-2 border-t border-[var(--aura-border-soft)]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Как использовать</p>
          <ol className="space-y-1.5">
            {instruction.howToUse.map((step, idx) => (
              <li key={idx} className="text-sm leading-relaxed text-muted-foreground flex gap-2">
                <span className="font-semibold text-muted-foreground shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ВАЖНО ЗНАТЬ */}
      {instruction.limitations && instruction.limitations.length > 0 && (
        <div className="pt-2 border-t border-[var(--aura-border-soft)]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Важно знать</p>
          <ul className="space-y-1">
            {instruction.limitations.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
