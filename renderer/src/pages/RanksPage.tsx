import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Activity,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Pencil,
  Percent,
  Sparkle,
  Sparkles,
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
import { MobileSectionSwitcher } from '@/shared/ui/mobile-section-switcher';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';

const HISTORY_CATEGORY_IDS = ['rituals', 'time', 'body', 'deps'] as const;
type HistoryCategoryId = (typeof HISTORY_CATEGORY_IDS)[number];

const HISTORY_CATEGORY_ICONS: Record<HistoryCategoryId, LucideIcon> = {
  rituals: Sparkles,
  time: Clock,
  body: Activity,
  deps: Ban,
};

const HISTORY_CATEGORY_PERCENT_KEYS: Record<HistoryCategoryId, string> = {
  rituals: 'rituals_percent',
  time: 'time_percent',
  body: 'body_percent',
  deps: 'deps_percent',
};

const DEFAULT_CATEGORY_LABELS: Record<HistoryCategoryId, string> = {
  rituals: TASK_CATEGORY_DEFAULT_META.rituals.title,
  time: TASK_CATEGORY_DEFAULT_META.time.title,
  body: TASK_CATEGORY_DEFAULT_META.body.title,
  deps: TASK_CATEGORY_DEFAULT_META.deps.title,
};

function parseCategoryLabelsFromSettings(settings: unknown): Record<HistoryCategoryId, string> {
  const out = { ...DEFAULT_CATEGORY_LABELS };
  if (settings == null) return out;
  try {
    const p = typeof settings === 'string' ? JSON.parse(settings) : settings;
    if (!p || typeof p !== 'object') return out;
    HISTORY_CATEGORY_IDS.forEach((id) => {
      const block = p[id] as { title?: string; label?: string } | undefined;
      const t = block?.title ?? block?.label;
      if (typeof t === 'string' && t.trim()) out[id] = t.trim();
    });
  } catch {
    /* ignore */
  }
  return out;
}

