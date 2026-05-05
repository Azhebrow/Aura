import { useEffect } from 'react';
import { useShell } from '@/app/navigation/shell-context';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { getNavPageIds, type PageId } from '@/shared/config/nav-model';

function isArrowNavigationBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[data-chrome-arrows-disabled]')) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('[data-slot="slider"]')) return true;
  if (target.closest('[data-slot="select-trigger"]') || target.closest('[data-slot="select-content"]')) return true;
  if (target.closest('[role="dialog"]') || target.closest('[role="alertdialog"]')) return true;
  if (target.closest('[role="tablist"]')) return true;
  const role = target.getAttribute('role');
  if (role === 'slider' || role === 'spinbutton' || role === 'listbox' || role === 'menu' || role === 'menuitem' || role === 'option')
    return true;
  return false;
}

/** Порядок страниц для ↑/↓: календарь исключаем, чтобы он не попадал в циклический список. */
function pageIdsForVerticalNav(navOrder: readonly PageId[]): PageId[] {
  const ordered = getNavPageIds(navOrder);
  const main = ordered.filter((id) => id !== 'settings' && id !== 'calendar');
  const hasSettings = ordered.includes('settings');
  return hasSettings ? [...main, 'settings'] : main;
}

/**
 * Глобально: ← → — предыдущий / следующий день, ↑ ↓ — предыдущая / следующая страница (порядок как в сайдбаре).
 */
export function ChromeArrowNavigation() {
  const { addDays, canGoNext } = useSelectedDate();
  const { activePageId, setActivePageId, navOrder } = useShell();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (isArrowNavigationBlocked(e.target)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        addDays(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        if (!canGoNext) return;
        e.preventDefault();
        addDays(1);
        return;
      }

      const chain = pageIdsForVerticalNav(navOrder);
      if (chain.length === 0) return;
      const idx = chain.indexOf(activePageId);
      const current = idx >= 0 ? idx : 0;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = (current - 1 + chain.length) % chain.length;
        setActivePageId(chain[next]!);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (current + 1) % chain.length;
        setActivePageId(chain[next]!);
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addDays, canGoNext, activePageId, setActivePageId, navOrder]);

  return null;
}
