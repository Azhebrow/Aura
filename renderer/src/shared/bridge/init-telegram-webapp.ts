type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  isExpanded?: boolean;
  requestFullscreen?: () => void;
  version?: string;
  onEvent?: (event: string, handler: () => void) => void;
  setHeaderColor?: (colorKey: 'bg_color' | 'secondary_bg_color' | string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
};

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) return null;
  const telegram = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return telegram?.WebApp ?? null;
}

function loadTelegramScript() {
  return new Promise<void>((resolve) => {
    if (typeof document === 'undefined') return resolve();
    if (document.querySelector('script[data-aura-telegram-webapp]')) return resolve();
    const script = document.createElement('script');
    script.dataset.auraTelegramWebapp = '1';
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function supportsRequestFullscreen(webApp: TelegramWebApp): boolean {
  const raw = typeof webApp.version === 'string' ? webApp.version : '';
  const match = /^(\d+)(?:\.(\d+))?/.exec(raw);
  if (!match) return false;
  const major = Number(match[1] ?? 0);
  const minor = Number(match[2] ?? 0);
  return major > 6 || (major === 6 && minor >= 1);
}

export function initTelegramWebApp() {
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) return;

  const setup = () => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;
    document.documentElement.dataset.auraMiniapp = '1';

    const applyFullscreen = () => {
      try {
        webApp.expand?.();
        if (supportsRequestFullscreen(webApp)) {
          webApp.requestFullscreen?.();
        }
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
  };

  if (getTelegramWebApp()) {
    setup();
    return;
  }
  void loadTelegramScript().then(setup);
}
