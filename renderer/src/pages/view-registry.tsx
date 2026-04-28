import type { PageId } from '@/shared/config/nav-model';
import { NAV_PAGE_DEFINITIONS } from '@/shared/config/nav-model';
import { HomeOverviewPage } from '@/pages/HomeOverviewPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { RanksPage } from '@/pages/RanksPage';
import { RitualsPage } from '@/pages/RitualsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StatsOverviewPage } from '@/pages/StatsOverviewPage';
import { CalendarPage } from '@/pages/CalendarPage';
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
    case 'ranks':
      return <RanksPage />;
    case 'stats':
      return <StatsOverviewPage />;
    case 'calendar':
      return <CalendarPage />;
    default:
      return <PlaceholderPage page={NAV_PAGE_DEFINITIONS[pageId]} />;
  }
}
