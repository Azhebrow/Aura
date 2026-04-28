import { useRef, type TouchEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileSectionSwitcherItem<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  Icon?: LucideIcon;
};

type Props<T extends string> = {
  sections: MobileSectionSwitcherItem<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
};

export function MobileSectionSwitcher<T extends string>({ sections, value, onChange, className }: Props<T>) {
  if (sections.length <= 1) return null;
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartXRef.current;
    const dy = t.clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
    const idx = sections.findIndex((s) => s.id === value);
    if (idx < 0) return;
    if (dx < 0 && idx < sections.length - 1) onChange(sections[idx + 1].id);
    if (dx > 0 && idx > 0) onChange(sections[idx - 1].id);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        'order-last mx-2 mb-2 mt-2 rounded-xl border border-border/40 bg-background px-0 py-0',
        className
      )}
    >
      <div className="flex w-full items-center gap-1.5 rounded-xl border border-border/50 bg-muted/20 p-2">
        {sections.map((section) => {
          const Icon = section.icon ?? section.Icon;
          const active = value === section.id;
          if (!Icon) return null;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={cn(
                'flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors',
                active ? 'bg-background text-foreground' : 'text-muted-foreground active:bg-muted/65'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
