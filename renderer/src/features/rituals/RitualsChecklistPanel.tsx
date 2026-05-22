import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Moon, Sunrise } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useShell } from '@/app/navigation/shell-context';
import { cn } from '@/lib/utils';
import type { AuraRow } from '@/types/aura';
import { LIST_CONTENT_CN, MEGA_PANEL_BODY_CN } from '@/shared/ui/mega-section-layout';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { LoadingShell } from '@/shared/ui/data-states';
import { RITUAL_SEMANTIC } from '@/shared/config/aura-palette';
import { type RitualKind, loadCfg, completedSet } from './rituals-utils';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { useFormMutation } from '@/shared/hooks/use-form-mutation';

type RitualChecklistRowProps = {
  icon: string | null;
  color: string;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function RitualChecklistRow({
  icon,
  color,
  title,
  description,
  checked,
  onCheckedChange,
}: RitualChecklistRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--ritual-color)]/35',
        'group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[var(--aura-border-soft)] px-2.5 py-2 text-left aura-tx-colors',
        'bg-transparent hover:bg-[var(--aura-action-hover-bg)]',
        checked && 'opacity-75'
      )}
      style={{ ['--ritual-color' as string]: color }}
      aria-pressed={checked}
    >
      <IconWithBadge
        iconName={icon}
        tint={color}
        size="sm"
        className={cn('bg-transparent shadow-none', checked && 'opacity-65')}
      />
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-sm font-semibold leading-tight text-foreground',
            checked && 'text-[var(--aura-text-subtle)] line-through decoration-[var(--ritual-color)]/55 decoration-1'
          )}
        >
          {title}
        </span>
        {description ? (
          <span
            className={cn(
              'mt-0.5 block truncate text-xs leading-snug text-[var(--aura-text-muted)]',
              checked && 'text-[var(--aura-text-disabled)] line-through decoration-[var(--ritual-color)]/45'
            )}
          >
            {description}
          </span>
        ) : null}
      </span>
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c === true)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'size-7 rounded-lg border border-[var(--aura-border-soft)] bg-transparent shadow-none after:hidden',
          'hover:bg-[var(--aura-action-hover-bg)]',
          'data-checked:border-transparent data-checked:bg-[var(--ritual-color)] data-checked:text-white data-checked:shadow-none [&_[data-slot=checkbox-indicator]>svg]:size-4'
        )}
        aria-label={title}
      />
    </div>
  );
}

function isRitualKind(value: unknown): value is RitualKind {
  return value === 'morning' || value === 'evening';
}

