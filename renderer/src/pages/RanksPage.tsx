import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pencil,
  Percent,
  Sparkle,
  Sigma,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useCumulativePoints } from '@/shared/hooks/use-cumulative-points';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useDragScroll } from '@/shared/hooks/use-drag-scroll';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import {
  type RankTier,
  RANK_TIERS,
  formatRankPoints,
  getCurrentRank,
  getNextRank,
  rankAuraHsl,
  rankImageSrc,
  rankProgress,
} from '@/shared/config/ranks-model';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { cn } from '@/lib/utils';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobilePageShell, SectionTabsLayout } from '@/shared/ui/mobile';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { TASK_CATEGORY_IDS, type TaskCategoryId } from '@/shared/config/domain-taxonomy';
import { loadTaskCategoryConfig } from '@/shared/config/task-categories-settings';
import { LoadingShell } from '@/shared/ui/data-states';

type HistoryCategoryId = TaskCategoryId;
const HISTORY_CATEGORY_IDS = TASK_CATEGORY_IDS;

const HISTORY_CATEGORY_PERCENT_KEYS: Record<HistoryCategoryId, string> = {
  rituals: 'rituals_percent',
  time: 'time_percent',
  body: 'body_percent',
  deps: 'deps_percent',
};

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDaysIso(dateStr: string, delta: number): string {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function buildPointsHistoryRange(db: AuraDatabase, endDate: string): AuraRow[] {
  const rows = db.getAll('act_daily_points').filter((r) => isIsoDate(r.date));
  const settings = (db.getAppSettings() ?? {}) as AuraRow;
  const configuredStart = isIsoDate(settings.points_start_date) ? settings.points_start_date : null;
  const firstStoredDate = rows
    .map((r) => String(r.date))
    .sort((a, b) => a.localeCompare(b))[0];
  const startDate = configuredStart ?? firstStoredDate ?? endDate;
  const safeEnd = isIsoDate(endDate) ? endDate : startDate;
  if (startDate > safeEnd) return [];

  const byDate = new Map(rows.map((row) => [String(row.date), row]));
  const out: AuraRow[] = [];
  for (let cursor = safeEnd, guard = 0; cursor >= startDate && guard < 5000; cursor = addDaysIso(cursor, -1), guard += 1) {
    out.push(byDate.get(cursor) ?? { id: `empty_${cursor}`, date: cursor, completion_percent: 0, daily_points: 0, cumulative_points: 0 });
  }
  return out;
}

export function RanksPage() {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh();
  const [mobilePanel, setMobilePanel] = useState<'rank' | 'history'>('rank');
  const isMiniApp = typeof document !== 'undefined' && document.documentElement.dataset.auraMiniapp === '1';
  const compactMiniRankOnly = isMiniApp && typeof window !== 'undefined' && window.innerWidth < 900;

  const visibility = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db]);

  const showRank = visibility.ranks.rank !== false;
  const showHistory = visibility.ranks.pointsHistory !== false;

  const points = useCumulativePoints(db, Boolean(db), dateString);
  const current = getCurrentRank(points);
  const reachedTiers = useMemo(
    () => RANK_TIERS.filter((tier) => points >= tier.threshold),
    [points]
  );
  const [selectedRankId, setSelectedRankId] = useState<number>(current.id);

  useEffect(() => {
    const stillReached = reachedTiers.some((tier) => tier.id === selectedRankId);
    if (!stillReached) {
      setSelectedRankId(current.id);
    }
  }, [current.id, reachedTiers, selectedRankId]);

  const selectedRank =
    reachedTiers.find((tier) => tier.id === selectedRankId) ??
    reachedTiers[reachedTiers.length - 1] ??
    current;
  const next = getNextRank(selectedRank);
  const { pct, needed } = rankProgress(points, selectedRank, next);

  const history = useMemo(() => {
    if (!db) return [];
    try {
      return buildPointsHistoryRange(db, dateString);
    } catch {
      return [];
    }
  }, [db, dateString, dataTick]);

  if (!showRank && !showHistory) {
    return (
      <PageFrame>
        <p className="text-muted-foreground text-sm">Включите секции рангов в настройках приложения.</p>
      </PageFrame>
    );
  }

  const both = showRank && showHistory;

  const rankColumn = showRank ? (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <CurrentRankHero
        current={selectedRank}
        actualCurrent={current}
        next={next}
        points={points}
        pct={pct}
        needed={needed}
        dateString={dateString}
      />
      {!compactMiniRankOnly ? (
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
          <RankLadder
            points={points}
            currentId={current.id}
            selectedId={selectedRank.id}
            onSelect={setSelectedRankId}
            showHeader={both}
          />
        </div>
      ) : null}
    </div>
  ) : null;

  const historyColumn = showHistory ? (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader title="История очков" />
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-4">
        <PointsHistoryTable db={db} history={history} />
      </div>
    </div>
  ) : null;

  if (compactMiniRankOnly && showRank) {
    return (
      <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
        <Card className={MEGA_SHELL_CARD_CN}>
          <CardContent className={cn(MEGA_SHELL_CONTENT_CN, 'aura-content-fade-in p-0')}>
            <MobilePageShell
              sections={[{ id: 'rank', label: 'Ранг', Icon: Sparkle, content: rankColumn }]}
              value="rank"
              onChange={() => {}}
            />
          </CardContent>
        </Card>
      </PageFrame>
    );
  }

  const mobileSections = [
    showRank ? { id: 'rank' as const, label: 'Ранг', Icon: Sparkle, content: rankColumn } : null,
    showHistory ? { id: 'history' as const, label: 'История', Icon: Calendar, content: historyColumn } : null,
  ].filter(Boolean) as Array<{ id: 'rank' | 'history'; label: string; Icon: typeof Sparkle; content: ReactNode }>;
  const activeMobileSection =
    mobileSections.find((section) => section.id === mobilePanel) ?? mobileSections[0];
  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
          <SectionTabsLayout
            className="xl:hidden"
            sections={mobileSections}
            value={activeMobileSection?.id ?? mobilePanel}
            onChange={(v) => setMobilePanel(v as 'rank' | 'history')}
          />
          {both ? (
            <div className="hidden h-full min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] xl:divide-x xl:divide-[var(--aura-border-soft)]">
              {rankColumn}
              {historyColumn}
            </div>
          ) : showRank ? (
            <div className="hidden min-h-0 flex-1 xl:flex">{rankColumn}</div>
          ) : (
            <div className="hidden min-h-0 flex-1 xl:flex">{historyColumn}</div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}

function CurrentRankHero({
  current,
  actualCurrent,
  next,
  points,
  pct,
  needed,
  dateString,
}: {
  current: RankTier;
  actualCurrent: RankTier;
  next: RankTier | null;
  points: number;
  pct: number;
  needed: number;
  dateString: string;
}) {
  const aura = rankAuraHsl(current.id);
  const currentRankImageSrc = rankImageSrc(current.imageNumber);
  const heroAuraVars = { ['--rank-aura' as string]: aura } as CSSProperties;
  const hasLocalPointsFallback = typeof window === 'undefined' || !window.PointsService;

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-[var(--aura-border-soft)]/40 bg-transparent px-2.5 py-3 sm:px-4 sm:py-5"
      style={heroAuraVars}
    >
      <div aria-hidden className="ranks-hero-aura-flow pointer-events-none absolute inset-0 hidden sm:block" />
      <div className="relative z-[1] mx-auto flex max-w-3xl flex-col gap-3 xl:max-w-none xl:flex-row xl:items-stretch xl:gap-6">
        <div className="relative mx-auto flex aspect-square w-full max-w-[min(126px,34vw)] shrink-0 items-center justify-center sm:max-w-[min(132px,34vw)] xl:mx-0 xl:max-w-[min(220px,28%)]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-[min(64rem,150vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.62] blur-[72px] motion-safe:transition-opacity motion-safe:duration-aura-glide motion-safe:ease-aura"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${aura} calc(var(--ranks-aura-core-mix) * 1.25), transparent) 0%, color-mix(in srgb, ${aura} calc(var(--ranks-aura-mid-mix) * 1.05), transparent) 28%, color-mix(in srgb, ${aura} calc(var(--ranks-aura-mid-mix) * 0.42), transparent) 54%, color-mix(in srgb, ${aura} calc(var(--ranks-aura-mid-mix) * 0.16), transparent) 76%, transparent 100%)`,
            }}
          />
          <RankImage
            src={currentRankImageSrc}
            alt={current.name}
            className="relative z-[1] max-h-full w-full object-contain drop-shadow-sm"
            loading="eager"
            revealWhenLoaded
          />
        </div>

    <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-3 sm:gap-4 xl:justify-center">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Текущий ранг</p>
          <h2 className="font-heading text-balance text-lg font-semibold tracking-tight text-foreground sm:text-2xl xl:text-3xl">
            {current.name}
          </h2>
          {current.id !== actualCurrent.id ? (
            <p className="text-muted-foreground text-xs">
              Просмотр достигнутого ранга. Активный сейчас: <span className="text-foreground font-medium">{actualCurrent.name}</span>
            </p>
          ) : null}
          <div className="text-muted-foreground max-h-[min(5rem,16svh)] overflow-y-auto overscroll-y-contain pr-1 text-xs leading-relaxed [scrollbar-width:thin] sm:text-sm sm:max-h-[min(7.5rem,22svh)] xl:max-h-[min(9rem,26svh)]">
            {current.description}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Накоплено очков</p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                {formatRankPoints(points)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">на {dateString}</p>
            </div>
            <div className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5 sm:px-4 sm:py-3">
              {next ? (
                <>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">До «{next.name}»</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                    ещё <span className="text-primary">{formatRankPoints(needed)}</span>
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">порог: {formatRankPoints(next.threshold)}</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Вершина</p>
                  <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">Максимальный ранг</p>
                  <p className="text-muted-foreground mt-1 text-xs">Вы прошли весь путь лестницы.</p>
                </>
              )}
            </div>
          </div>

          {next ? (
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Прогресс к следующему рангу</span>
                <span className="font-semibold tabular-nums text-foreground">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          ) : null}
          {hasLocalPointsFallback ? (
            <p className="text-muted-foreground text-xs">
              Локальный режим: очки берутся из сохранённых дневных данных без Electron.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RankLadder({
  points,
  currentId,
  selectedId,
  onSelect,
  showHeader = true,
}: {
  points: number;
  currentId: number;
  selectedId: number;
  onSelect: (tierId: number) => void;
  showHeader?: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasRoom, setHasRoom] = useState(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      const { height } = el.getBoundingClientRect();
      setHasRoom(height >= 260);
    };

    update();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 180, behavior: 'smooth' });
  }, []);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!hasRoom ? null : (
        <>
      {showHeader ? (
        <MegaPanelHeader
          title="Все ранги"
          right={
            <div className="flex gap-1 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-8 shrink-0"
                aria-label="Прокрутить влево"
                onClick={() => scrollBy(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-8 shrink-0"
                aria-label="Прокрутить вправо"
                onClick={() => scrollBy(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          }
        />
      ) : null}
      <div
        ref={stripRef}
        className={cn(
          'h-full min-h-0 flex-1 overflow-hidden p-3 sm:p-4',
          'grid gap-2',
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
          'auto-rows-fr'
        )}
      >
        {RANK_TIERS.map((tier) => (
          <RankRibbonCard
            key={tier.id}
            tier={tier}
            reached={points >= tier.threshold}
            isCurrent={tier.id === currentId}
            isSelected={tier.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
        </>
      )}
    </div>
  );
}

function RankRibbonCard({
  tier,
  reached,
  isCurrent,
  isSelected,
  onSelect,
}: {
  tier: RankTier;
  reached: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: (tierId: number) => void;
}) {
  const aura = rankAuraHsl(tier.id);
  const tierImageSrc = rankImageSrc(tier.imageNumber);
  const cardStyle: CSSProperties | undefined =
    reached && isCurrent
      ? {
          boxShadow: `0 0 0 1px color-mix(in srgb, ${aura} 28%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${aura} 8%, var(--card))`,
        }
      : undefined;

  if (!reached) {
    return (
      <div
        className={cn(
          'isolate flex h-full flex-col items-center justify-center rounded-xl border border-[var(--aura-border-soft)]/50 bg-[var(--aura-surface-panel)] p-2 text-center',
          'transition-[box-shadow,background-color] duration-aura-base ease-aura'
        )}
        title={`${tier.name} — ${tier.threshold}+`}
      >
        <Lock className="size-5 text-[var(--aura-text-subtle)]" aria-hidden />
        <span className="mt-1 text-xs text-[var(--aura-text-disabled)] tabular-nums">{tier.threshold}+</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(tier.id)}
        className={cn(
          'isolate relative flex h-full flex-col items-center justify-center rounded-xl border border-[var(--aura-border-soft)] px-2 py-2 text-center gap-2',
          'transition-[box-shadow,background-color] duration-aura-base ease-aura',
          'w-full',
          !isCurrent && 'bg-card/85 opacity-95',
        isSelected && 'ring-primary/35 ring-2'
      )}
      style={cardStyle}
    >
      <div className="flex flex-col items-center">
        <div className="relative size-10 shrink-0 sm:size-12">
          <RankImage
            src={tierImageSrc}
            alt=""
            ariaHidden
            className="size-full object-contain"
            loading="eager"
          />
        </div>
      </div>
      <span
        className={cn(
          'line-clamp-2 w-full text-xs font-semibold leading-tight tracking-wide',
          isCurrent ? 'text-foreground' : 'text-foreground/90'
        )}
      >
        {tier.name}
      </span>
      <span className="absolute bottom-1 right-1.5 text-micro tabular-nums text-muted-foreground/50">
        {tier.threshold}+
      </span>
    </button>
  );
}

function RankImage({
  src,
  alt,
  className,
  loading = 'eager',
  ariaHidden = false,
  revealWhenLoaded = false,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  ariaHidden?: boolean;
  revealWhenLoaded?: boolean;
}) {
  const [ready, setReady] = useState(!revealWhenLoaded || Boolean(window.__auraRankImageCache?.[src]?.complete));

  useEffect(() => {
    if (!revealWhenLoaded) {
      setReady(true);
      return;
    }
    if (window.__auraRankImageCache?.[src]?.complete) {
      setReady(true);
      return;
    }
    let alive = true;
    const image = new Image();
    image.onload = () => {
      window.__auraRankImageCache = { ...(window.__auraRankImageCache ?? {}), [src]: image };
      if (alive) setReady(true);
    };
    image.onerror = () => {
      if (alive) setReady(true);
    };
    image.src = src;
    if (image.complete) {
      window.__auraRankImageCache = { ...(window.__auraRankImageCache ?? {}), [src]: image };
      setReady(true);
    }
    return () => {
      alive = false;
    };
  }, [revealWhenLoaded, src]);

  return (
    <>
      {!ready ? <div aria-hidden className={cn('relative z-[1]', className)} /> : null}
      {ready ? (
        <img
          src={src}
          alt={alt}
          aria-hidden={ariaHidden || undefined}
          decoding="sync"
          fetchPriority={loading === 'eager' ? 'high' : 'auto'}
          loading={loading}
          className={cn('relative z-[1]', className)}
        />
      ) : null}
    </>
  );
}

function formatHistoryDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function PointsHistoryTable({
  db,
  history,
}: {
  db: AuraDatabase | null;
  history: AuraRow[];
}) {
  const { ref: scrollRef, isDragging, dragScrollHandlers } = useDragScroll<HTMLDivElement>();
  const categoryConfig = useMemo(() => loadTaskCategoryConfig(db), [db]);
  const categoryLabels = useMemo(
    () => Object.fromEntries(TASK_CATEGORY_IDS.map((k) => [k, categoryConfig[k].title])) as Record<TaskCategoryId, string>,
    [categoryConfig]
  );

  const completionsByDate = useMemo(() => {
    if (!db || history.length === 0) return new Map<string, AuraRow>();
    const want = new Set(history.map((r) => String(r.date)));
    const m = new Map<string, AuraRow>();
    try {
      for (const r of db.getAll('act_task_completions')) {
        const d = String(r.date);
        if (want.has(d)) m.set(d, r);
      }
    } catch {
      /* ignore */
    }
    return m;
  }, [db, history]);

  const dayStatusIcon = useMemo(() => {
    const Ctor = typeof window !== 'undefined' ? window.PointsService : undefined;
    if (!Ctor || !db) {
      return (): LucideIcon => Lock;
    }
    try {
      const ps = new Ctor(db);
      return (dateStr: string): LucideIcon => {
        if (ps.isFutureDay(dateStr)) return Calendar;
        if (ps.isDayOpen(dateStr)) return Pencil;
        return Lock;
      };
    } catch {
      return (): LucideIcon => Lock;
    }
  }, [db]);

  if (!db) {
    return <LoadingShell />;
  }
  if (history.length === 0) {
    return <p className="text-muted-foreground text-sm">Нет данных по очкам.</p>;
  }

  const STICKY_HEADER_SHADOW = 'inset 0 -1px 0 hsl(var(--border) / 0.35)';
  const STICKY_COLUMN_SHADOW = 'inset -1px 0 0 hsl(var(--border) / 0.35)';
  const STICKY_CORNER_SHADOW = `${STICKY_HEADER_SHADOW}, ${STICKY_COLUMN_SHADOW}`;
  const TABLE_CELL_CN = 'border-r border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-1 py-2 text-center text-xs tabular-nums';

  const COL_HEADERS: { key: string; Icon: LucideIcon; label: string; color: string }[] = [
    { key: 'date',  Icon: Calendar, label: 'Дата', color: 'var(--aura-text-muted)' },
    { key: 'categories', Icon: Activity, label: 'Категории', color: 'var(--aura-text-muted)' },
    { key: 'avg',   Icon: Percent,  label: 'Средний %', color: 'hsl(var(--primary))' },
    { key: 'daily', Icon: Sparkle,  label: 'Очки за день', color: 'var(--semantic-success)' },
    { key: 'total', Icon: Sigma,    label: 'Накоплено', color: 'var(--aura-text-muted)' },
    { key: 'status',Icon: Lock,     label: 'Статус', color: 'var(--aura-text-muted)' },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="aura-surface-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/80">
        <div
          ref={scrollRef}
          className={cn(
            'aura-data-table-scroll h-full min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable]',
            'cursor-grab select-none active:cursor-grabbing',
            isDragging && 'cursor-grabbing'
          )}
          {...dragScrollHandlers}
        >
          <table className="w-max min-w-full table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col className="w-[4.75rem] sm:w-[5.5rem]" />
              <col className="w-[7rem] sm:w-[7.5rem]" />
              <col className="w-[3.25rem] sm:w-[3.5rem]" />
              <col className="w-[3.75rem] sm:w-[4rem]" />
              <col className="w-[4rem] sm:w-[4.5rem]" />
              <col className="w-[2.5rem] sm:w-[2.75rem]" />
            </colgroup>
            <thead className="sticky top-0 z-[4]">
              <tr>
                {COL_HEADERS.map(({ key, Icon, label, color }, idx) => (
                  <th
                    key={key}
                    title={label}
                    aria-label={label}
                    className={cn(
                      'bg-card text-[var(--aura-text-muted)] sticky top-0 z-[5] border-b border-r border-[var(--aura-border-soft)]/40 px-1 py-1.5 text-center align-middle sm:py-2',
                      idx === 0 && 'sticky left-0 z-[6]',
                      idx === COL_HEADERS.length - 1 && 'border-r-0'
                    )}
                    style={{ boxShadow: idx === 0 ? STICKY_CORNER_SHADOW : STICKY_HEADER_SHADOW }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="inline-flex size-5 items-center justify-center" style={{ color } as CSSProperties}>
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                      </span>
                      <span className="sr-only">{label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, rowIdx) => {
                const dateStr = String(row.date);
                const completion = completionsByDate.get(dateStr);
                const avgPct = Math.round(Math.min(100, Math.max(0, Number(row.completion_percent ?? 0))));
                const StatusIc = dayStatusIcon(dateStr);
                const daily = Number(row.daily_points ?? 0);
                const isLastRow = rowIdx === history.length - 1;
                return (
                  <tr key={String(row.id)} className="aura-tx-colors">
                    {/* Date — sticky left */}
                    <td
                      className={cn(
                        'sticky left-0 z-[3] border-r border-b border-[var(--aura-border-soft)] bg-card px-1.5 py-2 text-center text-xs font-medium text-foreground whitespace-nowrap',
                        isLastRow && 'border-b-0'
                      )}
                      style={{ boxShadow: STICKY_COLUMN_SHADOW }}
                    >
                      <span className="max-lg:inline lg:hidden">{formatHistoryDateShort(dateStr)}</span>
                      <span className="hidden lg:inline">{dateStr}</span>
                    </td>
                    {/* Category % */}
                    <td className={cn(TABLE_CELL_CN, 'font-medium whitespace-nowrap', isLastRow && 'border-b-0')}>
                      {HISTORY_CATEGORY_IDS.map((id, idx) => {
                        const pctKey = HISTORY_CATEGORY_PERCENT_KEYS[id];
                        const raw = completion?.[pctKey];
                        const v = raw !== null && raw !== undefined && !Number.isNaN(Number(raw))
                          ? Math.round(Math.min(100, Math.max(0, Number(raw))))
                          : null;
                        return (
                          <span key={id} title={categoryLabels[id] ?? id}>
                            {idx > 0 ? <span className="text-muted-foreground/45">+</span> : null}
                            {v != null ? (
                              <span style={{ color: categoryConfig[id].color } as CSSProperties}>{v}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                        );
                      })}
                    </td>
                    {/* Avg % */}
                    <td className={cn(TABLE_CELL_CN, 'font-semibold text-foreground', isLastRow && 'border-b-0')}>
                      {avgPct}%
                    </td>
                    {/* Daily points */}
                    <td className={cn(
                      TABLE_CELL_CN,
                      'font-medium whitespace-nowrap',
                      daily >= 0 ? 'text-semantic-success' : 'text-semantic-negative',
                      isLastRow && 'border-b-0'
                    )}>
                      {daily >= 0 ? '+' : ''}{Math.round(daily)}
                    </td>
                    {/* Cumulative */}
                    <td className={cn(TABLE_CELL_CN, 'text-muted-foreground whitespace-nowrap', isLastRow && 'border-b-0')}>
                      {Math.round(Number(row.cumulative_points ?? 0))}
                    </td>
                    {/* Status */}
                    <td className={cn(
                      'border-b border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-1 py-2 text-center text-muted-foreground',
                      isLastRow && 'border-b-0'
                    )}>
                      <StatusIc className="inline size-3.5 shrink-0 opacity-80" aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
