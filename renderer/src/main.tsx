import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/globals.css';
import { initWebDbBridge } from './shared/bridge/init-web-db-bridge';
import { initMiniAppKeyboardOverlay } from './shared/bridge/init-mini-app-keyboard-overlay';
import { initTelegramWebApp } from './shared/bridge/init-telegram-webapp';

initWebDbBridge();
initTelegramWebApp();
initMiniAppKeyboardOverlay();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