export function RanksPage() {
  const { dateString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const dataTick = useAuraDataRefresh();
  const [mobilePanel, setMobilePanel] = useState<'rank' | 'history'>('rank');
  const isMiniApp = typeof document !== 'undefined' && document.documentElement.dataset.auraMiniapp === '1';
  const compactMiniRankOnly = isMiniApp && typeof window !== 'undefined' && window.innerWidth < 900;

  const visibility = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db, ready]);

  const showRank = visibility.ranks.rank !== false;
  const showHistory = visibility.ranks.pointsHistory !== false;

  const points = useCumulativePoints(db, ready, dateString);
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
      return db
        .getAll('act_daily_points')
        .filter((r) => r.date)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 24);
    } catch {
      return [];
    }
  }, [db, ready, dateString, dataTick]);

  const [rankAssetsReady, setRankAssetsReady] = useState(false);

  useEffect(() => {
    let active = true;
    setRankAssetsReady(false);
    const allSources = Array.from(new Set(RANK_TIERS.map((tier) => rankImageSrc(tier.imageNumber))));
    if (allSources.length === 0) {
      setRankAssetsReady(true);
      return () => {
        active = false;
      };
    }

    let loadedCount = 0;
    const markDone = () => {
      loadedCount += 1;
      if (active && loadedCount >= allSources.length) {
        setRankAssetsReady(true);
      }
    };

    allSources.forEach((src) => {
      const img = new Image();
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        markDone();
      };
      img.onload = settle;
      img.onerror = settle;
      img.src = src;
      if (img.complete) {
        settle();
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!showRank && !showHistory) {
    return (
      <PageFrame>
        <p className="text-muted-foreground text-sm">Включите секции рангов в настройках приложения.</p>
      </PageFrame>
    );
  }

  const rankColumn = showRank ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <CurrentRankHero
        current={selectedRank}
        actualCurrent={current}
        next={next}
        points={points}
        pct={pct}
        needed={needed}
        dateString={dateString}
        ready={ready}
        assetsReady={rankAssetsReady}
      />
      {!compactMiniRankOnly ? (
        <RankLadder
          points={points}
          currentId={current.id}
          selectedId={selectedRank.id}
          onSelect={setSelectedRankId}
          assetsReady={rankAssetsReady}
        />
      ) : null}
    </div>
  ) : null;

  const historyColumn = showHistory ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader title="История очков" />
      <div className={MEGA_PANEL_BODY_CN}>
        <PointsHistoryTable db={db} ready={ready} history={history} />
      </div>
    </div>
  ) : null;

  if (compactMiniRankOnly && showRank) {
    return (
      <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
        <Card className={MEGA_SHELL_CARD_CN}>
          <CardContent className={cn(MEGA_SHELL_CONTENT_CN, 'p-0')}>{rankColumn}</CardContent>
        </Card>
      </PageFrame>
    );
  }

  const both = showRank && showHistory;
  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {both ? (
            <>
              <div className="hidden h-full min-h-0 flex-1 overflow-hidden aura-content-fade-in xl:grid xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] xl:divide-x xl:divide-border/60">
                {rankColumn}
                {historyColumn}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {mobilePanel === 'rank' ? rankColumn : null}
                  {mobilePanel === 'history' ? historyColumn : null}
                </div>
                <MobileSectionSwitcher
                  sections={[
                    { id: 'rank', label: 'Ранг', icon: Sparkle },
                    { id: 'history', label: 'История', icon: Calendar },
                  ]}
                  value={mobilePanel}
                  onChange={(v) => setMobilePanel(v as 'rank' | 'history')}
                />
              </div>
            </>
          ) : showRank ? (
            rankColumn
          ) : (
            historyColumn
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
  ready,
  assetsReady,
}: {
  current: RankTier;
  actualCurrent: RankTier;
  next: RankTier | null;
  points: number;
  pct: number;
  needed: number;
  dateString: string;
  ready: boolean;
  assetsReady: boolean;
}) {
  const aura = rankAuraHsl(current.id);
  const currentRankImageSrc = rankImageSrc(current.imageNumber);
  const canRenderImage = assetsReady;
  const heroAuraVars = { ['--rank-aura' as string]: aura } as CSSProperties;
  const hasLocalPointsFallback = typeof window === 'undefined' || !window.PointsService;

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-border/40 bg-transparent px-2.5 py-3 sm:px-4 sm:py-5"
      style={heroAuraVars}
    >
      <div aria-hidden className="ranks-hero-aura-flow pointer-events-none absolute inset-0 hidden sm:block" />
      <div className="relative z-[1] mx-auto flex max-w-3xl flex-col gap-3 xl:max-w-none xl:flex-row xl:items-stretch xl:gap-6">
        <div className="relative mx-auto flex aspect-square w-full max-w-[min(96px,28vw)] shrink-0 items-center justify-center sm:max-w-[min(132px,34vw)] xl:mx-0 xl:max-w-[min(220px,28%)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-22%] rounded-full opacity-[0.65] blur-2xl motion-safe:transition-opacity motion-safe:duration-aura-glide motion-safe:ease-aura"
            style={{
              background: `radial-gradient(closest-side, color-mix(in srgb, ${aura} var(--ranks-aura-core-mix), transparent) 0%, color-mix(in srgb, ${aura} var(--ranks-aura-mid-mix), transparent) 45%, transparent 72%)`,
            }}
          />
          {canRenderImage ? (
            <RankImage
              src={currentRankImageSrc}
              alt={current.name}
              className="relative z-[1] max-h-full w-full object-contain drop-shadow-sm"
              loading="eager"
            />
          ) : (
            <div aria-hidden className="relative z-[1] h-full w-full rounded-lg bg-muted/45" />
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-3 sm:gap-4">
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

          {!ready ? (
            <p className="text-muted-foreground text-sm">Загрузка…</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Накоплено очков</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                    {formatRankPoints(points)}
                  </p>
                  <p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">на {dateString}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/40 px-3 py-2.5 sm:px-4 sm:py-3">
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
                    <span className="font-mono font-semibold tabular-nums text-foreground">{Math.round(pct)}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              ) : null}
              {hasLocalPointsFallback ? (
                <p className="text-muted-foreground text-xs">
                  Локальный режим: очки берутся из сохранённых дневных данных без Electron.
                </p>
              ) : null}
            </>
          )}
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
  assetsReady,
}: {
  points: number;
  currentId: number;
  selectedId: number;
  onSelect: (tierId: number) => void;
  assetsReady: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 180, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
      <div
        ref={stripRef}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4',
          'grid gap-2 content-start',
          'grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(7.25rem,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(7.75rem,1fr))]',
          '[&_>_*]:aspect-square'
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
            assetsReady={assetsReady}
          />
        ))}
      </div>
    </div>
  );
}

