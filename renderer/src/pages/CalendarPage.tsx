import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUp, Award, Banknote, ChevronLeft, ChevronRight, Flame, Smile, Sun, Target, Lock, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import { useSelectedDate, dateToYmd } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { usePointsService } from '@/shared/hooks/use-points-service';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { cn } from '@/lib/utils';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';

type DataType = 'completion' | 'points' | 'rituals' | 'mood' | 'income' | 'expense' | 'finance' | 'calories';
type DayStatus = 'future' | 'open' | 'locked';
type DayData = { value?: number; text?: string; color?: string; fillPercent?: number; icon?: string | null };

type LegacyPointsApi = {
  getDayData: (date: string, type: DataType, monthData?: unknown) => DayData;
  getMonthRange: (year: number, month: number, type: DataType) => unknown;
  isDayOpen: (date: string) => boolean;
  isFutureDay: (date: string) => boolean;
};

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

export function CalendarPage({ inModal = false, onRequestClose }: { inModal?: boolean; onRequestClose?: () => void }) {
  const { dateString, setDateString, todayString } = useSelectedDate();
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh();
  const todayD = parseYmd(todayString);
  const selectedDate = parseYmd(dateString) ?? todayD ?? new Date();
  const [view, setView] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [dataType, setDataType] = useState<DataType>(() => {
    if (typeof localStorage === 'undefined') return 'completion';
    const raw = localStorage.getItem(STORAGE_KEYS.CALENDAR_DATA_TYPE);
    return DATA_TYPES.some((o) => o.value === raw) ? (raw as DataType) : 'completion';
  });

  useEffect(() => {
    const base = parseYmd(dateString) ?? parseYmd(todayString) ?? new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [dateString, todayString]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CALENDAR_DATA_TYPE, dataType);
  }, [dataType]);

  const pointsApi = usePointsService(db, Boolean(db)) as LegacyPointsApi | null;

  const monthData = useMemo(() => {
    if (!pointsApi) return null;
    if (!['income', 'expense', 'mood', 'points', 'finance', 'calories'].includes(dataType)) return null;
    return pointsApi.getMonthRange(view.getFullYear(), view.getMonth() + 1, dataType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsApi, dataType, view, dataTick]);

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
      return { ymd, eligible: inMonth && !future, value: Math.abs(rawValue) };
    });
    const maxVisible = rows.reduce((max, row) => (row.eligible ? Math.max(max, row.value) : max), 0);
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.ymd, !row.eligible || maxVisible <= 0 ? 0 : Math.max(0, Math.min(100, (row.value / maxVisible) * 100)));
    }
    return map;
  }, [flat, dataType, monthData, pointsApi, view, todayString]);

  const content = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Header ── */}
      <MegaPanelHeader
        title="Календарь"
        right={
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-caption font-medium sm:px-3 sm:text-sm border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] hover:bg-[var(--aura-action-hover-bg)]"
              onClick={() => {
                const base = parseYmd(todayString) ?? new Date();
                setView(new Date(base.getFullYear(), base.getMonth(), 1));
                setDateString(todayString);
              }}
            >
              Сегодня
            </Button>
            {inModal && onRequestClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 shrink-0 rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground"
                aria-label="Закрыть календарь"
                onClick={onRequestClose}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        }
      />

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--aura-border-soft)] px-4 py-2.5">
        {/* Month nav */}
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] p-0.5">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            className="flex size-7 items-center justify-center rounded-md text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground aura-tx-colors"
            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-[9rem] px-1 text-center text-sm font-semibold capitalize tracking-tight sm:min-w-[12rem]">
            {monthTitle}
          </h2>
          <button
            type="button"
            aria-label="Следующий месяц"
            className="flex size-7 items-center justify-center rounded-md text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground aura-tx-colors"
            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Data type */}
        <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
          <SelectTrigger className="h-8 w-[9.5rem] rounded-lg border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-xs shadow-none sm:h-8 sm:w-[11.5rem] sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPES.map((t) => {
              const Ic = TYPE_ICON[t.value];
              return (
                <SelectItem key={t.value} value={t.value}>
                  <span className="inline-flex items-center gap-2">
                    <Ic className="size-3.5 shrink-0 opacity-70" />
                    <span>{t.label}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* ── Calendar grid ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {/* Day-of-week header */}
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {DOW_LABELS.map((l) => (
            <div key={l} className="py-1 text-center text-caption font-semibold uppercase tracking-wider text-[var(--aura-text-subtle)]">
              {l}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div
          className="grid gap-1"
          style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="grid min-h-0 grid-cols-7 gap-1">
              {week.map(({ d, inMonth }, di) => {
                const ymd = dateToYmd(d);
                const isSel = ymd === dateString;
                const isToday = ymd === todayString;
                const status = getDayStatus(d);
                const future = status === 'future';
                const locked = status === 'locked';
                const dd = getDayData(d);
                const fill = relativeFillByYmd.get(ymd) ?? 0;

                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    disabled={future}
                    onClick={() => setDateString(dateToYmd(d))}
                    className={cn(
                      'group relative flex min-h-[4.5rem] min-w-0 flex-col overflow-hidden rounded-xl border px-2 py-1.5 text-left transition-colors duration-150 sm:min-h-[5.5rem]',
                      // base
                      !inMonth && 'border-[var(--aura-border-soft)]/40 bg-transparent text-[var(--aura-text-disabled)]',
                      inMonth && !isSel && !future && 'border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-foreground hover:bg-[var(--aura-action-hover-bg)]',
                      // future
                      future && 'border-[var(--aura-border-soft)]/30 bg-transparent text-[var(--aura-text-disabled)] pointer-events-none',
                      // selected
                      isSel && 'border-primary/45 bg-primary/8 text-foreground shadow-sm hover:bg-primary/12',
                      // today ring
                      isToday && !isSel && 'border-primary/30',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70'
                    )}
                  >
                    {/* Fill bar at bottom */}
                    {inMonth && !future && fill > 0 && (
                      <span
                        className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl transition-all duration-300"
                        style={{
                          height: `${Math.max(3, fill * 0.28)}%`,
                          backgroundColor: isSel ? 'var(--primary)' : 'var(--foreground)',
                          opacity: isSel ? 0.35 : locked ? 0.12 : 0.18,
                        } as CSSProperties}
                      />
                    )}

                    {/* Day number + today dot */}
                    <span className="relative z-[1] flex items-center gap-1">
                      {locked ? (
                        <Lock className="size-3 shrink-0 text-[var(--aura-text-disabled)]" aria-hidden />
                      ) : (
                        <span className={cn(
                          'text-xs font-semibold tabular-nums leading-none',
                          isToday && 'text-primary',
                        )}>
                          {d.getDate()}
                        </span>
                      )}
                      {isToday && (
                        <ColoredAuraIcon name="sparkles" tint="var(--primary)" size={10} className="opacity-75" />
                      )}
                    </span>

                    {/* Data value */}
                    <span className="relative z-[1] mt-auto flex flex-col items-start justify-end">
                      {inMonth && !future ? (
                        <span className={cn(
                          'text-nano tabular-nums leading-snug',
                          isSel ? 'text-primary/80 font-semibold' : locked ? 'text-[var(--aura-text-disabled)]' : 'text-[var(--aura-text-muted)]'
                        )}>
                          {dd.text || '—'}
                        </span>
                      ) : (
                        <span className="text-nano text-[var(--aura-text-disabled)]">—</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer: day summary ── */}
      <footer className="shrink-0 border-t border-[var(--aura-border-soft)] px-4 py-3">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {daySummary.map((row) => {
            const Ic = TYPE_ICON[row.type];
            const isActive = row.type === dataType;
            return (
              <button
                key={row.type}
                type="button"
                onClick={() => setDataType(row.type)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-150',
                  isActive
                    ? 'border-primary/35 bg-primary/8 text-primary'
                    : 'border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground'
                )}
              >
                <span className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded-md',
                  isActive ? 'bg-primary/15' : 'bg-[var(--aura-action-hover-bg)]'
                )}>
                  <Ic className={cn('size-3', isActive ? 'text-primary' : 'text-[var(--aura-text-subtle)]')} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs tabular-nums">{row.text}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );

  if (inModal) return content;

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {content}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
