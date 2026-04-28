type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  isExpanded?: boolean;
  requestFullscreen?: () => void;
  onEvent?: (event: string, handler: () => void) => void;
  setHeaderColor?: (colorKey: 'bg_color' | 'secondary_bg_color' | string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
};

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const telegram = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return telegram?.WebApp ?? null;
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  document.documentElement.dataset.auraMiniapp = '1';

  const applyFullscreen = () => {
    try {
      webApp.expand?.();
      webApp.requestFullscreen?.();
      webApp.disableVerticalSwipes?.();
      // Makes header blend into app background in supported clients.
      webApp.setHeaderColor?.('bg_color');
    } catch {
      /* ignore */
    }
  };

  try {
    webApp.ready?.();
    applyFullscreen();
    // Telegram clients can initialize viewport asynchronously.
    window.setTimeout(applyFullscreen, 120);
    window.setTimeout(applyFullscreen, 420);
    window.setTimeout(applyFullscreen, 900);
    webApp.onEvent?.('viewportChanged', applyFullscreen);
  } catch {
    /* ignore mini-app bridge errors */
  }
}
