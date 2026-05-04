import { useReducer, useState } from 'react';
import { ChartColumn, Table2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { StatsControlsState } from '@/shared/stats/types';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import { StatsControlsPanel } from '@/features/stats/StatsControlsPanel';
import { StatsChartView } from '@/features/stats/StatsChartView';
import { StatsTableView } from '@/features/stats/StatsTableView';
import { useStatsData } from '@/features/stats/use-stats-data';
import { ModeSwitchHeader } from '@/shared/ui/mode-switch-header';
import { LoadingShell } from '@/shared/ui/data-states';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
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
  groupBy: 'categories',
  aggregation: 'day',
  selectedSeriesKeys: null,
  ...defaultDates(30),
});

type DesktopView = 'chart' | 'table';

type Action = { type: 'patch'; patch: Partial<StatsControlsState> };

function controlsReducer(state: StatsControlsState, action: Action): StatsControlsState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

export function StatsOverviewPage() {
  const { db, ready } = useAuraDb();
  const [controls, dispatch] = useReducer(controlsReducer, undefined, initialControls);
  const [desktopView, setDesktopView] = useState<DesktopView>('chart');
  const patch = (p: Partial<StatsControlsState>) => dispatch({ type: 'patch', patch: p });
  const { meta, table, allSeriesKeys, currencyCode, timeSummary, loading } = useStatsData(db, ready, controls);

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          {!ready ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <LoadingShell rows={4} />
            </div>
          ) : !db ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              Статистика недоступна: не удалось получить доступ к локальной базе.
            </div>
          ) : (
            <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-border/60 overflow-hidden aura-content-fade-in lg:grid-cols-[minmax(13.5rem,16rem)_minmax(0,1fr)] lg:divide-x lg:divide-y-0 xl:grid-cols-[minmax(14.5rem,17rem)_minmax(0,1fr)]">
              <aside className="bg-muted/15 hidden min-h-0 flex-col overflow-hidden border-border/40 lg:flex">
                <MegaPanelHeader title="Управление данными" />
                <ScrollArea className="h-full min-h-0">
                  <div className={MEGA_PANEL_BODY_CN}>
                    <StatsControlsPanel state={controls} onChange={patch} seriesKeys={allSeriesKeys} meta={meta} />
                  </div>
                </ScrollArea>
              </aside>

              <section className="bg-card/30 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <ModeSwitchHeader
                  value={desktopView}
                  onValueChange={setDesktopView}
                  options={[
                    { value: 'chart', label: 'Диаграммы', Icon: ChartColumn },
                    { value: 'table', label: 'Таблица', Icon: Table2 },
                  ]}
                  ariaLabel="Вид статистики"
                />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
                  <div className="lg:hidden">
                    <StatsControlsPanel state={controls} onChange={patch} seriesKeys={allSeriesKeys} meta={meta} />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                    {loading ? (
                      <div className="flex min-h-0 flex-1 items-center justify-center">
                        <LoadingShell rows={6} className="w-full max-w-2xl" />
                      </div>
                    ) : desktopView === 'chart' ? (
                      <StatsChartView
                        key={`chart-${controls.mode}-${controls.groupBy}-${controls.aggregation}-${desktopView}`}
                        mode={controls.mode}
                        groupBy={controls.groupBy}
                        aggregation={controls.aggregation}
                        table={table}
                        meta={meta}
                        selectedSeriesKeys={controls.selectedSeriesKeys}
                        currencyCode={currencyCode}
                        timeSummary={timeSummary}
                      />
                    ) : (
                      <StatsTableView
                        key={`table-${controls.mode}-${controls.groupBy}-${controls.aggregation}-${desktopView}`}
                        mode={controls.mode}
                        table={table}
                        meta={meta}
                        selectedSeriesKeys={controls.selectedSeriesKeys}
                      />
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
