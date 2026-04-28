import { CustomSelect } from './composites/index.js';
import PageManager from './features/pages/PageManager.js';
import { TopNavigation, BottomNavigation } from './components/navigation/index.js';
import TitleBar from './components/layout/TitleBar.js';
import { DEFAULT_ACCENT } from './design-system/tokens/colorConstants.js';
import { selectedDateState } from './system/state/index.js';
import { stateService, audioSystem, taskCategoriesConfigService } from './system/services/index.js';
import eventBus from './system/core/EventBus.js';
import SplashScreen from './components/display/SplashScreen.js';

import { initDatabaseService, waitForDatabase } from './bootstrap/databaseReady.js';
import { loadSavedVisualSettings } from './bootstrap/visualSettings.js';
import { setupFormSoundHandlers } from './bootstrap/formSounds.js';
import { initSettingsChangeTracker } from './bootstrap/settingsChangeTrackerInit.js';
import { registerEventBusWindowBridge } from './bootstrap/eventBusCompat.js';
import { registerPointsManagerAndHandlers } from './bootstrap/pointsTimerHandlers.js';
import { registerRendererReloadHotkeys, registerAmbientStopOnUnload } from './bootstrap/reloadUnload.js';

// БД: main.js передаёт window.getDB; до загрузки — заглушка в databaseReady
initDatabaseService();

if (typeof window !== 'undefined') {
  window.audioSystem = audioSystem;
  console.log('[AURA] ✅ Звуковая система инициализирована');
}

let splashScreen = null;

