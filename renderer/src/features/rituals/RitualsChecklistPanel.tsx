import { useEffect, useMemo, useState } from 'react';
import { Lock, Moon, Sunrise } from 'lucide-react';
import { ListItem } from '@/components/ui/list-item';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useRitualsCache } from '@/shared/hooks/use-rituals-cache';
import { useShell } from '@/app/navigation/shell-context';
import { cn } from '@/lib/utils';
import type { AuraRow } from '@/types/aura';
import { LIST_CONTENT_CN, MEGA_PANEL_BODY_CN } from '@/shared/ui/mega-section-layout';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { AURA_DATA_CHANGED } from '@/shared/lib/aura-data-events';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { LoadingShell } from '@/shared/ui/data-states';
import { RITUAL_SEMANTIC } from '@/shared/design/aura-palette';
import { ANIM } from '@/shared/lib/animation-classes';
import { type RitualKind, loadCfg, completedSet } from './rituals-utils';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { useFormMutation } from '@/shared/hooks/use-form-mutation';

export function RitualsChecklistPanel() {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const { activePageId } = useShell();
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const { getCached, setCached, invalidate } = useRitualsCache(dateString);
  const [kind, setKind] = useState<RitualKind>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.RITUALS_KIND);
    if (stored === 'morning' || stored === 'evening') {
      localStorage.removeItem(STORAGE_KEYS.RITUALS_KIND);
      console.log(`[RitualsChecklistPanel] initialized kind=${stored} from localStorage`);
      return stored;
    }
    return 'morning';
  });
  const [priorityKind, setPriorityKind] = useState<RitualKind>('morning');

  console.log(`[RitualsChecklistPanel] render: kind=${kind}, activePageId=${activePageId}`);
  const cache = getCached();
  const [morningRituals, setMorningRituals] = useState<AuraRow[]>(cache?.morning ?? []);
  const [eveningRituals, setEveningRituals] = useState<AuraRow[]>(cache?.evening ?? []);
  const [morningDone, setMorningDone] = useState<Set<string>>(cache?.morningDone ?? new Set());
  const [eveningDone, setEveningDone] = useState<Set<string>>(cache?.eveningDone ?? new Set());
  const { data: loaded, status } = useAsyncData(
    (db) => ({
      morningRituals: cache?.morning ?? loadCfg(db, 'morning'),
      eveningRituals: cache?.evening ?? loadCfg(db, 'evening'),
      morningDone: cache?.morningDone ?? completedSet(db, 'morning', dateString),
      eveningDone: cache?.eveningDone ?? completedSet(db, 'evening', dateString),
    }),
    [dateString],
    { events: ['ritual'] }
  );
  const loadedMorningRituals = loaded?.morningRituals ?? [];
  const loadedEveningRituals = loaded?.eveningRituals ?? [];
  const loadedMorningDone = loaded?.morningDone ?? new Set<string>();
  const loadedEveningDone = loaded?.eveningDone ?? new Set<string>();
  const ritualColorByKind = useMemo(
    () => ({
      morning: RITUAL_SEMANTIC.morning,
      evening: RITUAL_SEMANTIC.evening,
    }),
    []
  );
  const { submit: toggleRitual } = useFormMutation(
    (payload: { kind: RitualKind; ritualId: string; checked: boolean }) => {
      const db = window.getDB?.();
      if (!db) return;
      if (dayLocked) return;
      if (payload.kind === 'morning') db.saveRitualMorning(dateString, payload.ritualId, payload.checked);
      else db.saveRitualEvening(dateString, payload.ritualId, payload.checked);
    },
    { eventType: 'ritual' }
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RITUALS_KIND);
      console.log(`[RitualsChecklistPanel effect] activePageId=${activePageId}, raw=${raw}`);
      if (raw === 'morning' || raw === 'evening') {
        console.log(`[RitualsChecklistPanel] Setting kind to ${raw}`);
        setKind(raw as RitualKind);
        console.log(`[RitualsChecklistPanel] Setting priorityKind to ${raw}`);
        setPriorityKind(raw as RitualKind);
        localStorage.removeItem(STORAGE_KEYS.RITUALS_KIND);
        console.log(`[RitualsChecklistPanel] Successfully switched to ${raw} mode`);
      } else {
        console.log(`[RitualsChecklistPanel] No RITUALS_KIND in localStorage`);
      }
    } catch (e) {
      console.error(`[RitualsChecklistPanel] Error:`, e);
    }
  }, [activePageId]);

  useEffect(() => {
    if (!loaded) return;
    setMorningRituals(loadedMorningRituals);
    setEveningRituals(loadedEveningRituals);
    setMorningDone(loadedMorningDone);
    setEveningDone(loadedEveningDone);
    setCached({
      morning: loadedMorningRituals,
      evening: loadedEveningRituals,
      morningDone: loadedMorningDone,
      eveningDone: loadedEveningDone,
    });
  }, [loaded, loadedMorningRituals, loadedEveningRituals, loadedMorningDone, loadedEveningDone, setCached]);


  useEffect(() => {
    const onData = (ev: Event) => {
      const t = (ev as CustomEvent<{ type?: string }>).detail?.type;
      if (t === 'ritual') {
        invalidate();
      }
    };
    window.addEventListener(AURA_DATA_CHANGED, onData);
    return () => window.removeEventListener(AURA_DATA_CHANGED, onData);
  }, [invalidate]);

  const toggle = (kind: RitualKind, ritualId: string, checked: boolean) => {
    if (dayLocked) return;
    toggleRitual({ kind, ritualId, checked });
    if (kind === 'morning') {
      setMorningDone((prev) => {
        const next = new Set(prev);
        if (checked) next.add(ritualId);
        else next.delete(ritualId);
        return next;
      });
      return;
    }
    setEveningDone((prev) => {
      const next = new Set(prev);
      if (checked) next.add(ritualId);
      else next.delete(ritualId);
      return next;
    });
  };

  const orderedSections: Array<{ kind: RitualKind; title: string; rituals: AuraRow[]; done: Set<string> }> =
    priorityKind === 'morning'
      ? [
          { kind: 'morning', title: 'Утро', rituals: morningRituals, done: morningDone },
          { kind: 'evening', title: 'Вечер', rituals: eveningRituals, done: eveningDone },
        ]
      : [
          { kind: 'evening', title: 'Вечер', rituals: eveningRituals, done: eveningDone },
          { kind: 'morning', title: 'Утро', rituals: morningRituals, done: morningDone },
        ];
  const desktopRituals = useMemo(() => (kind === 'morning' ? morningRituals : eveningRituals), [kind, morningRituals, eveningRituals]);
  const desktopDone = useMemo(() => (kind === 'morning' ? morningDone : eveningDone), [kind, morningDone, eveningDone]);

  const modeOptions = useMemo(
    () => {
      console.log(`[RitualsChecklistPanel] modeOptions memo computed, dayLocked=${dayLocked}`);
      return [
        { value: 'morning' as const, label: 'Утро', icon: dayLocked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : <Sunrise className="size-3.5 shrink-0" aria-hidden /> },
        { value: 'evening' as const, label: 'Вечер', icon: dayLocked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : <Moon className="size-3.5 shrink-0" aria-hidden /> },
      ];
    },
    [dayLocked]
  );

  console.log(`[RitualsChecklistPanel] About to render ModeSwitchHeader: kind=${kind}, options length=${modeOptions.length}`);

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden lg:block">
          <ModeSwitchHeader
            value={kind}
            onValueChange={setKind}
            ariaLabel="Режим ритуалов"
            locked={dayLocked}
            options={modeOptions}
          />
        </div>
        <div className={cn(MEGA_PANEL_BODY_CN, 'flex flex-col gap-2', ANIM.enterFade)}>
          {status === 'loading' ? (
            <LoadingShell />
          ) : orderedSections.every((section) => section.rituals.length === 0) ? (
            <p className="text-muted-foreground text-sm">Нет активных ритуалов. Добавьте их в настройках.</p>
          ) : (
            <>
              <div className="hidden lg:block">
                {desktopRituals.length === 0 ? (
                  <p className="text-muted-foreground px-1 text-xs">Нет активных ритуалов</p>
                ) : (
                  <ul className={cn(LIST_CONTENT_CN, 'sm:gap-2', dayLocked && 'pointer-events-none opacity-55')}>
                    {desktopRituals.map((r) => {
                      const id = String(r.id);
                      const label = String(r.title ?? r.name ?? id);
                      const isDone = desktopDone.has(id);
                      const ritualColor = ritualColorByKind[kind];
                      return (
                        <li key={id}>
                          <ListItem
                            mode="checkbox"
                            icon={typeof r.icon === 'string' ? r.icon : null}
                            iconTint={ritualColor}
                            title={label}
                              description={typeof r.description === 'string' && r.description.trim() ? r.description : undefined}
                              checked={isDone}
                              onCheckedChange={(v) => toggle(kind, id, v)}
                              isDone={isDone}
                            />
                          </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-3 lg:hidden">
                {dayLocked ? (
                  <div className="text-muted-foreground flex items-center justify-end px-1 text-xs">
                    <Lock className="size-3.5" aria-hidden />
                  </div>
                ) : null}
                {orderedSections.map((section) => (
                  <section key={section.kind} className="flex min-h-0 flex-col gap-1.5">
                    <p
                      className={cn('px-1 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5', dayLocked && 'opacity-85')}
                      style={{ color: ritualColorByKind[section.kind] }}
                    >
                      {dayLocked ? <Lock className="size-3" aria-hidden /> : null}
                      {section.title}
                    </p>
                    {section.rituals.length === 0 ? (
                      <p className="text-muted-foreground px-1 text-xs">Нет активных ритуалов</p>
                    ) : (
                      <ul className={cn(LIST_CONTENT_CN, 'sm:gap-2', dayLocked && 'pointer-events-none opacity-55')}>
                        {section.rituals.map((r) => {
                          const id = String(r.id);
                          const label = String(r.title ?? r.name ?? id);
                          const isDone = section.done.has(id);
                          const ritualColor = ritualColorByKind[section.kind];
                          return (
                            <li key={id}>
                              <ListItem
                                mode="checkbox"
                                icon={typeof r.icon === 'string' ? r.icon : null}
                                iconTint={ritualColor}
                                title={label}
                                description={undefined}
                                className="border-border/70 bg-card/85 py-1.5"
                                checked={isDone}
                                onCheckedChange={(v) => toggle(section.kind, id, v)}
                                isDone={isDone}
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
