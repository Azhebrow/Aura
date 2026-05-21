import type { ReactNode, TouchEvent } from 'react';
import { useRef } from 'react';
import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileSectionItem<T extends string> = {
  id: T;
  label: string;
  Icon: LucideIcon;
  content: ReactNode;
  locked?: boolean;
};

export type MobileSectionTab<T extends string> = Omit<MobileSectionItem<T>, 'content'>;

type MobileSectionTabsProps<T extends string> = {
  sections: MobileSectionTab<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  locked?: boolean;
};

export function MobileSectionTabs<T extends string>({
  sections,
  value,
  onChange,
  className,
  locked = false,
}: MobileSectionTabsProps<T>) {
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  if (sections.length <= 1) return null;

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
    const idx = sections.findIndex((section) => section.id === value);
    if (idx < 0) return;
    if (dx < 0 && idx < sections.length - 1) onChange(sections[idx + 1].id);
    if (dx > 0 && idx > 0) onChange(sections[idx - 1].id);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        'shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.6rem)] pt-2 sm:px-4',
        className
      )}
    >
      <div className="grid min-h-[3.25rem] grid-flow-col auto-cols-fr gap-1 rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] p-1 shadow-sm">
        {sections.map((section) => {
          const active = section.id === value;
          const DisplayIcon = locked || section.locked ? Lock : section.Icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={cn(
                'flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-[0.8125rem] font-semibold leading-none aura-tx-colors',
                'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
                active
                  ? 'bg-primary/10 text-primary shadow-none'
                  : 'text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground active:bg-[var(--aura-action-active-bg)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <DisplayIcon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type MobileSectionViewportProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MobileSectionViewport({ children, className, contentClassName }: MobileSectionViewportProps) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>
      <div className={cn('mobile-section-scroll flex flex-col h-full min-h-0 overflow-y-auto overscroll-y-contain pb-3', contentClassName)}>
        {children}
      </div>
    </div>
  );
}

type MobilePageShellProps<T extends string> = {
  sections: MobileSectionItem<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  viewportClassName?: string;
  viewportContentClassName?: string;
  tabsClassName?: string;
  locked?: boolean;
};

export function SectionTabsLayout<T extends string>({
  sections,
  value,
  onChange,
  className,
  viewportClassName,
  viewportContentClassName,
  tabsClassName,
  locked = false,
}: MobilePageShellProps<T>) {
  const active = sections.find((section) => section.id === value) ?? sections[0];

  return (
    <div className={cn('flex h-full min-h-0 min-w-0 flex-1 flex-col bg-transparent', className)}>
      <MobileSectionViewport className={viewportClassName} contentClassName={viewportContentClassName}>
        {active?.content}
      </MobileSectionViewport>
      <MobileSectionTabs
        sections={sections.map(({ id, label, Icon, locked: sectionLocked }) => ({ id, label, Icon, locked: sectionLocked }))}
        value={active?.id ?? value}
        onChange={onChange}
        className={tabsClassName}
        locked={locked}
      />
    </div>
  );
}

export function MobilePageShell<T extends string>({
  sections,
  value,
  onChange,
  className,
  viewportClassName,
  viewportContentClassName,
  tabsClassName,
  locked = false,
}: MobilePageShellProps<T>) {
  return <SectionTabsLayout {...{ sections, value, onChange, className: cn('lg:hidden', className), viewportClassName, viewportContentClassName, tabsClassName, locked }} />;
}

export function MobilePanelHeader({
  title,
  right,
  locked = false,
  className,
}: {
  title: ReactNode;
  right?: ReactNode;
  locked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex min-h-11 items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {locked ? <Lock className="size-4 shrink-0 text-[var(--aura-text-subtle)]" aria-hidden /> : null}
        <h2 className="min-w-0 truncate text-base font-semibold leading-tight text-foreground">{title}</h2>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function MobileContentBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('aura-surface-panel rounded-lg border p-3', className)}>
      {children}
    </div>
  );
}

export function MobileListStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 flex-col gap-2.5', className)}>{children}</div>;
}
