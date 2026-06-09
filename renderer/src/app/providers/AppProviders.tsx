import { Fragment, useEffect, type ReactNode } from 'react';
import { ShellProvider } from '@/app/navigation/shell-context';
import { SelectedDateProvider } from '@/features/selected-date/selected-date-context';
import { warmIconsManifest } from '@/features/settings/load-icons-manifest';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { ThemeSync } from '@/features/theme/ThemeSync';
import { DesignTokensSync } from '@/features/theme/DesignTokensSync';
import { LanguageProvider } from '@/app/providers/LanguageContext';
import { ChromeArrowNavigation } from '@/widgets/app-chrome/ChromeArrowNavigation';
import { registerPointsService } from '@/shared/services/PointsService';
import '@/i18n/config';

// Регистрируем PointsService глобально — используется useDayLocked, CalendarPage и др.
registerPointsService();

/**
 * Корневые провайдеры renderer.
 * Порядок: язык → тема → дата → навигация → layout.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    warmIconsManifest();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <ThemeSync />
        <DesignTokensSync />
        <SelectedDateProvider>
          <ShellProvider>
            <Fragment>
              <ChromeArrowNavigation />
              {children}
            </Fragment>
          </ShellProvider>
        </SelectedDateProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
