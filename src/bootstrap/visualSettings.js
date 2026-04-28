import ColorSystem from '../design-system/tokens/ColorSystem.js';
import { STORAGE_KEYS } from '../config/index.js';

export function loadSavedVisualSettings() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dim' || savedTheme === 'dark')) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  ColorSystem.init();

  const savedRadius = localStorage.getItem('aura-radius');
  if (savedRadius) {
    document.documentElement.style.setProperty('--radius', savedRadius);
  }

  const savedScale = localStorage.getItem('aura-app-scale');
  if (savedScale) {
    const scaleValue = parseFloat(savedScale);
    if (!isNaN(scaleValue) && scaleValue >= 0.75 && scaleValue <= 1.25) {
      document.documentElement.style.setProperty('--app-scale', savedScale);
    }
  }

  const savedFont = localStorage.getItem(STORAGE_KEYS.FONT);
  if (savedFont) {
    document.documentElement.style.setProperty('--font-family', savedFont + ', sans-serif');
  }

  const getDB = window.getDB;
  const applyIconThemeFromStorage = () => {
    const validThemes = ['minimal', 'gradient'];
    const savedIconTheme = localStorage.getItem('aura-icon-theme');
    if (savedIconTheme && validThemes.includes(savedIconTheme)) {
      document.documentElement.setAttribute('data-icon-theme', savedIconTheme);
    } else {
      document.documentElement.setAttribute('data-icon-theme', 'gradient');
      localStorage.setItem('aura-icon-theme', 'gradient');
    }
  };

  if (getDB) {
    try {
      const db = getDB();
      if (db) {
        const settings = db.getAppSettings();
        const validThemes = ['minimal', 'gradient'];
        if (settings && settings.icon_theme && validThemes.includes(settings.icon_theme)) {
          document.documentElement.setAttribute('data-icon-theme', settings.icon_theme);
        } else {
          const savedIconTheme = localStorage.getItem('aura-icon-theme');
          if (savedIconTheme && validThemes.includes(savedIconTheme)) {
            document.documentElement.setAttribute('data-icon-theme', savedIconTheme);
          } else {
            document.documentElement.setAttribute('data-icon-theme', 'gradient');
            localStorage.setItem('aura-icon-theme', 'gradient');
          }
        }
      } else {
        applyIconThemeFromStorage();
      }
    } catch (e) {
      console.warn('[AURA] Ошибка загрузки темы иконок:', e);
      applyIconThemeFromStorage();
    }
  } else {
    applyIconThemeFromStorage();
  }
}