function readStoredRitualKind(): RitualKind | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RITUALS_KIND);
    return isRitualKind(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function RitualsChecklistPanel() {
  const { t } = useTranslation('common');
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const { activePageId } = useShell();
  const dayLocked = useDayLocked(db, Boolean(db), dateString);

  const [kind, setKind] = useState<RitualKind>(() => readStoredRitualKind() ?? 'morning');

  // Optimistic toggles: keyed "m:<id>" / "e:<id>" → checked boolean.
  // Cleared when useAsyncData confirms new DB state.
  const [optimisticDone, setOptimisticDone] = useState<Record<string, boolean>>({});

  // Single source of truth — synchronous DB read, reactive to 'ritual' events.
  const { data: loaded, status } = useAsyncData(
    (db) => ({
      morningRituals: loadCfg(db, 'morning'),
      eveningRituals: loadCfg(db, 'evening'),
      morningDone: completedSet(db, 'morning', dateString),
      eveningDone: completedSet(db, 'evening', dateString),
    }),
    [dateString],
    { events: ['ritual'] }
  );

  // Once DB confirms new state, discard optimistic overrides.
  useEffect(() => {
    setOptimisticDone({});
  }, [loaded]);

  // Read localStorage kind whenever the page becomes active (set by home card navigation).
  useEffect(() => {
    const stored = readStoredRitualKind();
    if (stored) setKind(stored);
  }, [activePageId]);

  useEffect(() => {
    const onIntent = (event: Event) => {
      const next = (event as CustomEvent<{ kind?: unknown }>).detail?.kind;
      if (isRitualKind(next)) setKind(next);
    };
    window.addEventListener(STORAGE_KEYS.RITUALS_KIND_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(STORAGE_KEYS.RITUALS_KIND_INTENT_EVENT, onIntent);
  }, []);

  const { submit: toggleRitual } = useFormMutation(
    (payload: { kind: RitualKind; ritualId: string; checked: boolean }) => {
      const db = window.getDB?.();
      if (!db || dayLocked) return;
      if (payload.kind === 'morning') db.saveRitualMorning(dateString, payload.ritualId, payload.checked);
      else db.saveRitualEvening(dateString, payload.ritualId, payload.checked);
    },
    { eventType: 'ritual', eventDate: dateString }
  );

  const toggle = (k: RitualKind, ritualId: string, checked: boolean) => {
    if (dayLocked) return;
    const prefix = k === 'morning' ? 'm:' : 'e:';
    setOptimisticDone((prev) => ({ ...prev, [`${prefix}${ritualId}`]: checked }));
    toggleRitual({ kind: k, ritualId, checked });
  };

  const morningDone = useMemo(() => {
    const base = new Set(loaded?.morningDone ?? []);
    for (const [key, val] of Object.entries(optimisticDone)) {
      if (!key.startsWith('m:')) continue;
      const id = key.slice(2);
      if (val) base.add(id); else base.delete(id);
    }
    return base;
  }, [loaded?.morningDone, optimisticDone]);

  const eveningDone = useMemo(() => {
    const base = new Set(loaded?.eveningDone ?? []);
    for (const [key, val] of Object.entries(optimisticDone)) {
      if (!key.startsWith('e:')) continue;
      const id = key.slice(2);
      if (val) base.add(id); else base.delete(id);
    }
    return base;
  }, [loaded?.eveningDone, optimisticDone]);

  const ritualColorByKind: Record<RitualKind, string> = useMemo(
    () => ({ morning: RITUAL_SEMANTIC.morning, evening: RITUAL_SEMANTIC.evening }),
    []
  );

  const modeOptions = useMemo(
    () => [
      {
        value: 'morning' as const,
        label: t('rituals.morning'),
        icon: dayLocked
          ? <Lock className="size-3.5 shrink-0" aria-hidden />
          : <Sunrise className="size-3.5 shrink-0" aria-hidden />,
      },
      {
        value: 'evening' as const,
        label: t('rituals.evening'),
        icon: dayLocked
          ? <Lock className="size-3.5 shrink-0" aria-hidden />
          : <Moon className="size-3.5 shrink-0" aria-hidden />,
      },
    ],
    [dayLocked, t]
  );

  const morningRituals: AuraRow[] = loaded?.morningRituals ?? [];
  const eveningRituals: AuraRow[] = loaded?.eveningRituals ?? [];

  const orderedSections: Array<{ kind: RitualKind; title: string; rituals: AuraRow[]; done: Set<string> }> =
    kind === 'morning'
      ? [
          { kind: 'morning', title: t('rituals.morning'), rituals: morningRituals, done: morningDone },
          { kind: 'evening', title: t('rituals.evening'), rituals: eveningRituals, done: eveningDone },
        ]
      : [
          { kind: 'evening', title: t('rituals.evening'), rituals: eveningRituals, done: eveningDone },
          { kind: 'morning', title: t('rituals.morning'), rituals: morningRituals, done: morningDone },
        ];

  const desktopRituals = kind === 'morning' ? morningRituals : eveningRituals;
  const desktopDone = kind === 'morning' ? morningDone : eveningDone;

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden lg:block">
          <ModeSwitchHeader
            value={kind}
            onValueChange={setKind}
            ariaLabel={t('rituals.mode')}
            locked={dayLocked}
            options={modeOptions}
          />
        </div>
        <div className={cn(MEGA_PANEL_BODY_CN, 'flex flex-col gap-2')}>
          {status === 'loading' ? (
            <LoadingShell />
          ) : orderedSections.every((s) => s.rituals.length === 0) ? (
            <p className="text-muted-foreground text-sm">{t('rituals.no_active_hint')}</p>
          ) : (
            <>
              {/* Desktop: single selected kind */}
              <div className="hidden lg:block">
                {desktopRituals.length === 0 ? (
                  <p className="text-muted-foreground px-1 text-xs">{t('rituals.no_active')}</p>
                ) : (
                  <ul className={cn(LIST_CONTENT_CN, 'sm:gap-2', dayLocked && 'pointer-events-none opacity-55')}>
                    {desktopRituals.map((r) => {
                          const id = String(r.id);
                          const isDone = desktopDone.has(id);
                          return (
                            <li key={id}>
                              <RitualChecklistRow
                                icon={typeof r.icon === 'string' ? r.icon : null}
                                color={ritualColorByKind[kind]}
                                title={String(r.title ?? r.name ?? id)}
                                description={typeof r.description === 'string' && r.description.trim() ? r.description : undefined}
                                checked={isDone}
                                onCheckedChange={(v) => toggle(kind, id, v)}
                              />
                            </li>
                          );
                        })}
                  </ul>
                )}
              </div>

              {/* Mobile: both kinds, priority kind first */}
              <div className="flex flex-col gap-3 lg:hidden">
                {dayLocked ? (
                  <div className="text-muted-foreground flex items-center justify-end px-1 text-xs">
                    <Lock className="size-3.5" aria-hidden />
                  </div>
                ) : null}
                {orderedSections.map((section) => (
                  <section key={section.kind} className="flex min-h-0 flex-col gap-1.5">
                    <p
                      className={cn(
                        'inline-flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider',
                        dayLocked && 'opacity-85'
                      )}
                      style={{ color: ritualColorByKind[section.kind] }}
                    >
                      {dayLocked ? <Lock className="size-3" aria-hidden /> : null}
                      {section.title}
                    </p>
                    {section.rituals.length === 0 ? (
                      <p className="text-muted-foreground px-1 text-xs">{t('rituals.no_active')}</p>
                    ) : (
                      <ul className={cn(LIST_CONTENT_CN, 'sm:gap-2', dayLocked && 'pointer-events-none opacity-55')}>
                        {section.rituals.map((r) => {
                          const id = String(r.id);
                          const isDone = section.done.has(id);
                          return (
                            <li key={id}>
                              <RitualChecklistRow
                                icon={typeof r.icon === 'string' ? r.icon : null}
                                color={ritualColorByKind[section.kind]}
                                title={String(r.title ?? r.name ?? id)}
                                checked={isDone}
                                onCheckedChange={(v) => toggle(section.kind, id, v)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
