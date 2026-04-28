import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUp, Award, Banknote, Calendar, ChevronLeft, ChevronRight, Flame, Lock, Pencil, Smile, Sun, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { useSelectedDate, dateToYmd } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { cn } from '@/lib/utils';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';

type DataType = 'completion' | 'points' | 'rituals' | 'mood' | 'income' | 'expense' | 'finance' | 'calories';
type DayStatus = 'future' | 'open' | 'locked';
type DayData = { value?: number; text?: string; color?: string; fillPercent?: number; icon?: string | null };
type DataTypeMeta = { value: DataType; label: string; accentClass: string };

type LegacyPointsApi = {
  getDayData: (date: string, type: DataType, monthData?: unknown) => DayData;
  getMonthRange: (year: number, month: number, type: DataType) => unknown;
  isDayOpen: (date: string) => boolean;
  isFutureDay: (date: string) => boolean;
};

const DATA_TYPE_STORAGE = 'calendar_data_type';
const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
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

const DATA_TYPE_META: Record<DataType, DataTypeMeta> = {
  completion: { value: 'completion', label: 'Прогресс', accentClass: 'text-muted-foreground' },
  points: { value: 'points', label: 'Очки', accentClass: 'text-muted-foreground' },
  rituals: { value: 'rituals', label: 'Ритуалы', accentClass: 'text-muted-foreground' },
  mood: { value: 'mood', label: 'Настроение', accentClass: 'text-muted-foreground' },
  income: { value: 'income', label: 'Доходы', accentClass: 'text-muted-foreground' },
  expense: { value: 'expense', label: 'Расходы', accentClass: 'text-muted-foreground' },
  finance: { value: 'finance', label: 'Финансы', accentClass: 'text-muted-foreground' },
  calories: { value: 'calories', label: 'Калории', accentClass: 'text-muted-foreground' },
};

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

