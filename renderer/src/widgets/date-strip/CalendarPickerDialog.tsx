import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lock,
  Pencil,
  Smile,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UNIVERSAL_MODAL_INSET_BODY_CN, UniversalModalContent } from '@/components/ui/universal-modal';
import { cn } from '@/lib/utils';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { dateToYmd, monthCells, parseYmd } from '@/shared/lib/calendar-date';

const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'compact' | 'expanded';
};

type DataType = 'completion' | 'points' | 'rituals' | 'mood' | 'income' | 'expense' | 'finance' | 'calories';
type DayStatus = 'future' | 'open' | 'locked';
type DayData = { value?: number; text?: string; color?: string; fillPercent?: number; icon?: string | null };

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: 'completion', label: 'Прогресс' },
  { value: 'points', label: 'Очки' },
  { value: 'rituals', label: 'Ритуалы' },
  { value: 'mood', label: 'Настроение' },
  { value: 'income', label: 'Доходы' },
  { value: 'expense', label: 'Расходы' },
  { value: 'finance', label: 'Финансы' },
  { value: 'calories', label: 'Калории' },
];

const TYPE_ICON = {
  completion: Target,
  points: Award,
  rituals: Sun,
  mood: Smile,
  income: ArrowUp,
  expense: ArrowDown,
  finance: Banknote,
  calories: Flame,
} as const;

type LegacyPointsApi = {
  getDayData: (date: string, type: DataType, monthData?: unknown) => DayData;
  getMonthRange: (year: number, month: number, type: DataType) => unknown;
  isDayOpen: (date: string) => boolean;
  isFutureDay: (date: string) => boolean;
};