function RankRibbonCard({
  tier,
  reached,
  isCurrent,
  isSelected,
  onSelect,
  assetsReady,
}: {
  tier: RankTier;
  reached: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: (tierId: number) => void;
  assetsReady: boolean;
}) {
  const aura = rankAuraHsl(tier.id);
  const tierImageSrc = rankImageSrc(tier.imageNumber);
  const glow = reached
    ? isCurrent
      ? `0 0 0 1px color-mix(in srgb, ${aura} 42%, transparent), 0 0 28px -4px color-mix(in srgb, ${aura} 35%, transparent), 0 14px 40px -8px color-mix(in srgb, ${aura} 28%, transparent)`
      : `0 0 0 1px color-mix(in srgb, ${aura} 18%, transparent), 0 8px 26px -8px color-mix(in srgb, ${aura} 14%, transparent)`
    : undefined;

  const cardStyle: CSSProperties | undefined =
    reached && isCurrent
      ? {
          boxShadow: glow,
          backgroundColor: `color-mix(in srgb, ${aura} 14%, var(--card))`,
        }
      : glow
        ? { boxShadow: glow }
        : undefined;

  if (!reached) {
    return (
      <div
        className={cn(
          'isolate flex flex-col items-center justify-center rounded-xl border border-border/30 bg-muted/20 p-2 text-center',
          'transition-[box-shadow,background-color] duration-aura-base ease-aura'
        )}
        title={`${tier.name} — ${tier.threshold}+`}
      >
        <Lock className="size-5 text-muted-foreground/40" aria-hidden />
        <span className="mt-1 font-mono text-xs text-muted-foreground/40 tabular-nums">{tier.threshold}+</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(tier.id)}
        className={cn(
          'isolate flex flex-col items-stretch rounded-xl border border-border/60 px-2 py-2 text-center',
          'transition-[box-shadow,background-color] duration-aura-base ease-aura',
          'w-full self-start',
          !isCurrent && 'bg-card/85 opacity-95',
        isSelected && 'ring-primary/35 ring-2'
      )}
      style={cardStyle}
    >
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-1">
        <div className="relative size-10 shrink-0 sm:size-12">
          {assetsReady ? (
            <RankImage
              src={tierImageSrc}
              alt=""
              ariaHidden
              className="size-full object-contain"
              loading="eager"
            />
          ) : (
            <div aria-hidden className="size-full rounded-md bg-muted/45" />
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-0.5">
        <span
          className={cn(
            'line-clamp-2 w-full text-[11px] font-semibold leading-tight tracking-wide',
            isCurrent ? 'text-foreground' : 'text-foreground/90'
          )}
        >
          {tier.name}
        </span>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
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
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  ariaHidden?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const preloaded = new Image();
    preloaded.src = src;
    if (preloaded.complete) setLoaded(true);
  }, [src]);

  return (
    <>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-md bg-muted/45 aura-tx-opacity',
          loaded && 'opacity-0'
        )}
      />
      <img
        src={src}
        alt={alt}
        aria-hidden={ariaHidden || undefined}
        decoding="async"
        fetchPriority={loading === 'eager' ? 'high' : 'auto'}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          'relative z-[1] transition-opacity duration-250 ease-out',
          loaded ? 'ranks-media-in opacity-100' : 'opacity-0',
          className
        )}
      />
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
  ready,
  history,
}: {
  db: AuraDatabase | null;
  ready: boolean;
  history: AuraRow[];
}) {
  const categoryLabels = useMemo(
    () => parseCategoryLabelsFromSettings(db?.getAppSettings()?.task_categories_config),
    [db, ready]
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
  }, [db, ready]);

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }
  if (history.length === 0) {
    return <p className="text-muted-foreground text-sm">Нет данных по очкам.</p>;
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-max min-w-full text-left text-sm">
        <thead className="bg-muted/50 sticky top-0 z-[1] backdrop-blur-sm">
          <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <th className="w-10 px-1 py-2 text-center font-medium sm:w-11 sm:px-1.5" title="Дата">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-foreground">
                <Calendar className="size-3.5 shrink-0 opacity-90" aria-hidden />
              </span>
              <span className="sr-only">Дата</span>
            </th>
            {HISTORY_CATEGORY_IDS.map((id) => {
              const Icon = HISTORY_CATEGORY_ICONS[id];
              return (
                <th key={id} className="w-10 px-1 py-2 text-center font-medium sm:w-11 sm:px-1.5" title={categoryLabels[id]}>
                  <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-foreground">
                    <Icon className="size-3.5 shrink-0 opacity-90" aria-hidden />
                  </span>
                  <span className="sr-only">{categoryLabels[id]}</span>
                </th>
              );
            })}
            <th className="w-11 px-1 py-2 text-center font-medium sm:w-12" title="Средний процент по всем категориям">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-foreground">
                <Percent className="size-3.5 shrink-0 opacity-90" aria-hidden />
              </span>
              <span className="sr-only">Всего</span>
            </th>
            <th className="w-11 px-1 py-2 text-center font-medium sm:w-12" title="Очки за день">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-foreground">
                <Sparkle className="size-3.5 shrink-0 opacity-90" aria-hidden />
              </span>
              <span className="sr-only">Очки за день</span>
            </th>
            <th className="w-11 px-1 py-2 text-center font-medium sm:w-12" title="Накопленные очки">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-foreground">
                <Sigma className="size-3.5 shrink-0 opacity-90" aria-hidden />
              </span>
              <span className="sr-only">Накопленные очки</span>
            </th>
            <th className="w-9 px-1 py-2 text-center font-medium sm:w-10" title="День открыт или закрыт">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 bg-muted/40">
                <Lock className="size-3.5 shrink-0 opacity-80" aria-hidden />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => {
            const dateStr = String(row.date);
            const completion = completionsByDate.get(dateStr);
            const avgPct = Math.round(Math.min(100, Math.max(0, Number(row.completion_percent ?? 0))));
            const StatusIc = dayStatusIcon(dateStr);
            const daily = Number(row.daily_points ?? 0);
            return (
              <tr
                key={String(row.id)}
                className={cn(
                  'border-t border-border/50 aura-tx-colors',
                  i % 2 === 0 ? 'bg-background/40' : 'bg-muted/15'
                )}
              >
                <td className="text-muted-foreground whitespace-nowrap px-2 py-2 text-xs tabular-nums sm:px-3">
                  <span className="max-lg:inline lg:hidden">{formatHistoryDateShort(dateStr)}</span>
                  <span className="hidden lg:inline">{dateStr}</span>
                </td>
                {HISTORY_CATEGORY_IDS.map((id) => {
                  const key = HISTORY_CATEGORY_PERCENT_KEYS[id];
                  const raw = completion?.[key];
                  const v =
                    raw !== null && raw !== undefined && !Number.isNaN(Number(raw))
                      ? Math.round(Math.min(100, Math.max(0, Number(raw))))
                      : null;
                  return (
                    <td
                      key={id}
                      className="px-1 py-2 text-center text-xs tabular-nums text-foreground/90"
                    >
                      {v != null ? `${v}%` : '—'}
                    </td>
                  );
                })}
                <td className="px-1 py-2 text-center text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                  {avgPct}%
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap px-2 py-2 text-right text-xs font-medium tabular-nums sm:px-3',
                    daily >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  )}
                >
                  {daily >= 0 ? '+' : ''}
                  {Math.round(daily)}
                </td>
                <td className="text-muted-foreground whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums sm:px-3">
                  {Math.round(Number(row.cumulative_points ?? 0))}
                </td>
                <td className="px-1 py-2 text-center text-muted-foreground">
                  <span className="inline-flex items-center justify-center" title="Статус дня">
                    <StatusIc className="size-3.5 shrink-0 opacity-85" aria-hidden />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
