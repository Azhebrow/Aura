// ─── RanksPage ────────────────────────────────────────────────────────────────
// Страница рангов: оркестрирует лейаут, данные и видимость секций.
// Тяжёлые компоненты вынесены в features/ranks/.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AreaChart, Calendar, Sparkle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useCumulativePoints } from '@/shared/hooks/use-cumulative-points';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import { RANK_TIERS, getCurrentRank, getNextRank, rankProgress } from '@/shared/config/ranks-model';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobilePageShell, SectionTabsLayout } from '@/shared/ui/mobile';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { cn } from '@/lib/utils';

import { buildPointsHistoryRange } from '@/features/ranks/rank-utils';
import { CurrentRankHero }    from '@/features/ranks/CurrentRankHero';
import { RankLadder }         from '@/features/ranks/RankLadder';
import { PointsHistoryTable } from '@/features/ranks/PointsHistoryTable';
import { PointsAccumulationChart } from '@/features/ranks/PointsAccumulationChart';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';

type RanksMobilePanel = 'rank' | 'chart' | 'history';

function readRanksMobilePanel(): RanksMobilePanel {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RANKS_MOBILE_PANEL);
    return raw === 'rank' || raw === 'chart' || raw === 'history' ? raw : 'rank';
  } catch {
    return 'rank';
  }
}

function readStoredRankId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RANKS_SELECTED_RANK_ID);
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function RanksPage() {
  const { dateString } = useSelectedDate();
  const { db }         = useAuraDb();
  const dataTick       = useAuraDataRefresh();

  const [mobilePanel, setMobilePanel] = useState<RanksMobilePanel>(readRanksMobilePanel);
  const setStoredMobilePanel = (next: RanksMobilePanel) => {
    setMobilePanel(next);
    try { localStorage.setItem(STORAGE_KEYS.RANKS_MOBILE_PANEL, next); } catch { /* ignore */ }
  };

  // Флаги mini-app вычисляются один раз при монтировании:
  // dataset и innerWidth не меняются в mini-app-окне после запуска
  const isMiniApp = useMemo(
    () => typeof document !== 'undefined' && document.documentElement.dataset.auraMiniapp === '1',
    []
  );
  const compactMiniRankOnly = useMemo(
    () => isMiniApp && typeof window !== 'undefined' && window.innerWidth < 900,
    [isMiniApp]
  );

  // ─── Visibility ──────────────────────────────────────────────────────────────

  const visibility = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db]);

  const showRank    = visibility.ranks.rank !== false;
  const showHistory = visibility.ranks.pointsHistory !== false;

  // ─── Rank data ────────────────────────────────────────────────────────────────

  const points      = useCumulativePoints(db, Boolean(db), dateString);
  const current     = getCurrentRank(points);
  const reachedTiers = useMemo(() => RANK_TIERS.filter((tier) => points >= tier.threshold), [points]);

  const [selectedRankId, setSelectedRankId] = useState<number>(() => readStoredRankId() ?? current.id);
  const setStoredSelectedRankId = (next: number) => {
    setSelectedRankId(next);
    try { localStorage.setItem(STORAGE_KEYS.RANKS_SELECTED_RANK_ID, String(next)); } catch { /* ignore */ }
  };

  // Сбрасываем выбранный ранг, если он перестал быть достигнутым
  useEffect(() => {
    const stillReached = reachedTiers.some((tier) => tier.id === selectedRankId);
    if (!stillReached) setStoredSelectedRankId(current.id);
  }, [current.id, reachedTiers, selectedRankId]);

  const selectedRank = reachedTiers.find((tier) => tier.id === selectedRankId) ?? reachedTiers[reachedTiers.length - 1] ?? current;
  const next = getNextRank(selectedRank);
  const { pct, needed } = rankProgress(points, selectedRank, next);

  const history = useMemo(() => {
    if (!db) return [];
    try { return buildPointsHistoryRange(db, dateString); }
    catch { return []; }
  }, [db, dateString, dataTick]);

  // ─── Sections disabled ────────────────────────────────────────────────────────

  if (!showRank && !showHistory) {
    return (
      <PageFrame>
        <p className="text-muted-foreground text-sm">Включите секции рангов в настройках приложения.</p>
      </PageFrame>
    );
  }

  // ─── Column JSX ───────────────────────────────────────────────────────────────

  const both = showRank && showHistory;

  const rankColumn: ReactNode = showRank ? (
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
            onSelect={setStoredSelectedRankId}
            showHeader={both}
          />
        </div>
      ) : null}
    </div>
  ) : null;

  const historyTableColumn: ReactNode = showHistory ? (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader title="История очков" />
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <PointsHistoryTable db={db} history={history} />
      </div>
    </div>
  ) : null;

  const historyColumn: ReactNode = showHistory ? (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <PointsAccumulationChart history={history} rank={current} endDate={dateString} />
      {historyTableColumn}
    </div>
  ) : null;

  const chartColumn: ReactNode = showHistory ? (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <PointsAccumulationChart history={history} rank={current} endDate={dateString} />
    </div>
  ) : null;

  // ─── Mini-app compact mode ────────────────────────────────────────────────────

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

  // ─── Main render ──────────────────────────────────────────────────────────────

  const mobileSections = [
    showRank    ? { id: 'rank'    as const, label: 'Ранг',    Icon: Sparkle,  content: rankColumn    } : null,
    showHistory ? { id: 'chart'   as const, label: 'График',  Icon: AreaChart, content: chartColumn   } : null,
    showHistory ? { id: 'history' as const, label: 'История', Icon: Calendar, content: historyTableColumn } : null,
  ].filter(Boolean) as Array<{ id: 'rank' | 'chart' | 'history'; label: string; Icon: typeof Sparkle; content: ReactNode }>;

  const activeMobileSection = mobileSections.find((s) => s.id === mobilePanel) ?? mobileSections[0];

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
          <SectionTabsLayout
            className="xl:hidden"
            sections={mobileSections}
            value={activeMobileSection?.id ?? mobilePanel}
            onChange={(v) => setStoredMobilePanel(v as RanksMobilePanel)}
          />
          {both ? (
            <div className="hidden h-full min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] xl:divide-x xl:divide-soft">
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
