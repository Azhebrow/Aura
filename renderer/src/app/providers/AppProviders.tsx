import { Fragment, useEffect, type ReactNode } from 'react';
import { ShellProvider } from '@/app/navigation/shell-context';
import { SelectedDateProvider } from '@/features/selected-date/selected-date-context';
import { warmIconsManifest } from '@/features/settings/load-icons-manifest';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { ThemeSync } from '@/features/theme/ThemeSync';
import { DesignTokensSync } from '@/features/theme/DesignTokensSync';
import { ChromeArrowNavigation } from '@/widgets/app-chrome/ChromeArrowNavigation';

/**
 * Корневые провайдеры renderer.
 * Порядок: тема → дата → навигация → layout.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    warmIconsManifest();
  }, []);

  return (
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
  );
}