function monthCells(year: number, monthIndex: number): { d: Date; inMonth: boolean }[] {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells: { d: Date; inMonth: boolean }[] = [];
  const cur = new Date(start);
  for (let i = 0; i < total; i++) {
    cells.push({ d: new Date(cur), inMonth: cur.getMonth() === monthIndex });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

export function CalendarPage() {
  const { dateString, setDateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const todayD = parseYmd(todayString);
  const selectedDate = parseYmd(dateString) ?? todayD ?? new Date();
  const [view, setView] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [dataType, setDataType] = useState<DataType>(() => {
    if (typeof localStorage === 'undefined') return 'completion';
    const raw = localStorage.getItem(DATA_TYPE_STORAGE);
    return DATA_TYPES.some((o) => o.value === raw) ? (raw as DataType) : 'completion';
  });

  useEffect(() => {
    const base = parseYmd(dateString) ?? parseYmd(todayString) ?? new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [dateString, todayString]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
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

  const flat = useMemo(() => monthCells(view.getFullYear(), view.getMonth()), [view]);
  const weeks = useMemo(() => {
    const w: (typeof flat)[] = [];
    for (let i = 0; i < flat.length; i += 7) w.push(flat.slice(i, i + 7));
    return w;
  }, [flat]);

  const monthTitle = useMemo(
    () => view.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    [view]
  );

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
    return DATA_TYPES.map((it) => ({ type: it.value, text: pointsApi.getDayData(dateString, it.value)?.text || '—' }));
  }, [pointsApi, dateString]);

  /** Нормализация бара: относительно текущих видимых ячеек (не будущих), а не fixed 0..100. */
  const relativeFillByYmd = useMemo(() => {
    const rows = flat.map(({ d, inMonth }) => {
      const ymd = dateToYmd(d);
      const status = getDayStatus(d);
      const future = status === 'future';
      const dayData = getDayData(d);
      const rawValue =
        Number.isFinite(Number(dayData.value)) && dayData.value != null
          ? Number(dayData.value)
          : Number.isFinite(Number(dayData.fillPercent)) && dayData.fillPercent != null
            ? Number(dayData.fillPercent)
            : 0;
      return {
        ymd,
        eligible: inMonth && !future,
        value: Math.abs(rawValue),
      };
    });

    const maxVisible = rows.reduce((max, row) => (row.eligible ? Math.max(max, row.value) : max), 0);
    const map = new Map<string, number>();
    for (const row of rows) {
      if (!row.eligible || maxVisible <= 0) {
        map.set(row.ymd, 0);
      } else {
        map.set(row.ymd, Math.max(0, Math.min(100, (row.value / maxVisible) * 100)));
      }
    }
    return map;
  }, [flat, dataType, monthData, pointsApi, view, todayString]);

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
          <MegaPanelHeader
            title="Календарь"
            right={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg border-border/80 bg-background/80 px-2.5 text-[11px] font-medium sm:px-3 sm:text-sm"
                onClick={() => {
                  const base = parseYmd(todayString) ?? new Date();
                  setView(new Date(base.getFullYear(), base.getMonth(), 1));
                  setDateString(todayString);
                }}
              >
                Сегодня
              </Button>
            }
          />
          <div className="border-border/70 bg-muted/10 flex items-start justify-between gap-2 border-b px-2.5 py-2 sm:px-4 sm:py-2.5">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/75 bg-background/85 px-1 py-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Предыдущий месяц" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="font-heading min-w-[8.5rem] truncate px-1.5 text-center text-xs font-semibold capitalize tracking-tight sm:min-w-[12rem] sm:px-2 sm:text-base">{monthTitle}</h2>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Следующий месяц" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
              <SelectTrigger className="h-8 w-[9.8rem] rounded-lg border-border/75 bg-background/85 text-xs sm:h-9 sm:w-[13.5rem] sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((t) => {
                  const Ic = TYPE_ICON[t.value];
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('inline-flex size-5 items-center justify-center rounded-md bg-muted/70', DATA_TYPE_META[t.value].accentClass)}>
                          <Ic className="size-3.5 text-foreground opacity-95" />
                        </span>
                        <span>{t.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3.5 sm:py-3.5">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground uppercase">
              {DOW_LABELS.map((l) => (
                <div key={l} className="rounded-md border border-border/55 bg-muted/20 py-1">
                  {l}
                </div>
              ))}
            </div>
            <div className="mt-1.5 grid min-h-[24rem] gap-1 sm:min-h-[30rem]" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid min-h-0 grid-cols-7 gap-1">
                  {week.map(({ d, inMonth }, di) => {
                    const ymd = dateToYmd(d);
                    const isSel = ymd === dateString;
                    const isToday = ymd === todayString;
                    const status = getDayStatus(d);
                    const future = status === 'future';
                    const openDay = status === 'open';
                    const dd = getDayData(d);
                    const StatusIcon = status === 'future' ? Calendar : status === 'open' ? Pencil : Lock;
                    const statusTone = status === 'future' ? 'calendar-status-future' : status === 'open' ? 'calendar-status-open' : 'calendar-status-locked';
                    const statusSurface = status === 'future' ? 'calendar-cell-future' : openDay ? 'calendar-cell-open' : '';
                    const fill = relativeFillByYmd.get(ymd) ?? 0;
                    return (
                      <button
                        key={`${wi}-${di}`}
                        type="button"
                        disabled={future}
                        onClick={() => setDateString(dateToYmd(d))}
                        className={cn(
                          'calendar-cell-in relative flex min-h-[4.85rem] min-w-0 flex-col overflow-hidden rounded-lg border px-1.5 py-1.5 text-left aura-tx-colors',
                          inMonth ? 'bg-card border-border/70 text-foreground' : 'bg-muted/30 border-border/45 text-muted-foreground',
                          !future && inMonth && !isSel && 'hover:border-border hover:bg-muted/20',
                          isSel && 'border-primary/50 bg-primary/8 text-foreground shadow-sm',
                          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                          future && '!bg-transparent !border-border/25 !text-muted-foreground',
                          future && 'pointer-events-none',
                          statusSurface
                        )}
                        style={{ animationDelay: `${Math.min(180, wi * 18 + di * 6)}ms` }}
                        title={status === 'open' ? 'Ячейка открыта для редактирования' : status === 'locked' ? 'Ячейка закрыта' : 'Будущая дата недоступна'}
                      >
                        <span
                          className="calendar-water-fill pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md"
                          style={
                            {
                              ['--calendar-water-level' as string]: `${fill}%`,
                              ['--calendar-water-color' as string]: 'var(--foreground)',
                            } as CSSProperties
                          }
                        />
                        <span className="relative z-[1] inline-flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold tabular-nums">{d.getDate()}</span>
                          {isToday && <ColoredAuraIcon name="sparkles" tint="var(--primary)" size={12} className="opacity-80" />}
                        </span>
                        <span className="relative z-[1] flex flex-1 flex-col items-center justify-center text-center">
                          <span className="max-w-full truncate px-1 font-mono text-xs font-semibold tabular-nums">
                            {future || !inMonth ? '—' : dd.text || '—'}
                          </span>
                        </span>
                        <span className={cn('absolute right-1.5 top-1.5 z-[2] inline-flex size-5 items-center justify-center rounded-md', statusTone, isSel && 'border-primary/40 bg-primary/10 text-primary')}>
                          <StatusIcon className="size-3" aria-hidden />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <footer className="border-t border-border/70 bg-muted/10 px-3 py-3 sm:px-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {daySummary.map((row) => {
                const Ic = TYPE_ICON[row.type];
                return (
                  <div key={row.type} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/75 px-2.5 py-1.5">
                    <span className={cn('inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/65', DATA_TYPE_META[row.type].accentClass)}>
                      <Ic className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 truncate font-mono text-xs tabular-nums">{row.text}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md border border-border/55 bg-background/70 px-1.5 py-1">
                <Pencil className="size-3" />
                Открыт
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border/55 bg-background/70 px-1.5 py-1">
                <Lock className="size-3" />
                Закрыт
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border/55 bg-background/70 px-1.5 py-1">
                <Calendar className="size-3" />
                Будущее
              </span>
            </div>
          </footer>
        </CardContent>
      </Card>
    </PageFrame>
  );
}

