import { useMemo, useState } from 'react';
import { ChartColumn, ListTodo, PiggyBank, ReceiptText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryProgressCard } from '@/features/home/CategoryProgressCard';
import { DailyPlansCard } from '@/features/home/DailyPlansCard';
import { TasksCategoriesCard } from '@/features/home/TasksCategoriesCard';
import { TransactionsCard } from '@/features/transactions/TransactionsCard';
import { cn } from '@/lib/utils';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobileSectionSwitcher } from '@/shared/ui/mobile-section-switcher';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { PageFrame } from '@/widgets/page-frame/PageFrame';

export function HomeOverviewPage() {
  const { db, ready } = useAuraDb();
  const vis = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db, ready]);

  const showTasks = vis.home.tasksCategories !== false;
  const showTx = vis.home.transactions !== false;
  const showPlans = vis.home.dailyPlans !== false;
  const showChart = vis.home.categoryProgressChart !== false;
  const visibleBottomPanels = [showTx, showPlans, showChart].filter(Boolean).length;
  const showAnySection = showTasks || visibleBottomPanels > 0;
  const [mobileTab, setMobileTab] = useState<'tasks' | 'tx' | 'plans' | 'chart'>('tasks');
  const mobileSections = [
    showTasks ? { id: 'tasks' as const, label: 'Задачи', Icon: ListTodo } : null,
    showTx ? { id: 'tx' as const, label: 'Финансы', Icon: PiggyBank } : null,
    showPlans ? { id: 'plans' as const, label: 'Планы', Icon: ReceiptText } : null,
    showChart ? { id: 'chart' as const, label: 'Диагр.', Icon: ChartColumn } : null,
  ].filter(Boolean) as Array<{ id: 'tasks' | 'tx' | 'plans' | 'chart'; label: string; Icon: typeof ListTodo }>;

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {!showAnySection ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-5">
              <p className="text-muted-foreground text-sm">Включите секции главной страницы в настройках приложения.</p>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {showTasks && mobileTab === 'tasks' ? (
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-0">
                      <TasksCategoriesCard />
                    </div>
                  ) : null}
                  {showTx && mobileTab === 'tx' ? (
                    <div className={cn(MEGA_PANEL_BODY_CN, 'gap-1')}>
                      <TransactionsCard contentClassName="min-h-0 flex-1 gap-1" />
                    </div>
                  ) : null}
                  {showPlans && mobileTab === 'plans' ? (
                    <div className={cn(MEGA_PANEL_BODY_CN, 'gap-1')}>
                      <DailyPlansCard contentClassName="min-h-0 flex-1 gap-1" />
                    </div>
                  ) : null}
                  {showChart && mobileTab === 'chart' ? (
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain flex overflow-hidden p-0">
                      <CategoryProgressCard contentClassName="min-h-0 flex-1 p-0" />
                    </div>
                  ) : null}
                </div>
                <MobileSectionSwitcher sections={mobileSections} value={mobileTab} onChange={setMobileTab} />
              </div>
              <div
                className={cn(
                  'hidden min-h-0 flex-1 divide-y divide-border/60 aura-content-fade-in lg:grid',
                  showTasks && visibleBottomPanels > 0 && 'grid-rows-[minmax(0,auto)_minmax(0,1fr)]',
                  showTasks && visibleBottomPanels === 0 && 'grid-rows-1',
                  !showTasks && visibleBottomPanels > 0 && 'grid-rows-1'
                )}
              >
              {showTasks ? (
                <section className="flex min-h-0 flex-col overflow-hidden">
                  <MegaPanelHeader title="Категории задач" />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-0">
                    <TasksCategoriesCard />
                  </div>
                </section>
              ) : null}
              {visibleBottomPanels > 0 ? (
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div
                    className={cn(
                      'grid min-h-0 flex-1',
                      visibleBottomPanels === 1 && 'grid-cols-1',
                      visibleBottomPanels === 2 && 'grid-cols-1 divide-y divide-border/50 md:grid-cols-2 md:divide-x md:divide-y-0',
                      visibleBottomPanels >= 3 && 'grid-cols-1 divide-y divide-border/50 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3'
                    )}
                  >
                    {showTx ? (
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <MegaPanelHeader title="Финансы" />
                        <div className={cn(MEGA_PANEL_BODY_CN, 'gap-1')}>
                          <TransactionsCard contentClassName="min-h-0 flex-1 gap-1" />
                        </div>
                      </div>
                    ) : null}
                    {showPlans ? (
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <MegaPanelHeader title="Планы" />
                        <div className={cn(MEGA_PANEL_BODY_CN, 'gap-1')}>
                          <DailyPlansCard contentClassName="min-h-0 flex-1 gap-1" />
                        </div>
                      </div>
                    ) : null}
                    {showChart ? (
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <MegaPanelHeader title="Прогресс" />
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain flex overflow-hidden p-0">
                          <CategoryProgressCard contentClassName="min-h-0 flex-1 p-0" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
