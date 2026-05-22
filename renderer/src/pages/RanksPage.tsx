// ─── RanksPage ────────────────────────────────────────────────────────────────
// Страница рангов: оркестрирует лейаут, данные и видимость секций.
// Тяжёлые компоненты вынесены в features/ranks/.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, Sparkle } from 'lucide-react';
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

export function RanksPage() {
  const { dateString } = useSelectedDate();
  const { db }         = useAuraDb();
  const dataTick       = useAuraDataRefresh();

  const [mobilePanel, setMobilePanel] = useState<'rank' | 'history'>('rank');

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

  const [selectedRankId, setSelectedRankId] = useState<number>(current.id);

  // Сбрасываем выбранный ранг, если он перестал быть достигнутым
  useEffect(() => {
    const stillReached = reachedTiers.some((tier) => tier.id === selectedRankId);
    if (!stillReached) setSelectedRankId(current.id);
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
            onSelect={setSelectedRankId}
            showHeader={both}
          />
        </div>
      ) : null}
    </div>
  ) : null;

  const historyColumn: ReactNode = showHistory ? (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader title="История очков" />
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-4">
        <PointsHistoryTable db={db} history={history} />
      </div>
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
    showHistory ? { id: 'history' as const, label: 'История', Icon: Calendar, content: historyColumn } : null,
  ].filter(Boolean) as Array<{ id: 'rank' | 'history'; label: string; Icon: typeof Sparkle; content: ReactNode }>;

  const activeMobileSection = mobileSections.find((s) => s.id === mobilePanel) ?? mobileSections[0];

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
