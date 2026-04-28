import { useReducer, useState } from 'react';
import { ChartColumn, SlidersHorizontal } from 'lucide-react';
import { useRadioGroupSlideAnimation, getSlideAnimationClasses } from '@/shared/hooks/use-radio-group-slide-animation';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { StatsControlsState, StatsGroupBy } from '@/shared/stats/types';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { StatsControlsPanel } from '@/features/stats/StatsControlsPanel';
import { primaryChartHint, secondaryChartHint } from '@/features/stats/stats-chart-hints';
import { StatsChartShell } from '@/features/stats/stats-chart-shell';
import { StatsPrimaryChart } from '@/features/stats/StatsPrimaryChart';
import { StatsSecondaryChart } from '@/features/stats/StatsSecondaryChart';
import { StatsTableView } from '@/features/stats/StatsTableView';
import { useStatsData } from '@/features/stats/use-stats-data';
import {
  MEGA_PANEL_BODY_CN,
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobileSectionSwitcher } from '@/shared/ui/mobile-section-switcher';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';

function defaultDates(period: number): Pick<StatsControlsState, 'startDate' | 'endDate' | 'period'> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - period);
  return {
    period,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const initialControls = (): StatsControlsState => ({
  mode: 'tasks',
  viewType: 'table',
  groupBy: 'categories',
  aggregation: 'day',
  selectedSeriesKeys: null,
  ...defaultDates(30),
});

type Action = { type: 'patch'; patch: Partial<StatsControlsState> };

function controlsReducer(state: StatsControlsState, action: Action): StatsControlsState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

function secondaryTitle(mode: StatsControlsState['mode'], groupBy: StatsGroupBy): string {
  if (mode === 'correlation') return 'Сила связи с успехом';
  if (mode === 'rank') return 'Накопление очков';
  if (mode === 'finance') return 'Баланс по периодам';
  if (mode === 'tasks' || mode === 'rituals') return 'Рейтинг выполнения';
  if (mode === 'time' || mode === 'leisure') return 'Распределение времени';
  if (mode === 'nutrition' && groupBy === 'elements') return 'Топ по калориям';
  if (mode === 'nutrition') return 'Макросы по периодам';
  return 'Сводка за период';
}

export function StatsOverviewPage() {
  const { db, ready } = useAuraDb();
  const [controls, dispatch] = useReducer(controlsReducer, undefined, initialControls);
  const [mobileTab, setMobileTab] = useState<'filters' | 'content'>('content');
  const viewSlideDirection = useRadioGroupSlideAnimation(controls.viewType, ['table', 'chart'] as const);

  const patch = (p: Partial<StatsControlsState>) => dispatch({ type: 'patch', patch: p });

  const { dayRows, aggregated, rankDailyAggregated, meta, table, allSeriesKeys } = useStatsData(
    db,
    ready,
    controls
  );

  const primaryRows =
    controls.mode === 'rank' && rankDailyAggregated && rankDailyAggregated.length > 0
      ? rankDailyAggregated
      : aggregated ?? [];

  const cumulativeRows = controls.mode === 'rank' ? aggregated ?? null : null;

  const primaryTitle =
    controls.mode === 'rank'
      ? 'Очки за день'
      : controls.mode === 'correlation'
        ? 'Факторы по дням'
        : 'Основной график';

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {!ready || !db ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
              Загрузка…
            </div>
          ) : (
            <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-border/60 overflow-hidden aura-content-fade-in lg:grid-cols-[minmax(12.5rem,16rem)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
              <aside className="bg-muted/15 hidden min-h-0 flex-col overflow-hidden border-border/40 lg:flex">
                <MegaPanelHeader title="Параметры статистики" />
                <div className={MEGA_PANEL_BODY_CN}>
                  <StatsControlsPanel state={controls} onChange={patch} seriesKeys={allSeriesKeys} meta={meta} />
                </div>
              </aside>
              <section className="bg-card/30 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {mobileTab === 'filters' ? (
                      <div className={MEGA_PANEL_BODY_CN}>
                        <StatsControlsPanel state={controls} onChange={patch} seriesKeys={allSeriesKeys} meta={meta} />
                      </div>
                    ) : null}
                    {mobileTab === 'content' ? (
                      controls.viewType === 'table' ? (
                        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden p-2.5", getSlideAnimationClasses(true, viewSlideDirection))}>
                          <StatsTableView
                            mode={controls.mode}
                            table={table}
                            meta={meta}
                            selectedSeriesKeys={controls.selectedSeriesKeys}
                          />
                        </div>
                      ) : (
                        <div className={MEGA_PANEL_BODY_CN}>
                          <div className="grid h-full min-h-0 flex-1 grid-cols-1 auto-rows-[minmax(15rem,1fr)] gap-2 overflow-y-auto">
                            <StatsChartShell title={primaryTitle} hint={primaryChartHint(controls.mode, controls.groupBy)} className="min-h-0">
                              <StatsPrimaryChart
                                mode={controls.mode}
                                groupBy={controls.groupBy}
                                aggregation={controls.aggregation}
                                rows={primaryRows}
                                dayRows={dayRows}
                                meta={meta}
                                selectedSeriesKeys={controls.selectedSeriesKeys}
                              />
                            </StatsChartShell>
                            <StatsChartShell title={secondaryTitle(controls.mode, controls.groupBy)} hint={secondaryChartHint(controls.mode, controls.groupBy)} className="min-h-0">
                              <StatsSecondaryChart
                                mode={controls.mode}
                                groupBy={controls.groupBy}
                                aggregation={controls.aggregation}
                                aggregatedRows={aggregated ?? []}
                                dayRows={dayRows}
                                meta={meta}
                                selectedSeriesKeys={controls.selectedSeriesKeys}
                                rankCumulativeRows={cumulativeRows}
                              />
                            </StatsChartShell>
                          </div>
                        </div>
                      )
                    ) : null}
                  </div>
                  <MobileSectionSwitcher
                    sections={[
                      { id: 'filters', label: 'Фильтры', icon: SlidersHorizontal },
                      { id: 'content', label: 'Контент', icon: ChartColumn },
                    ]}
                    value={mobileTab}
                    onChange={setMobileTab}
                  />
                </div>
                <div className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
                  <MegaPanelHeader title={controls.viewType === 'table' ? 'Таблица' : 'Графики'} />
                  {controls.viewType === 'table' ? (
                  <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden p-2.5 sm:p-4", getSlideAnimationClasses(true, viewSlideDirection))}>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <StatsTableView
                        mode={controls.mode}
                        table={table}
                        meta={meta}
                        selectedSeriesKeys={controls.selectedSeriesKeys}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={MEGA_PANEL_BODY_CN}>
                    <div className="grid h-full min-h-0 flex-1 grid-cols-1 auto-rows-[minmax(16rem,1fr)] gap-2 overflow-y-auto pr-0.5 sm:auto-rows-[minmax(18rem,1fr)] sm:gap-2.5 sm:pr-1">
                      <StatsChartShell
                        title={primaryTitle}
                        hint={primaryChartHint(controls.mode, controls.groupBy)}
                        className="min-h-0"
                      >
                        <StatsPrimaryChart
                          mode={controls.mode}
                          groupBy={controls.groupBy}
                          aggregation={controls.aggregation}
                          rows={primaryRows}
                          dayRows={dayRows}
                          meta={meta}
                          selectedSeriesKeys={controls.selectedSeriesKeys}
                        />
                      </StatsChartShell>
                      <StatsChartShell
                        title={secondaryTitle(controls.mode, controls.groupBy)}
                        hint={secondaryChartHint(controls.mode, controls.groupBy)}
                        className="min-h-0"
                      >
                        <StatsSecondaryChart
                          mode={controls.mode}
                          groupBy={controls.groupBy}
                          aggregation={controls.aggregation}
                          aggregatedRows={aggregated ?? []}
                          dayRows={dayRows}
                          meta={meta}
                          selectedSeriesKeys={controls.selectedSeriesKeys}
                          rankCumulativeRows={cumulativeRows}
                        />
                      </StatsChartShell>
                    </div>
                  </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
