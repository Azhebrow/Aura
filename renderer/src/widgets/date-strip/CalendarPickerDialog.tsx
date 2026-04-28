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
import { UniversalModalContent } from '@/components/ui/universal-modal';
import { cn } from '@/lib/utils';
import { dateToYmd, useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 0, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function monthCells(year: number, monthIndex: number): { d: Date; inMonth: boolean }[] {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);
  const cells: { d: Date; inMonth: boolean }[] = [];
  const cur = new Date(start);
  for (let i = 0; i < 42; i++) {
    cells.push({ d: new Date(cur), inMonth: cur.getMonth() === monthIndex });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'compact' | 'expanded';
};

type DataType = 'completion' | 'points' | 'rituals' | 'mood' | 'income' | 'expense' | 'finance' | 'calories';
type DayStatus = 'future' | 'open' | 'locked';
type DayData = { value?: number; text?: string; color?: string; fillPercent?: number; icon?: string | null };

const DATA_TYPE_STORAGE = 'calendar_data_type';
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
    const raw = localStorage.getItem(DATA_TYPE_STORAGE);
    return DATA_TYPES.some((o) => o.value === raw) ? (raw as DataType) : 'completion';
  });

  const [view, setView] = useState(() => new Date(selD.getFullYear(), selD.getMonth(), 1));

  useEffect(() => {
    if (!open) return;
    const base = parseYmd(dateString) ?? parseYmd(todayString) ?? new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, dateString, todayString]);

  const flat = useMemo(() => monthCells(view.getFullYear(), view.getMonth()), [view]);
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
    localStorage.setItem(DATA_TYPE_STORAGE, dataType);
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
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  };

  const renderGrid = (expanded: boolean) => (
    <>
      <div className={cn('grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground uppercase', expanded && 'px-3 sm:px-5')}>
        {DOW_LABELS.map((l) => (
          <div key={l} className="py-1">
            {l}
          </div>
        ))}
      </div>
      <div className={cn('min-h-0 flex-1 overflow-y-auto', expanded ? 'px-3 pb-3 sm:px-5' : '')}>
        <div className="flex flex-col gap-1">
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
                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    disabled={future || (!expanded && !inMonth)}
                    onClick={() => (inMonth || expanded) && pick(d)}
                    className={cn(
                      'relative flex rounded-lg border aura-tx-colors',
                      expanded
                        ? 'min-h-[4.6rem] flex-col px-1.5 py-1 sm:min-h-[5.2rem]'
                        : 'aspect-square items-center justify-center text-base sm:text-lg',
                      inMonth ? 'bg-card/90 border-border/60' : expanded ? 'bg-muted/35 border-border/40 text-muted-foreground' : 'pointer-events-none text-transparent',
                      !future && inMonth && 'hover:bg-muted/50',
                      isSel && 'border-primary bg-primary text-primary-foreground shadow-sm',
                      !isSel && isToday && 'ring-primary/35 ring-1',
                      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                      future && '!bg-transparent !border-border/20 !text-muted-foreground',
                      future && 'calendar-ghost-day pointer-events-none'
                    )}
                  >
                    {expanded ? (
                      <>
                        <span
                          className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md opacity-35 transition-[height] duration-aura-slow ease-aura"
                          style={{ height: `${fill}%`, backgroundColor: dd.color || 'var(--primary)' }}
                        />
                        <span className="relative z-[1] flex items-start justify-between">
                          <span className="font-mono text-xs font-semibold tabular-nums">{d.getDate()}</span>
                          <StatusIcon className="size-3.5 opacity-85" aria-hidden />
                        </span>
                        <span className="relative z-[1] mt-auto flex items-center gap-1 text-xs leading-tight">
                          <MetricIcon className="size-3.5 shrink-0 opacity-90" aria-hidden />
                          <span className="truncate">{inMonth ? dd.text || '—' : '—'}</span>
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
    </>
  );

  if (mode === 'expanded') {
    if (!open) return null;
    const TriggerIcon = TYPE_ICON[dataType];
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <section
          className={cn(
            'pointer-events-auto absolute rounded-xl bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-xl',
            'top-[3.4rem] bottom-[5.35rem] left-3 right-3',
            'md:bottom-3 md:left-[calc(15.5rem+0.75rem)]',
            'xl:left-[calc(15rem+0.75rem)]'
          )}
          aria-label="Календарь"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <header className="border-b px-3 py-3 sm:px-5">
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <h2 className="font-heading min-w-0 truncate text-center text-base font-medium capitalize">{monthTitle}</h2>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Закрыть календарь" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex justify-center">
                <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                  <SelectTrigger className="h-9 w-full max-w-[17rem]">
                    <span className="inline-flex items-center gap-2">
                      <TriggerIcon className="size-4 text-foreground opacity-85" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((t) => {
                      const Ic = TYPE_ICON[t.value];
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="inline-flex items-center gap-2">
                            <Ic className="size-3.5 text-foreground opacity-85" />
                            <span>{t.label}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </header>

            {renderGrid(true)}

            <footer className="border-t px-3 py-2.5 sm:px-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {daySummary.map((row) => {
                  const Ic = TYPE_ICON[row.type];
                  return (
                    <div key={row.type} className="bg-muted/30 flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                      <Ic className="text-foreground/85 size-3.5 shrink-0" aria-hidden />
                      <span className="min-w-0 truncate font-mono text-xs tabular-nums">{row.text}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-muted-foreground mt-2 text-center text-xs">Нельзя выбрать дату позже сегодняшней.</p>
            </footer>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <UniversalModalContent size="sm" className="flex flex-col gap-0 p-0" showCloseButton={false}>
        <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
          <div className="flex min-h-10 items-center gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div
                className="bg-muted/70 text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60"
                aria-hidden
              >
                <Calendar className="size-4" />
              </div>
              <DialogTitle className="text-left text-sm font-semibold leading-none">Выбор даты</DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="border-border/60 bg-muted/70 text-muted-foreground hover:bg-muted/90 h-8 w-8 shrink-0 rounded-md border p-0"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5 sm:py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-foreground min-w-0 flex-1 truncate text-center text-sm font-medium capitalize">{monthTitle}</span>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {renderGrid(false)}
          <p className="text-muted-foreground mt-3 text-center text-xs">Нельзя выбрать дату позже сегодняшней.</p>
        </div>
      </UniversalModalContent>
    </Dialog>
  );
}
