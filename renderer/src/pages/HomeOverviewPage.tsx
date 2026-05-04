import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ChartColumn, ListTodo, PiggyBank, ReceiptText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryProgressCard } from '@/features/home/CategoryProgressCard';
import { DailyPlansCard } from '@/features/home/DailyPlansCard';
import { TasksCategoriesCard } from '@/features/home/TasksCategoriesCard';
import { TransactionsCard } from '@/features/transactions/TransactionsCard';
import { cn } from '@/lib/utils';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useDayLocked } from '@/shared/hooks/use-day-locked';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { useBootstrapData } from '@/shared/hooks/use-bootstrap-data';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobilePageShell, SectionTabsLayout } from '@/shared/ui/mobile';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { PageFrame } from '@/widgets/page-frame/PageFrame';

export function HomeOverviewPage() {
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const dayLocked = useDayLocked(db, Boolean(db), dateString);
  const dataTick = useAuraDataRefresh({ types: ['task-progress', 'timer', 'ritual', 'nutrition', 'diary', 'mood', 'transaction'] });
  const { loading: homeBootLoading } = useBootstrapData(
    'home',
    { date: dateString },
    [dateString, dataTick],
    {
      mode: 'initial-blocking',
      suppressLoadingAfterFirstSuccess: true,
      keepStaleOnError: true,
      cacheMs: 0,
      dedupeKey: `home:${dateString}:${dataTick}`,
    }
  );
  const vis = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db]);

  const showTasks = vis.home.tasksCategories !== false;
  const showTx = vis.home.transactions !== false;
  const showPlans = vis.home.dailyPlans !== false;
  const showChart = vis.home.categoryProgressChart !== false;
  const visibleBottomPanels = [showTx, showPlans, showChart].filter(Boolean).length;
  const showAnySection = showTasks || visibleBottomPanels > 0;
  const [probeRootEl, setProbeRootEl] = useState<HTMLDivElement | null>(null);
  const [desktopRowCount, setDesktopRowCount] = useState(0);
  const [mobileTab, setMobileTab] = useState<'tasks' | 'tx' | 'plans' | 'chart'>('tasks');
  const measureDesktopRows = useCallback(() => {
    const root = probeRootEl;
    if (!root) return;

    const samples = Array.from(root.querySelectorAll<HTMLElement>('[data-home-row-sample="1"]'));
    const tops = new Set<number>();
    for (const sample of samples) {
      const rect = sample.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      tops.add(Math.round(rect.top));
    }
    setDesktopRowCount((prev) => (prev === tops.size ? prev : tops.size));
  }, [probeRootEl]);

  useLayoutEffect(() => {
    if (!probeRootEl || !showAnySection || homeBootLoading) {
      setDesktopRowCount(0);
      return;
    }

    let raf = requestAnimationFrame(() => {
      measureDesktopRows();
    });

    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      measureDesktopRows();
    });

    const observed = Array.from(probeRootEl.querySelectorAll<HTMLElement>('[data-home-row-sample="1"]'));
    observed.forEach((el) => ro?.observe(el));

    const mo = new MutationObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        measureDesktopRows();
      });
    });
    mo.observe(probeRootEl, { childList: true, subtree: true, characterData: true, attributes: true });

    const onResize = () => measureDesktopRows();
    window.addEventListener('resize', onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [homeBootLoading, measureDesktopRows, probeRootEl, showAnySection, visibleBottomPanels, showTasks, showTx, showPlans, showChart]);

  const shouldUseCompactLayout = desktopRowCount > 2;

  const mobileSections = [
    showTasks ? { id: 'tasks' as const, label: 'Задачи', Icon: ListTodo, content: <TasksCategoriesCard /> } : null,
    showTx
      ? {
          id: 'tx' as const,
          label: 'Финансы',
          Icon: PiggyBank,
          content: <TransactionsCard contentClassName="min-h-0 flex-1 gap-2" />,
        }
      : null,
    showPlans
      ? {
          id: 'plans' as const,
          label: 'Планы',
          Icon: ReceiptText,
          content: <DailyPlansCard contentClassName="min-h-0 flex-1 gap-2" />,
        }
      : null,
    showChart
      ? {
          id: 'chart' as const,
          label: 'Прогресс',
          Icon: ChartColumn,
          content: <CategoryProgressCard contentClassName="min-h-0 flex-1 rounded-lg border border-border/60 bg-card/80 p-2 shadow-sm" />,
        }
      : null,
  ].filter(Boolean) as Array<{ id: 'tasks' | 'tx' | 'plans' | 'chart'; label: string; Icon: typeof ListTodo; content: ReactNode }>;

  const desktopGrid = (sampleRows = false) => (
    <div className="flex min-h-0 flex-1 flex-col divide-y divide-border/60 aura-content-fade-in h-full">
      {showTasks ? (
        <section
          className={cn(
            'flex min-h-0 flex-col overflow-hidden',
            !visibleBottomPanels && 'flex-1'
          )}
          data-home-row-sample={sampleRows ? '1' : undefined}
        >
          <MegaPanelHeader title="Категории задач" locked={dayLocked} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-0">
            <TasksCategoriesCard />
          </div>
        </section>
      ) : null}
      {visibleBottomPanels > 0 ? (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden h-full">
          <div
            className={cn(
              'flex min-h-0 flex-1 h-full overflow-hidden',
              visibleBottomPanels === 1 && 'flex-col divide-y divide-border/40',
              visibleBottomPanels >= 2 && 'flex-row divide-x divide-border/40'
            )}
          >
            {showTx ? (
              <div
                className="flex min-h-0 flex-1 flex-col overflow-hidden h-full"
                data-home-row-sample={sampleRows ? '1' : undefined}
              >
                <MegaPanelHeader title="Финансы" />
                <TransactionsCard contentClassName="min-h-0 flex-1 gap-1 p-3 pr-0.5" />
              </div>
            ) : null}
            {showPlans ? (
              <div
                className="flex min-h-0 flex-1 flex-col overflow-hidden h-full"
                data-home-row-sample={sampleRows ? '1' : undefined}
              >
                <MegaPanelHeader title="Планы" />
                <DailyPlansCard contentClassName="min-h-0 flex-1 gap-1.5 p-3 pr-0.5" />
              </div>
            ) : null}
            {showChart ? (
              <div
                className="flex min-h-0 flex-1 flex-col overflow-hidden h-full"
                data-home-row-sample={sampleRows ? '1' : undefined}
              >
                <MegaPanelHeader title="Прогресс" />
                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <CategoryProgressCard contentClassName="min-h-0 flex-1 p-0" />
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );

  const desktopRowProbe = () => (
    <div
      className={cn(
        'grid min-h-0 flex-1',
        showTasks && visibleBottomPanels > 0 && 'grid-rows-[minmax(0,auto)_minmax(0,1fr)]',
        showTasks && visibleBottomPanels === 0 && 'grid-rows-1',
        !showTasks && visibleBottomPanels > 0 && 'grid-rows-1'
      )}
    >
      {showTasks ? <div className="h-8" data-home-row-sample="1" /> : null}
      {visibleBottomPanels > 0 ? (
        <div
          className={cn(
            'grid',
            visibleBottomPanels === 1 && 'grid-cols-1',
            visibleBottomPanels === 2 && 'grid-cols-1 md:grid-cols-2',
            visibleBottomPanels >= 3 && 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          )}
        >
          {showTx ? <div className="h-8" data-home-row-sample="1" /> : null}
          {showPlans ? <div className="h-8" data-home-row-sample="1" /> : null}
          {showChart ? <div className="h-8" data-home-row-sample="1" /> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {!showAnySection ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-5">
              <p className="text-muted-foreground text-sm">Включите секции главной страницы в настройках приложения.</p>
            </div>
          ) : homeBootLoading ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
              <div className="bg-muted h-9 w-1/3 rounded-lg" />
              <div className="bg-muted/80 h-28 rounded-xl" />
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                <div className="bg-muted/70 min-h-28 rounded-xl" />
                <div className="bg-muted/60 min-h-28 rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div ref={setProbeRootEl} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0">
                {desktopRowProbe()}
              </div>
              {shouldUseCompactLayout ? (
                <SectionTabsLayout sections={mobileSections} value={mobileTab} onChange={setMobileTab} />
              ) : (
                <>
                  <MobilePageShell sections={mobileSections} value={mobileTab} onChange={setMobileTab} />
                  <div className="hidden min-h-0 flex-1 lg:block">
                    {desktopGrid(false)}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