export function CalendarPickerDialog({ open, onOpenChange, mode = 'compact' }: Props) {
  const { dateString, setDateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const todayD = parseYmd(todayString);
  const selD = parseYmd(dateString) ?? todayD ?? new Date();
  const [dataType, setDataType] = useState<DataType>(() => {
    if (typeof localStorage === 'undefined') return 'completion';
    const raw = localStorage.getItem(STORAGE_KEYS.CALENDAR_DATA_TYPE);
    return DATA_TYPES.some((o) => o.value === raw) ? (raw as DataType) : 'completion';
  });

  const [view, setView] = useState(() => new Date(selD.getFullYear(), selD.getMonth(), 1));

  useEffect(() => {
    if (!open) return;
    const base = parseYmd(dateString) ?? parseYmd(todayString) ?? new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, dateString, todayString]);

  const flat = useMemo(() => monthCells(view.getFullYear(), view.getMonth(), { fixedSixWeeks: true }), [view]);
  const weeks = useMemo(() => {
    const w: (typeof flat)[] = [];
    for (let i = 0; i < flat.length; i += 7) {
      w.push(flat.slice(i, i + 7));
    }
    return w;
  }, [flat]);

  const monthTitle = useMemo(
    () =>
      view.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    [view]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_DATA_TYPE, dataType);
  }, [dataType]);

  const pointsApi = useMemo<LegacyPointsApi | null>(() => {
    if (!db) return null;
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor) return null;
    try {
      return new Ctor(db) as unknown as LegacyPointsApi;
    } catch {
      return null;
    }
  }, [db]);

  const monthData = useMemo(() => {
    if (!pointsApi) return null;
    if (!['income', 'expense', 'mood', 'points', 'finance', 'calories'].includes(dataType)) return null;
    return pointsApi.getMonthRange(view.getFullYear(), view.getMonth() + 1, dataType);
  }, [pointsApi, dataType, view]);

  const getDayStatus = (d: Date): DayStatus => {
    const ymd = dateToYmd(d);
    if (pointsApi) {
      if (pointsApi.isFutureDay(ymd)) return 'future';
      return pointsApi.isDayOpen(ymd) ? 'open' : 'locked';
    }
    if (todayD && d.getTime() > todayD.getTime()) return 'future';
    return 'open';
  };

  const getDayData = (d: Date): DayData => {
    if (!pointsApi) return { value: 0, text: '—', color: 'var(--primary)', fillPercent: 0 };
    try {
      return pointsApi.getDayData(dateToYmd(d), dataType, monthData ?? undefined) ?? {};
    } catch {
      return { value: 0, text: '—', color: 'var(--primary)', fillPercent: 0 };
    }
  };

  const daySummary = useMemo(() => {
    if (!pointsApi) return [] as { type: DataType; text: string }[];
    return DATA_TYPES.map((it) => {
      const row = pointsApi.getDayData(dateString, it.value);
      return { type: it.value, text: row?.text || '—' };
    });
  }, [pointsApi, dateString]);

  const pick = (d: Date) => {
    const ymd = dateToYmd(d);
    if (todayD && d.getTime() > todayD.getTime()) return;
    setDateString(ymd);
    if (mode !== 'expanded') onOpenChange(false);
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const next = new Date(v);
      next.setMonth(next.getMonth() + delta, 1);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const goToday = () => {
    const base = todayD ?? new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    pick(base);
  };

  const renderGrid = (expanded: boolean) => (
    <div className={cn('flex min-h-0 flex-1 flex-col', expanded ? 'px-3 pb-3 sm:px-4' : '')}>
      <div className={cn('grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-faint', expanded && 'px-1')}>
        {DOW_LABELS.map((l) => (
          <div key={l} className="py-1.5">
            {l}
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn('grid h-full grid-rows-6 gap-1', !expanded && 'aspect-square h-auto')}>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map(({ d, inMonth }, di) => {
                const ymd = dateToYmd(d);
                const isSel = ymd === dateString;
                const isToday = ymd === todayString;
                const status = getDayStatus(d);
                const future = status === 'future';
                const dd = getDayData(d);
                const StatusIcon = status === 'future' ? Calendar : status === 'open' ? Pencil : Lock;
                const MetricIcon = TYPE_ICON[dataType];
                const fill = Math.max(0, Math.min(100, Number(dd.fillPercent ?? dd.value ?? 0)));
                const canSelect = !future && (expanded || inMonth);
                const tint = isSel ? 'currentColor' : dd.color || 'var(--primary)';
                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => canSelect && pick(d)}
                    className={cn(
                      'group/day relative flex min-w-0 overflow-hidden rounded-lg aura-tx-colors outline-none',
                      expanded
                        ? 'min-h-[4.9rem] flex-col bg-card/55 px-2 py-1.5 sm:min-h-[5.25rem]'
                        : 'aspect-square items-center justify-center bg-card/55 text-sm font-semibold sm:text-base',
                      inMonth ? 'text-foreground' : expanded ? 'text-faint opacity-55' : 'pointer-events-none text-transparent opacity-0',
                      canSelect && 'hover:bg-hover',
                      isSel && 'bg-foreground text-background shadow-sm hover:bg-foreground',
                      !isSel && isToday && 'ring-1 ring-inset ring-foreground/35',
                      'focus-visible:ring-2 focus-visible:ring-ring/70',
                      future && '!bg-transparent !text-faint opacity-35',
                      future && 'calendar-ghost-day pointer-events-none'
                    )}
                  >
                    {expanded ? (
                      <>
                        <span
                          className={cn(
                            'aura-data-fill aura-operator-list-meter pointer-events-none absolute inset-x-0 bottom-0 opacity-30 transition-[height] duration-aura-slow ease-aura',
                            isSel && 'opacity-20'
                          )}
                          style={{ height: `${fill}%`, backgroundColor: tint }}
                        />
                        <span className="relative z-[1] flex min-w-0 items-start justify-between gap-1">
                          <span className="text-xs font-bold tabular-nums">{d.getDate()}</span>
                          <StatusIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        </span>
                        <span className="aura-operator-kpi relative z-[1] mt-auto flex min-w-0 items-center gap-1 text-xs font-semibold leading-tight">
                          <MetricIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                          <span className="min-w-0 truncate tabular-nums">{inMonth ? dd.text || '—' : '—'}</span>
                        </span>
                      </>
                    ) : (
                      <>{inMonth ? d.getDate() : ''}</>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (mode === 'expanded') {
    if (!open) return null;
    const TriggerIcon = TYPE_ICON[dataType];
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <section
          className={cn(
            'pointer-events-auto absolute overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10',
            'top-[3.4rem] bottom-[5.35rem] left-3 right-3',
            'md:bottom-3 md:left-[calc(15.5rem+0.75rem)]',
            'xl:left-[calc(15rem+0.75rem)]'
          )}
          aria-label="Календарь"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <header className="aura-card-section-header shrink-0 border-b border-soft bg-panel/70 px-3 py-2.5 sm:px-4">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="size-5" />
                </Button>
                <div className="min-w-0 text-center">
                  <h2 className="font-heading truncate text-base font-semibold capitalize leading-tight">{monthTitle}</h2>
                  <button type="button" className="mt-0.5 text-xs font-medium text-dim hover:text-foreground" onClick={goToday}>
                    Сегодня
                  </button>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
                    <ChevronRight className="size-5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Закрыть календарь" onClick={() => onOpenChange(false)}>
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                  <SelectTrigger className="h-9 w-full">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <TriggerIcon className="size-4 shrink-0 opacity-85" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((t) => {
                      const Ic = TYPE_ICON[t.value];
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="inline-flex items-center gap-2">
                            <Ic className="size-3.5 opacity-85" />
                            <span>{t.label}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <div className="hidden items-center gap-1 text-xs font-medium text-dim sm:flex">
                  <Lock className="size-3.5" />
                  <span>прошлые дни закрыты</span>
                </div>
              </div>
            </header>

            {renderGrid(true)}

            <footer className="shrink-0 border-t border-soft bg-panel/45 px-3 py-2.5 sm:px-4">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {daySummary.map((row) => {
                  const Ic = TYPE_ICON[row.type];
                  return (
                    <div key={row.type} className="flex min-w-0 items-center gap-2 rounded-md bg-control/45 px-2 py-1.5">
                      <Ic className="size-3.5 shrink-0 opacity-75" aria-hidden />
                      <span className="min-w-0 truncate text-xs font-semibold tabular-nums">{row.text}</span>
                    </div>
                  );
                })}
              </div>
            </footer>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <UniversalModalContent size="sm" className="flex max-h-[min(42rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="shrink-0 border-b border-soft bg-panel/70 px-3 py-2.5 sm:px-4">
          <div className="grid min-h-10 grid-cols-[auto_1fr_auto] items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="size-5" />
            </Button>
            <div className="min-w-0 text-center">
              <DialogTitle className="font-heading truncate text-base font-semibold capitalize leading-tight">{monthTitle}</DialogTitle>
              <button type="button" className="mt-0.5 text-xs font-medium text-dim hover:text-foreground" onClick={goToday}>
                Сегодня
              </button>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
                <ChevronRight className="size-5" />
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Закрыть календарь">
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        <div className={cn(UNIVERSAL_MODAL_INSET_BODY_CN, 'flex min-h-0 flex-col px-3 py-3 sm:px-4 sm:py-4')}>
          {renderGrid(false)}
          <p className="mt-3 text-center text-xs font-medium text-dim">Будущие даты недоступны.</p>
        </div>
      </UniversalModalContent>
    </Dialog>
  );
}
