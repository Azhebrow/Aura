import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Lock, Moon, Sunrise } from 'lucide-react';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useShell } from '@/app/navigation/shell-context';
import { cn } from '@/lib/utils';
import type { AuraRow } from '@/types/aura';
import { MEGA_PANEL_BODY_CN } from '@/shared/ui/mega-section-layout';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { LoadingShell } from '@/shared/ui/data-states';
import { RITUAL_SEMANTIC } from '@/shared/config/aura-palette';
import { type RitualKind, loadCfg, completedSet } from './rituals-utils';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { useFormMutation } from '@/shared/hooks/use-form-mutation';
import { ActList, type ActItem } from '@/features/act-system';
import { AuraIconBadge } from '@/widgets/aura-icon/AuraIconBadge';

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
  const setStoredKind = (next: RitualKind) => {
    setKind(next);
    try { localStorage.setItem(STORAGE_KEYS.RITUALS_KIND, next); } catch { /* ignore */ }
  };

  // Optimistic toggles: keyed "m:<id>" / "e:<id>" → checked boolean.
  // Cleared when useAsyncData confirms new DB state.
  const [optimisticDone, setOptimisticDone] = useState<Record<string, boolean>>({});

  // Single source of truth — synchronous DB read, reactive to 'ritual' events.
  // NOTE: completedSet returns a Set, but JSON.stringify(Set) → "{}" so the
  // hash in useAsyncData would never change. We spread into arrays so the
  // serializer can see the actual ids and detect changes across days.
  const { data: loaded, status } = useAsyncData(
    (db) => ({
      morningRituals: loadCfg(db, 'morning'),
      eveningRituals: loadCfg(db, 'evening'),
      morningDone: [...completedSet(db, 'morning', dateString)],
      eveningDone: [...completedSet(db, 'evening', dateString)],
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

  const desktopRituals = kind === 'morning' ? morningRituals : eveningRituals;
  const desktopDone = kind === 'morning' ? morningDone : eveningDone;
  const [activeIndex, setActiveIndex] = useState(0);
  const firstOpenIndex = desktopRituals.findIndex((ritual) => !desktopDone.has(String(ritual.id)));
  const allComplete = desktopRituals.length > 0 && firstOpenIndex === -1;
  const currentIndex = allComplete ? desktopRituals.length : firstOpenIndex;
  const lastDoneIndex = desktopRituals.reduce((last, ritual, index) => (desktopDone.has(String(ritual.id)) ? index : last), -1);

  useEffect(() => {
    setActiveIndex(0);
  }, [kind, desktopRituals.length]);

  useEffect(() => {
    setActiveIndex(Math.min(currentIndex, Math.max(0, desktopRituals.length - 1)));
  }, [currentIndex, desktopRituals.length]);

  const toRitualItem = (r: AuraRow, k: RitualKind, done: Set<string>): ActItem => {
    const id = String(r.id);
    const checked = done.has(id);
    return {
      id: `${k}:${id}`,
      kind: 'ritual',
      icon: typeof r.icon === 'string' ? r.icon : null,
      iconTint: ritualColorByKind[k],
      title: String(r.title ?? r.name ?? id),
      description: typeof r.description === 'string' && r.description.trim() ? r.description : undefined,
      checked,
      state: checked ? 'done' : 'default',
      disabled: dayLocked,
      onToggle: (v) => toggle(k, id, v),
    };
  };
  const desktopItems = useMemo(
    () => desktopRituals.map((r) => toRitualItem(r, kind, desktopDone)),
    [desktopDone, desktopRituals, kind]
  );
  const activeRitual = allComplete ? null : desktopRituals[activeIndex] ?? null;
  const activeRitualId = activeRitual?.id != null ? String(activeRitual.id) : '';
  const activeDone = activeRitualId ? desktopDone.has(activeRitualId) : false;
  const completedCount = desktopRituals.reduce((sum, ritual) => sum + (desktopDone.has(String(ritual.id)) ? 1 : 0), 0);
  const isCurrentStep = activeIndex === currentIndex && !activeDone && !allComplete;
  const canStepBack = !dayLocked && lastDoneIndex >= 0;
  const canRunActive = Boolean(activeRitualId) && !dayLocked && isCurrentStep;
  const canChangeActive = canRunActive;
  const goPrev = () => {
    const previous = desktopRituals[lastDoneIndex];
    if (!previous?.id || dayLocked) return;
    setActiveIndex(lastDoneIndex);
    toggle(kind, String(previous.id), false);
  };
  const toggleActive = () => {
    if (!activeRitualId || dayLocked) return;
    if (isCurrentStep) toggle(kind, activeRitualId, true);
  };
  return (
    <>
      <div className="aura-col min-w-0">
        <div className="hidden lg:block">
          <ModeSwitchHeader
            value={kind}
            onValueChange={setStoredKind}
            ariaLabel={t('rituals.mode')}
            locked={dayLocked}
            options={modeOptions}
          />
        </div>
        <div className={cn(MEGA_PANEL_BODY_CN, 'flex flex-col gap-1.5 overflow-hidden p-3')}>
          {status === 'loading' ? (
            <LoadingShell />
          ) : desktopRituals.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('rituals.no_active_hint')}</p>
          ) : (
            <>
              {/* Desktop: single selected kind */}
              <div className="hidden min-h-0 flex-1 lg:flex lg:flex-col">
                {desktopRituals.length === 0 ? (
                  <p className="text-muted-foreground px-1 text-xs">{t('rituals.no_active')}</p>
                ) : (
                  <div
                    className={cn(
                      'group/flow relative flex min-h-0 flex-1 flex-col overflow-hidden',
                      dayLocked && 'opacity-70'
                    )}
                  >
                    {canStepBack ? (
                      <button
                        type="button"
                        className="absolute right-1 top-1 z-10 flex size-6 items-center justify-center rounded-md text-subtle opacity-0 transition-all duration-200 hover:bg-hover hover:text-foreground focus-visible:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40 group-hover/flow:opacity-100"
                        onClick={goPrev}
                        aria-label="Последний выполненный ритуал"
                      >
                        <ArrowLeft className="size-3.5" strokeWidth={1.8} />
                      </button>
                    ) : null}

                    <div
                      role="button"
                      tabIndex={canChangeActive ? 0 : -1}
                      className={cn(
                        'group flex min-h-0 flex-1 flex-col justify-center px-3 py-2 text-left outline-none aura-tx-colors',
                        canChangeActive && 'focus-visible:ring-2 focus-visible:ring-ring/50',
                        !canChangeActive && 'cursor-default'
                      )}
                      onClick={toggleActive}
                      onKeyDown={(event) => {
                        if (!canChangeActive) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleActive();
                        }
                      }}
                      aria-disabled={!canChangeActive}
                      aria-pressed={activeDone}
                    >
                      {allComplete ? (
                        <>
                          <AuraIconBadge name="check" tint={ritualColorByKind[kind]} size={8} iconSize={18} className="mb-2" />
                          <h3 className="max-w-full text-balance text-base font-semibold leading-tight text-foreground">
                            Выполнено
                          </h3>
                          <p className="mt-1 max-w-full text-balance text-xs leading-5 text-subtle">
                            Все ритуалы на сегодня закрыты.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex min-w-0 items-center gap-3">
                            <AuraIconBadge
                              name={typeof activeRitual?.icon === 'string' ? activeRitual.icon : null}
                              tint={ritualColorByKind[kind]}
                              size={7}
                              iconSize={17}
                            />
                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground">
                              {String(activeRitual?.title ?? activeRitual?.name ?? activeRitualId)}
                            </h3>
                          </div>
                          <p className="mt-1.5 line-clamp-2 max-w-full text-balance text-xs leading-5 text-subtle">
                            {typeof activeRitual?.description === 'string' && activeRitual.description.trim()
                              ? activeRitual.description
                              : activeDone
                                ? 'Этот шаг выполнен.'
                                : canRunActive
                                ? 'Нажмите, чтобы выполнить текущий шаг.'
                                : 'Этот шаг откроется по порядку.'}
                          </p>
                        </>
                      )}
                    </div>

                    {!allComplete ? (
                    <div className="mx-auto w-full shrink-0 px-1 pb-1">
                      <div className="grid h-1 gap-1" style={{ gridTemplateColumns: `repeat(${desktopRituals.length}, minmax(0, 1fr))` }}>
                        {desktopRituals.map((ritual, index) => {
                          const id = String(ritual.id);
                          const done = desktopDone.has(id);
                          const enabled = index <= currentIndex || done;
                          return (
                            <button
                              key={id}
                              type="button"
                              className={cn(
                                'h-1 rounded-full transition-all duration-300',
                                index === activeIndex
                                  ? 'bg-primary'
                                  : done
                                    ? 'bg-primary/50'
                                    : index === currentIndex
                                      ? 'bg-[color-mix(in_srgb,var(--ritual-flow-tint)_38%,var(--control))]'
                                      : 'bg-control/55',
                                enabled ? 'hover:brightness-110' : 'cursor-not-allowed opacity-45'
                              )}
                              style={{ '--ritual-flow-tint': ritualColorByKind[kind] } as React.CSSProperties}
                              onClick={() => {
                                if (enabled) setActiveIndex(index);
                              }}
                              aria-label={`Перейти к ритуалу ${index + 1}`}
                              disabled={!enabled}
                            />
                          );
                        })}
                      </div>
                    </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Mobile: both kinds, priority kind first */}
              <div className="flex flex-col gap-3 lg:hidden">
                {dayLocked ? (
                  <div className="text-muted-foreground flex items-center justify-end px-1 text-xs">
                    <Lock className="size-3.5" aria-hidden />
                  </div>
                ) : null}
                <section className="flex min-h-0 flex-col gap-1.5">
                  <p
                    className={cn(
                      'aura-operator-kpi inline-flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider',
                      dayLocked && 'opacity-85'
                    )}
                    style={{ color: ritualColorByKind[kind] }}
                  >
                    {dayLocked ? <Lock className="size-3" aria-hidden /> : null}
                    {kind === 'morning' ? t('rituals.morning') : t('rituals.evening')}
                  </p>
                  <ActList
                    items={desktopRituals.map((r) => toRitualItem(r, kind, desktopDone))}
                    className={cn(dayLocked && 'pointer-events-none opacity-55')}
                  />
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
