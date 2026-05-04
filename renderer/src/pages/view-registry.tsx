import type { PageId } from '@/shared/config/nav-model';
import { HomeOverviewPage } from './HomeOverviewPage';
import { RanksPage } from './RanksPage';
import { RitualsPage } from './RitualsPage';
import { SettingsPage } from './SettingsPage';
import { StatsOverviewPage } from './StatsOverviewPage';
import { CalendarPage } from './CalendarPage';
import { DiaryEditorPage } from '@/features/diary/DiaryEditorPage';
import { TimerStatusPage } from '@/features/timer/TimerStatusPage';

/**
 * Реестр представлений: один вход на `PageId` — как `PageManager.pages` в legacy.
 */
export function ActivePageView({ pageId }: { pageId: PageId }) {
  switch (pageId) {
    case 'home':
      return <HomeOverviewPage />;
    case 'diary':
      return <DiaryEditorPage />;
    case 'timer':
      return <TimerStatusPage />;
    case 'settings':
      return <SettingsPage />;
    case 'rituals':
      return <RitualsPage />;
    case 'stats':
      return <StatsOverviewPage />;
    case 'ranks':
      return <RanksPage />;
    case 'calendar':
      return <CalendarPage />;
    default:
      return null;
  }
}