document.addEventListener('DOMContentLoaded', async () => {
  const { initDialogFix } = await import('./utils/dialogFix.js');
  initDialogFix();
  loadSavedVisualSettings();

  console.log('[AURA] Ожидание готовности базы данных...');
  await waitForDatabase();
  console.log('[AURA] База данных готова, продолжаем инициализацию');

  try {
    const getDB = window.getDB;
    if (getDB && typeof getDB === 'function') {
      const db = getDB();
      if (db) {
        const settings = db.getAppSettings();
        const enabled = settings && (settings.devtools_tab_enabled === 1 || settings.devtools_tab_enabled === true);
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('devtools-tab-setting-changed', enabled);
      }
    }
  } catch (e) {
    console.warn('[AURA] Ошибка отправки настройки DevTools Tab в main:', e);
  }

  taskCategoriesConfigService.init();

  const isMac = process.platform === 'darwin';
  document.body.classList.toggle('platform-windows', !isMac);
  document.documentElement.style.setProperty('--layout-title-bar-height', isMac ? '0px' : '36px');
  if (!isMac) {
    const titleBarContainer = document.getElementById('title-bar-container');
    if (titleBarContainer) {
      const titleBar = new TitleBar({
        title: 'AURA'
      });
      await titleBar.init();
      titleBarContainer.appendChild(titleBar.element);
    }
  } else {
    const titleBarContainer = document.getElementById('title-bar-container');
    if (titleBarContainer) {
      titleBarContainer.style.display = 'none';
    }
  }

  const splashContainer = document.getElementById('splash-screen-container');
  if (splashContainer) {
    splashScreen = new SplashScreen({
      title: 'AURA',
      minDisplayTime: 1500
    });
    await splashScreen.init();
    splashContainer.appendChild(splashScreen.element);
    splashScreen.show();
  }

  await setupFormSoundHandlers(audioSystem);

  const customSelects = document.querySelectorAll('.custom-select-wrapper');
  await Promise.all(Array.from(customSelects).map(async (wrapper) => {
    const customSelect = new CustomSelect(wrapper);
    await customSelect.init();
  }));

  window.addEventListener('currency-changed', async (e) => {
    const { formatCurrency } = await import('./utils/index.js');
    const { resetCurrencyCache } = formatCurrency;
    resetCurrencyCache();
    console.log('[AURA] Валюта изменена:', e.detail);
  });

  window.addEventListener('iconThemeChanged', async (e) => {
    console.log('[AURA] Тема иконок изменена:', e.detail.theme);
    const { applyIconBackground } = await import('./utils/colorConversion.js');

    document.querySelectorAll('.act-card-icon.has-color, .cfg-card-icon.has-color, .stats-table-header-icon-badge').forEach((iconWrapper) => {
      const iconColor = iconWrapper.style.getPropertyValue('--icon-color') ||
        getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
        DEFAULT_ACCENT;

      applyIconBackground(iconWrapper, iconColor);
    });
  });

  await initSettingsChangeTracker();

  const pageContainer = document.querySelector('.page-content');
  let pageManager = null;
  if (pageContainer) {
    pageManager = new PageManager(pageContainer);
    window.pageManager = pageManager;
    stateService.setPageManager(pageManager);

    const pendingPage = sessionStorage.getItem('aura_pending_page');
    if (pendingPage) {
      console.log('[AURA] Восстанавливаем страницу после перезагрузки:', pendingPage);
      sessionStorage.removeItem('aura_pending_page');
      if (window.settingsChangeTracker) {
        window.settingsChangeTracker.clearChanges();
      }
      setTimeout(() => {
        pageManager.showPage(pendingPage, { skipReloadCheck: true });
        setTimeout(() => {
          if (window.bottomNav && typeof window.bottomNav.setSelectedPage === 'function') {
            window.bottomNav.setSelectedPage(pendingPage);
          }
        }, 100);
      }, 200);
    }
  }

  const topNavContainer = document.querySelector('.top-navigation-container');
  let topNav = null;
  if (topNavContainer) {
    topNav = new TopNavigation();
    const navElement = await topNav.render();
    topNavContainer.appendChild(navElement);
    window.topNav = topNav;
    stateService.setTopNav(topNav);

    if (pageManager) {
      const currentPageId = pageManager.currentPage?.className?.includes('page-stats') ? 'stats' :
        pageManager.currentPage?.className?.includes('page-settings') ? 'settings' :
          pageManager.currentPage?.className?.includes('page-ranks') ? 'ranks' : 'home';
      if (currentPageId === 'stats' || currentPageId === 'settings' || currentPageId === 'ranks') {
        topNavContainer.style.display = 'none';
      }
    }
    requestAnimationFrame(() => window.updateLayoutNavHeights?.());
  }

  const bottomNavContainer = document.querySelector('.bottom-navigation-container');
  if (bottomNavContainer) {
    const bottomNav = new BottomNavigation({
      selectedIndex: 0,
      onChange: (index, page) => {
        console.log('Выбрана страница:', page.name, index);

        if (pageManager) {
          const pageId = page.id || 'home';
          pageManager.showPage(pageId);

          if (topNavContainer) {
            if (pageId === 'stats' || pageId === 'settings' || pageId === 'ranks') {
              topNavContainer.style.display = 'none';
            } else {
              topNavContainer.style.display = '';
            }
            requestAnimationFrame(() => window.updateLayoutNavHeights?.());
          }
        }
      }
    });
    const navElement = await bottomNav.render();
    bottomNavContainer.appendChild(navElement);
    window.bottomNav = bottomNav;
    stateService.setBottomNav(bottomNav);

    window.addEventListener('bottomNavDisplayChanged', async (event) => {
      console.log('[index.js] Событие bottomNavDisplayChanged получено:', event.detail);
      if (bottomNav && typeof bottomNav.updateDisplayMode === 'function') {
        console.log('[index.js] Обновление режима отображения нижнего меню');
        await bottomNav.updateDisplayMode();
        requestAnimationFrame(() => window.updateLayoutNavHeights?.());
      } else {
        console.warn('[index.js] bottomNav не инициализирован или метод updateDisplayMode отсутствует');
      }
    });

    window.addEventListener('nav-order-changed', async () => {
      if (bottomNav && typeof bottomNav.rebuildForNewOrder === 'function') {
        await bottomNav.rebuildForNewOrder();
        requestAnimationFrame(() => window.updateLayoutNavHeights?.());
      }
    });

    window.addEventListener('devtoolsTabEnabledChanged', async (event) => {
      console.log('[index.js] Событие devtoolsTabEnabledChanged получено:', event.detail);
      try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('devtools-tab-setting-changed', event.detail.enabled);
        console.log('[index.js] IPC сообщение отправлено в main процесс');
      } catch (e) {
        console.warn('[index.js] Ошибка отправки IPC сообщения:', e);
      }
    });
  }

  function updateLayoutNavHeights() {
    const topNavEl = document.querySelector('.top-navigation-container');
    const bottomNavEl = document.querySelector('.bottom-navigation-container');
    const getHeight = (el) => {
      if (!el) return 0;
      const h = el.getBoundingClientRect().height || el.offsetHeight;
      return Math.round(h) || 0;
    };
    const topHeight = topNavEl && topNavEl.style.display !== 'none' ? getHeight(topNavEl) : 0;
    const bottomHeight = getHeight(bottomNavEl);
    document.documentElement.style.setProperty('--layout-nav-top-height', `${topHeight}px`);
    if (bottomHeight > 0) document.documentElement.style.setProperty('--layout-nav-bottom-height', `${bottomHeight}px`);
  }

  window.updateLayoutNavHeights = updateLayoutNavHeights;
  requestAnimationFrame(() => {
    updateLayoutNavHeights();
    requestAnimationFrame(updateLayoutNavHeights);
  });
  window.addEventListener('resize', updateLayoutNavHeights);

  stateService.setSelectedDateState(selectedDateState);

  registerPointsManagerAndHandlers(eventBus, selectedDateState);
  registerEventBusWindowBridge(eventBus);
  registerRendererReloadHotkeys();
  registerAmbientStopOnUnload();

  Promise.all([
    new Promise((resolve) => {
      setTimeout(resolve, 100);
    })
  ]).then(async () => {
    if (splashScreen) {
      await splashScreen.hide();
    }
    requestAnimationFrame(() => window.updateLayoutNavHeights?.());
  });
});
