import { Info } from 'lucide-react';
import type { SettingsInfoEntry } from '@/features/settings/settings-info-config';

type Props = {
  entry: SettingsInfoEntry;
};

export function SettingsInfoBlock({ entry }: Props) {
  const paragraph = entry.description.join(' ').trim();
  const tips = entry.tips.slice(0, 3);
  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <p className="text-muted-foreground text-sm leading-relaxed">{paragraph}</p>
      <ul className="mt-3 space-y-1.5">
        {tips.map((text, idx) => (
          <li key={`${entry.title}-tip-${idx}`} className="text-muted-foreground flex items-start gap-2 text-sm leading-relaxed">
            <Info className="mt-0.5 size-3.5 shrink-0 opacity-80" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
