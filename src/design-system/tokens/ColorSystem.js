/**
 * ЦЕНТРАЛИЗОВАННАЯ СИСТЕМА ТОКЕНОВ
 * Единый источник правды для всех цветов, размеров и эффектов
 * Иерархия: CONFIG → Утилиты → Генерация → Применение → API
 * Цвета категорий задач — из TaskCategoriesConfigService (настраиваемые)
 *
 * Контракт:
 * - Публичные CSS-переменные для UI задаёт только ColorSystem.apply() на :root.
 * - Темы: light | dim | dark — три отдельные ветки там, где важны глубина и тени (не «light vs всё остальное»).
 * - CONFIG.themes — канонический «рамп» поверхностей (surface → section → card); акцент лишь подмешивается в generateTokens.
 */

import { taskCategoriesConfigService } from '../../system/services/index.js';

class ColorSystem {
  // ============================================
  // КОНФИГУРАЦИЯ (единственный источник правды)
  // ============================================
  static CONFIG = {
    // Базовые цвета тем (светлая — яркая и живая, тёмная — тёплые оттенки вместо холодных)
    themes: {
      // Тёмная: не «чёрная дыра» — чуть выше светлость и явнее слои surface → section → card
      dark: {
        surface: '#181511',
        onSurface: '#f3eee9',
        border: '#45403a',
        sectionBg: '#211e1a',
        cardBg: '#2a2621',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.45)'
      },
      // Средняя: больше насыщенности и контраста между фоном и панелями (меньше «серой каши»)
      dim: {
        surface: '#2e2a24',
        onSurface: '#f4efe8',
        border: '#5c554b',
        sectionBg: '#3d372f',
        cardBg: '#484238',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.38)'
      },
      light: {
        surface: '#f9f7f5',     // было #fafafa — едва тёплый тинт
        onSurface: '#111111',
        border: '#ddd8d2',      // было #e5e5e5 — тёплый базис для акцентного блендинга
        sectionBg: '#ffffff',   // белые панели «поднимаются» над поверхностью
        cardBg: '#fdf9f7',      // было #ffffff — тёплый оттенок, создаёт глубину
        shadow: null // Генерируется динамически на основе акцента
      }
    },

    // Акцентные цвета — 24 визуально различных оттенка, каждый с уникальной иконкой
    accents: [
      // ── Красные / бордовые ──────────────────────────────────────────────
      { name: 'Винный',      value: '#722F37', icon: 'wine'      },
      { name: 'Бордовый',    value: '#5C2832', icon: 'heart'     },
      { name: 'Кирпичный',   value: '#8B4A3E', icon: 'flame'     },
      { name: 'Ржавый',      value: '#8B4513', icon: 'hammer'    },
      // ── Тёплые / янтарные ───────────────────────────────────────────────
      { name: 'Терракотовый',value: '#9B5A3C', icon: 'sun'       },
      { name: 'Медный',      value: '#8B6914', icon: 'star'      },
      { name: 'Бронзовый',   value: '#7C5A3C', icon: 'trophy'    },
      { name: 'Сепия',       value: '#6B5344', icon: 'camera'    },
      // ── Зелёные ─────────────────────────────────────────────────────────
      { name: 'Изумрудный',  value: '#2D5A4A', icon: 'leaf'      },
      { name: 'Лесной',      value: '#1B4332', icon: 'trees'     },
      { name: 'Шалфей',      value: '#4A6B5C', icon: 'sprout'    },
      { name: 'Оливковый',   value: '#4A5D23', icon: 'apple'     },
      // ── Синие / бирюзовые ───────────────────────────────────────────────
      { name: 'Бирюзовый',   value: '#2A5A5F', icon: 'droplet'   },
      { name: 'Сланцево-синий', value: '#3D4A6B', icon: 'anchor' },
      { name: 'Темно-синий', value: '#1E3A5F', icon: 'compass'   },
      { name: 'Кобальт',     value: '#2E4272', icon: 'waves'     },
      // ── Фиолетовые ──────────────────────────────────────────────────────
      { name: 'Фиолетовый',  value: '#4A3D5C', icon: 'grape'     },
      { name: 'Тёмная слива',value: '#3D2C4A', icon: 'moon'      },
      { name: 'Пурпурный',   value: '#4A1942', icon: 'sparkles'  },
      // ── Серые / металлические ───────────────────────────────────────────
      { name: 'Сланцевый',   value: '#2C3E50', icon: 'layers'    },
      { name: 'Стальной',    value: '#3E4A5C', icon: 'shield'    },
      { name: 'Оловянный',   value: '#5A6C7D', icon: 'hexagon'   },
      { name: 'Угольный',    value: '#1A202C', icon: 'crosshair' },
      { name: 'Чёрный',      value: '#0d0d0d', icon: 'circle'    },
    ],

    // Семантические цвета (не зависят от темы)
    semantic: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    },

    // Цвета категорий задач (в sync с TASK_CATEGORY_PALETTE, сдержанные)
    taskCategories: {
      rituals: 'hsl(15, 50%, 50%)',
      time: 'hsl(140, 45%, 48%)',
      body: 'hsl(260, 45%, 50%)',
      deps: 'hsl(0, 48%, 48%)'
    },

    // Цвета типов транзакций (яркие и насыщенные)
    transactionTypes: {
      income: 'hsl(142, 88%, 55%)',    // Зеленый для доходов
      expense: 'hsl(0, 90%, 65%)',      // Красный для расходов
      transfer: 'hsl(217, 95%, 65%)'    // Синий для переводов
    },

    // Коэффициенты прозрачности: dim/dark чуть сильнее тинт на элементах — меньше «блеклости»
    opacity: {
      element: { light: 0.22, dim: 0.17, dark: 0.12 },
      hover:   { light: 0.32, dim: 0.26, dark: 0.19 },
      active: 1.0,
      card: { light: 0.04, dim: 0.04, dark: 0.034 },
      // Секции: dim/dark — чуть заметнее акцент на фоне секции
      section: { light: 0.024, dim: 0.026, dark: 0.02 },
      border: { light: 0.50, dim: 0.34, dark: 0.26 },
      secondary: { light: 0.75, dim: 0.88, dark: 0.84 },
      gradient: {
        light: [0.20, 0.16, 0.13, 0.10, 0.07, 0.05, 0.035, 0.02, 0.012, 0.008, 0.004],
        dim: [0.19, 0.15, 0.12, 0.09, 0.062, 0.045, 0.03, 0.018, 0.011, 0.007, 0.0035],
        dark: [0.18, 0.14, 0.11, 0.08, 0.055, 0.04, 0.025, 0.016, 0.01, 0.006, 0.003]
      },
      gradientWeak: {
        light: [0.12, 0.10, 0.08, 0.06, 0.04, 0.03, 0.02, 0.012, 0.008, 0.004, 0.002],
        dim: [0.11, 0.09, 0.07, 0.052, 0.035, 0.024, 0.017, 0.01, 0.006, 0.0035, 0.0015],
        dark: [0.10, 0.08, 0.06, 0.045, 0.03, 0.02, 0.014, 0.009, 0.005, 0.003, 0.001]
      }
    }
  };

  // ============================================
  // ТЕНИ И «ЧЕРНИЛА» (dim / dark раздельно, тёплый оттенок от surface + акцент)
  // ============================================

  /**
   * Базовый цвет тени: не чистый #000 на тёмных темах — смесь с surface и лёгкий акцент.
   * @param {'light'|'dim'|'dark'} theme
   */
  static _shadowInkRgb(theme, surfaceHex, accentHex) {
    if (theme === 'light') {
      return { r: 0, g: 0, b: 0 };
    }
    const surf = this.hexToRgb(surfaceHex);
    const acc = this.hexToRgb(accentHex);
    if (!surf) {
      return { r: 0, g: 0, b: 0 };
    }
    const black = { r: 0, g: 0, b: 0 };
    const blackWeight = theme === 'dim' ? 0.32 : 0.46;
    const ink = this.blendColors(black, surf, blackWeight);
    if (!ink) return { r: 0, g: 0, b: 0 };
    if (!acc) return ink;
    const accentTouch = theme === 'dim' ? 0.07 : 0.055;
    return this.blendColors(ink, acc, accentTouch) || ink;
  }

  static _shadowInkHex(theme, surfaceHex, accentHex) {
    const rgb = this._shadowInkRgb(theme, surfaceHex, accentHex);
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  static _shadowRgbaInk(theme, surfaceHex, accentHex, alpha) {
    const rgb = this._shadowInkRgb(theme, surfaceHex, accentHex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  /**
   * Смесь акцента на поверхности — один вход для section/card/calendar вместо разрозненных коэффициентов.
   */
  static _mixAccentOnHex(accentHex, baseHex, amount) {
    const b = this.hexToRgb(baseHex);
    const a = this.hexToRgb(accentHex);
    if (!b || !a) return baseHex;
    const out = this.blendColors(a, b, amount);
    return out ? this.rgbToHex(out.r, out.g, out.b) : baseHex;
  }

  // ============================================
  // УТИЛИТЫ
  // ============================================
  static hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { 
      r: parseInt(m[1], 16), 
      g: parseInt(m[2], 16), 
      b: parseInt(m[3], 16) 
    } : null;
  }

  static rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  static rgbaToRgb(rgba) {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    return match ? {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10)
    } : null;
  }

  static blendColors(color1, color2, alpha) {
    const rgb1 = typeof color1 === 'string' ? this.hexToRgb(color1) : color1;
    const rgb2 = typeof color2 === 'string' ? this.hexToRgb(color2) : color2;
    if (!rgb1 || !rgb2) return null;
    return {
      r: Math.round(rgb1.r * alpha + rgb2.r * (1 - alpha)),
      g: Math.round(rgb1.g * alpha + rgb2.g * (1 - alpha)),
      b: Math.round(rgb1.b * alpha + rgb2.b * (1 - alpha))
    };
  }

  /**
   * Вычисляет контрастный цвет (белый или черный) для акцентного цвета
   * @param {string} hex - HEX цвет
   * @returns {string} '#000000' или '#ffffff'
   */
  static getContrastColor(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return '#ffffff';
    // Формула относительной яркости (WCAG)
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  static _srgbChannelToLinear(c) {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  /** Относительная светлота WCAG 2.1 (0..1) */
  static relativeLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;
    const R = this._srgbChannelToLinear(rgb.r);
    const G = this._srgbChannelToLinear(rgb.g);
    const B = this._srgbChannelToLinear(rgb.b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  /** Контраст двух цветов (≥4.5 — нормальный текст) */
  static contrastRatio(hexA, hexB) {
    const L1 = this.relativeLuminance(hexA);
    const L2 = this.relativeLuminance(hexB);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Текст/иконки на семантическом заливке: явный выбор белого или почти чёрного по контрасту.
   * Старая getContrastColor на пограничных L давала «мыльный» читаемый вид.
   */
  static getSemanticOnColor(bgHex) {
    const onDark = '#0f0f0f';
    const onLight = '#ffffff';
    const cWhite = this.contrastRatio(onLight, bgHex);
    const cBlack = this.contrastRatio(onDark, bgHex);
    if (cWhite >= 4.5 && cWhite >= cBlack) return onLight;
    if (cBlack >= 4.5 && cBlack > cWhite) return onDark;
    return cWhite >= cBlack ? onLight : onDark;
  }

  /**
   * Текст на заданном фоне: в приоритете цвет темы (тёплый onSurface),
   * к нему минимально подмешивается «якорь» getSemanticOnColor только если не хватает контраста.
   * Так текст остаётся в палитре темы и не превращается в холодный #fff / #0f0f0f без нужды.
   */
  static _harmonizedOnBackground(bgHex, preferredOnHex, minRatio = 4.5) {
    const bg = this.hexToRgb(bgHex);
    const pref = this.hexToRgb(preferredOnHex);
    if (!bg || !pref) return this.getSemanticOnColor(bgHex);
    if (this.contrastRatio(preferredOnHex, bgHex) >= minRatio) {
      return preferredOnHex;
    }
    const anchor = this.getSemanticOnColor(bgHex);
    const anc = this.hexToRgb(anchor);
    if (!anc) return anchor;
    for (let t = 0.06; t <= 1; t += 0.06) {
      const blended = {
        r: Math.round(pref.r * (1 - t) + anc.r * t),
        g: Math.round(pref.g * (1 - t) + anc.g * t),
        b: Math.round(pref.b * (1 - t) + anc.b * t)
      };
      const hex = this.rgbToHex(blended.r, blended.g, blended.b);
      if (this.contrastRatio(hex, bgHex) >= minRatio) return hex;
    }
    return anchor;
  }

  /**
   * Приглушённый текст на фоне: непрозрачная смесь основного текста с фоном (без rgba поверх «стекла»).
   * mixTowardBg — доля фона (0.06…0.35); итог = (1-mix)*primary + mix*bg.
   */
  static _mutedOnBackground(primaryHex, bgHex, mixTowardBg) {
    const p = this.hexToRgb(primaryHex);
    const b = this.hexToRgb(bgHex);
    if (!p || !b) return primaryHex;
    const mix = Math.min(0.35, Math.max(0.06, mixTowardBg));
    const out = this.blendColors(p, b, 1 - mix);
    return out ? this.rgbToHex(out.r, out.g, out.b) : primaryHex;
  }

  /**
   * Создает rgba строку из hex цвета с заданной прозрачностью
   * @param {string} hex - HEX цвет
   * @param {number} alpha - Прозрачность (0-1)
   * @returns {string} RGBA строка
   */
  static rgba(hex, alpha) {
    const rgb = this.hexToRgb(hex);
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
  }

  /**
   * Изменяет прозрачность существующего цвета
   * @param {string} color - Цвет (rgba или hex)
   * @param {number} opacity - Новая прозрачность (0-1)
   * @returns {string} Цвет с новой прозрачностью
   */
  static withOpacity(color, opacity) {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${opacity})`);
    }
    return this.rgba(color, opacity);
  }

  /**
   * Конвертирует HEX в HSL
   * @param {string} hex - HEX цвет
   * @returns {Object} { h, s, l } в диапазоне 0-360, 0-100, 0-100
   */
  static hexToHsl(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return { h: 0, s: 0, l: 0 };

    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  static hslToHex(h, s, l) {
    h = h / 360; s = s / 100; l = l / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return this.rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
  }

  /** Относительная яркость 0–1 (WCAG) */
  static getLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  }

  /**
   * Осветляет тёмный акцент для UI-элементов (кнопки, границы), чтобы не сливались с фоном.
   * На dim/dark поднимаем L и S сильнее, чем на light — иначе accent-ui выглядит бледным на тёплом тёмном сурфейсе.
   */
  static _accentForUI(accent, theme = 'dark') {
    const normalized = this.CONFIG.themes[theme] ? theme : 'dark';
    const luminance = this.getLuminance(accent);
    const hsl = this.hexToHsl(accent);

    if (normalized === 'light') {
      if (luminance >= 0.22) return accent;
      const newL = Math.max(hsl.l, 38);
      return this.hslToHex(hsl.h, Math.min(hsl.s, 70), newL);
    }

    const isAchromatic = hsl.s < 10;
    const lumOk = normalized === 'dim' ? luminance >= 0.4 : luminance >= 0.36;
    const minL = normalized === 'dim' ? 50 : 46;
    const minS = normalized === 'dim' ? 48 : 38;
    const maxS = 82;

    if (lumOk && hsl.s >= 18) return accent;

    const newL = Math.max(hsl.l, minL);
    const newS = isAchromatic
      ? hsl.s
      : Math.min(maxS, Math.max(hsl.s, minS));

    return this.hslToHex(hsl.h, newS, newL);
  }

  /**
   * Публичный API: цвет акцента в том виде, в котором он применяется к кнопкам и границам (accentUI).
   * Используйте в пикере, чтобы превью совпадало с тем, что видно в интерфейсе.
   * @param {string} accentHex
   * @param {string} [theme] — light | dim | dark; если не задано, берётся data-theme с documentElement или dark
   */
  static getAccentForUI(accentHex, theme = null) {
    const resolved =
      theme && this.CONFIG.themes[theme]
        ? theme
        : typeof document !== 'undefined'
          ? document.documentElement.getAttribute('data-theme')
          : null;
    const normalized = this.CONFIG.themes[resolved] ? resolved : 'dark';
    return this._accentForUI(accentHex, normalized);
  }

  /**
   * Вычисляет расстояние между двумя цветами в цветовом пространстве
   * @param {string} hex1 - Первый HEX цвет
   * @param {string} hex2 - Второй HEX цвет
   * @returns {number} Расстояние (чем меньше, тем похожее)
   */
  static colorDistance(hex1, hex2) {
    const hsl1 = this.hexToHsl(hex1);
    const hsl2 = this.hexToHsl(hex2);
    
    // Вычисляем расстояние с учетом циклической природы оттенка
    const hDiff = Math.min(
      Math.abs(hsl1.h - hsl2.h),
      360 - Math.abs(hsl1.h - hsl2.h)
    );
    const sDiff = Math.abs(hsl1.s - hsl2.s);
    const lDiff = Math.abs(hsl1.l - hsl2.l);
    
    // Взвешенное расстояние (оттенок важнее)
    // Нормализуем значения: h в диапазоне 0-360, s и l в 0-100
    // Используем евклидово расстояние с весами
    return Math.sqrt(
      Math.pow(hDiff / 360 * 100, 2) + 
      Math.pow(sDiff, 2) + 
      Math.pow(lDiff, 2)
    );
  }

  // ============================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ГЕНЕРАЦИИ
  // ============================================
  /**
   * Фон карточки: стабильная формула с гарантированным отличием от фона секции.
   * 1) Берём базовый cardBg из темы
   * 2) Подмешиваем акцент мягче, чем раньше (иначе на некоторых акцентах карточки "грязнятся")
   * 3) Если карточка слишком близка к sectionBg, дожимаем контраст смесью с onSurface
   */
  static _blendCardBackground(accent, base, opacity, theme = 'dark') {
    const cardBase = base.cardBg || base.sectionBg || base.surface;
    const sectionBase = base.sectionBg || base.surface;

    const cardRgb = this.rgbaToRgb(cardBase) || this.hexToRgb(cardBase) || this.hexToRgb(base.surface);
    const sectionRgb = this.rgbaToRgb(sectionBase) || this.hexToRgb(sectionBase) || this.hexToRgb(base.surface);
    if (!cardRgb || !sectionRgb) return base.surface;

    const cardHex = this.rgbToHex(cardRgb.r, cardRgb.g, cardRgb.b);
    const sectionHex = this.rgbToHex(sectionRgb.r, sectionRgb.g, sectionRgb.b);

    // На карточках акцент должен быть мягче, чем на элементах/бордерах.
    const tintOpacity = Math.max(0, Math.min(1, opacity * 0.72));
    let candidate = this._mixAccentOnHex(accent, cardHex, tintOpacity);

    // Дополнительно осветляем card-background (адаптивно по теме), чтобы он был "максимально светлый",
    // но не ломал контраст и визуальную иерархию.
    const candRgb = this.hexToRgb(candidate);
    const lightLiftTarget = theme === 'light' ? { r: 255, g: 255, b: 255 } : null;
    const lightLiftAmount = theme === 'light' ? 0.08 : 0;
    if (candRgb && lightLiftTarget) {
      const lifted = this.blendColors(lightLiftTarget, candRgb, lightLiftAmount);
      if (lifted) {
        candidate = this.rgbToHex(lifted.r, lifted.g, lifted.b);
      }
    }

    // Минимальная различимость карточки относительно секции.
    const minSeparation = theme === 'light' ? 1.08 : theme === 'dim' ? 1.12 : 1.14;
    const ratio = this.contrastRatio(candidate, sectionHex);
    if (ratio >= minSeparation) return candidate;

    const on = this.hexToRgb(base.onSurface);
    const cand = this.hexToRgb(candidate);
    if (!on || !cand) return candidate;

    // Постепенно усиливаем separation: и в light (слегка темнее), и в dark/dim (слегка светлее)
    // это естественно достигается смесью с onSurface.
    for (let t = 0.04; t <= 0.26; t += 0.02) {
      const mixed = this.blendColors(on, cand, t);
      if (!mixed) continue;
      const hex = this.rgbToHex(mixed.r, mixed.g, mixed.b);
      if (this.contrastRatio(hex, sectionHex) >= minSeparation) return hex;
    }

    return candidate;
  }

  /** Смесь оттенка акцента к sectionBg из CONFIG (не к surface — см. _blendCardBackground). */
  static _blendSectionBackground(accent, base, opacity) {
    const baseBg = base.sectionBg || base.surface;
    const rgb = this.rgbaToRgb(baseBg) || this.hexToRgb(baseBg) || this.hexToRgb(base.surface);
    if (!rgb) return base.sectionBg || base.surface;
    const baseHex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    return this._mixAccentOnHex(accent, baseHex, opacity);
  }

  /**
   * Фон ячеек календаря (шапка, модалка) и кнопок нижней навигации: тёплый полупрозрачный слой
   * поверх градиента страницы на тёмных темах; светлая — непрозрачный белый.
   */
  static _calendarCellBackground(accent, base, theme, sectionBlendOpacity) {
    if (theme === 'light') {
      return '#ffffff';
    }
    const blended = this._blendSectionBackground(accent, base, sectionBlendOpacity);
    const rgb = this.hexToRgb(blended);
    if (!rgb) return blended;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
  }

  static _blendBorder(accent, baseBorder, opacity) {
    const borderRgb = this.hexToRgb(baseBorder);
    if (!borderRgb) return baseBorder;
    const blended = this.blendColors(accent, borderRgb, opacity);
    return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : baseBorder;
  }

  /**
   * Нейтральный цвет для отрицательных метрик в календаре (очки, баланс и т.д.) —
   * без красного: приглушённый основной текст, читается на фоне секции.
   */
  static _metricNegativeColor(base) {
    // Ближе к основному тексту, без «грязной» середины между surface и onSurface
    const blended = this.blendColors(base.onSurface, base.surface, 0.84);
    return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : base.onSurface;
  }

  /**
   * Непрозрачный фон интерактивных элементов (вместо rgba): тот же визуальный вес, без «просвета».
   */
  static _solidAccentWash(accentHex, surfaceHex, alpha) {
    const a = this.hexToRgb(accentHex);
    const b = this.hexToRgb(surfaceHex);
    if (!a || !b) return this.rgba(accentHex, alpha);
    const blended = this.blendColors(a, b, alpha);
    return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : surfaceHex;
  }

  /**
   * Генерирует цвета категорий задач, адаптивные к теме
   * @param {string} theme - Тема ('dark'|'dim'|'light')
   */
  static _generateTaskCategoryColors(theme) {
    const adjustForTheme = (h, baseSat, baseLight) => {
      let light = baseLight;
      if (theme === 'light') {
        light = baseLight - 8; // светлее для light темы
      } else if (theme === 'dim') {
        light = baseLight + 5; // немного ярче для промежуточной
      } else {
        light = baseLight + 5; // светлее для dark
      }
      return this.hslToHex(h, baseSat, light);
    };

    return {
      '--color-task-rituals': adjustForTheme(15, 50, 50),
      '--color-task-time': adjustForTheme(140, 45, 48),
      '--color-task-body': adjustForTheme(260, 45, 50),
      '--color-task-deps': adjustForTheme(0, 48, 48),
    };
  }

  /**
   * Генерирует цвета типов транзакций, адаптивные к теме
   * @param {string} theme - Тема ('dark'|'dim'|'light')
   */
  static _generateTransactionColors(theme) {
    const adjustForTheme = (h, baseSat, baseLight) => {
      let light = baseLight;
      if (theme === 'light') {
        light = baseLight - 5;
      } else if (theme === 'dim') {
        light = baseLight + 4;
      } else {
        light = baseLight + 5;
      }
      return this.hslToHex(h, baseSat, light);
    };

    return {
      '--color-transaction-income': adjustForTheme(142, 88, 55),
      '--color-transaction-expense': adjustForTheme(0, 90, 65),
      '--color-transaction-transfer': adjustForTheme(217, 95, 65),
    };
  }

  /**
   * Генерирует семантические цвета (success/error/warning/info) динамически —
   * с учётом темы (светлота) и акцентного цвета (насыщенность).
   * Хаи зафиксированы (зелёный=успех, красный=ошибка) — универсальные UX-конвенции.
   * @param {string} accent - HEX акцентный цвет
   * @param {string} theme - Тема ('dark'|'dim'|'light')
   * @returns {Object} CSS-переменные для 4 семантических цветов + контрастные пары + error-hover
   */
  static _generateSemanticColors(accent, theme) {
    const accentHsl = this.hexToHsl(accent);
    const accentSat = accentHsl.s;
    // Слабый тинт от акцента — семантика остаётся узнаваемой, без «перекраски» в бордо/оливу
    const BLEND = 0.12;

    // Спокойнее насыщенность, светлота под тёплый UI: тёмные темы — чуть глубже (меньше неона),
    // светлая — насыщенные бейджи с читаемым текстом через getSemanticOnColor
    const semanticBases = {
      success: { h: 154, baseSat: 52, lightness: { dark: 44, dim: 42, light: 38 } },
      // Ошибки в UI — тёплый терракот/умбра, не «сигнальный» красный
      error:   { h: 16,  baseSat: 48, lightness: { dark: 50, dim: 52, light: 42 } },
      warning: { h: 40,  baseSat: 54, lightness: { dark: 50, dim: 48, light: 46 } },
      info:    { h: 212, baseSat: 56, lightness: { dark: 52, dim: 50, light: 46 } }
    };

    const result = {};
    const resolvedTheme = this.CONFIG.themes[theme] ? theme : 'dark';

    for (const [name, def] of Object.entries(semanticBases)) {
      const blendedSat = def.baseSat + (accentSat - def.baseSat) * BLEND;
      const sat = Math.round(Math.max(40, Math.min(68, blendedSat)));
      const lit = def.lightness[resolvedTheme];
      const colorHex = this.hslToHex(def.h, sat, lit);
      result[`--color-${name}`] = colorHex;
      result[`--color-on-${name}`] = this.getSemanticOnColor(colorHex);
    }

    // Hover ошибки: чуть светлее, но в разумных пределах
    const errorHsl = this.hexToHsl(result['--color-error']);
    result['--color-error-hover'] = this.hslToHex(
      errorHsl.h, errorHsl.s, Math.min(errorHsl.l + 5, 92)
    );

    const errHex = result['--color-error'];
    result['--color-error-border-muted'] = this.withOpacity(errHex, 0.4);
    result['--color-error-border-emphasis'] = this.withOpacity(errHex, 0.5);
    result['--color-error-background-muted'] = this.withOpacity(errHex, 0.1);
    result['--color-error-background-hover'] = this.withOpacity(errHex, 0.15);
    result['--shadow-error-sm'] = `0 2px 4px ${this.withOpacity(errHex, 0.2)}`;

    return result;
  }

  static _generateGradient(rgb, gradSteps, surface, intensityScale = 1) {
    const clampedSteps = gradSteps.map(op => Math.min(1, Math.max(0, op)));
    const steps = clampedSteps.map(op => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op})`);
    const positions = [0, 5, 12, 20, 30, 42, 55, 68, 80, 90, 96];
    const stops = steps.map((color, i) => `${color} ${positions[i]}%`).join(', ');

    // Добавляем "сочное" акцентное ядро в центре, чтобы фон не выглядел блеклым.
    // Отдельный слой hot spot делает центр ярким и живым как в light, так и в dark.
    // Плавный старт ядра: при 0-1% почти незаметно, без резкого скачка от 0 к 1.
    const normalizedIntensity = Math.max(0, Math.min(1, intensityScale));
    const coreOpacity = Math.min(0.96, Math.pow(normalizedIntensity, 0.82) * 0.92);
    // Ядро = максимально сочный акцент (кислотный), а не просто светлее/темнее базового цвета.
    // Берём hue исходного акцента и форсируем насыщенность + стабильную "сочную" светлоту.
    const accentHex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    const accentHsl = this.hexToHsl(accentHex);
    // Важно: для почти серых акцентов (низкая S) нельзя насильно поднимать насыщенность,
    // иначе из-за hue≈0 центр уходит в красный.
    let coreSat;
    let coreLight;
    if (accentHsl.s < 12) {
      coreSat = 0; // сохраняем нейтральный серый характер
      coreLight = Math.max(58, Math.min(72, accentHsl.l + 16));
    } else if (accentHsl.s < 28) {
      coreSat = Math.min(42, accentHsl.s + 10); // мягкий буст без кислотного сдвига в hue
      coreLight = Math.max(54, Math.min(62, accentHsl.l + 8));
    } else {
      coreSat = Math.min(100, Math.max(88, accentHsl.s + 30));
      coreLight = Math.max(50, Math.min(58, accentHsl.l < 50 ? 54 : accentHsl.l > 62 ? 56 : accentHsl.l));
    }
    const coreHex = this.hslToHex(accentHsl.h, coreSat, coreLight);
    const coreRgb = this.hexToRgb(coreHex) || rgb;
    const coreR = coreRgb.r;
    const coreG = coreRgb.g;
    const coreB = coreRgb.b;
    const core = `radial-gradient(circle at 50% 0%, rgba(${coreR}, ${coreG}, ${coreB}, ${coreOpacity}) 0%, rgba(${coreR}, ${coreG}, ${coreB}, ${coreOpacity * 0.78}) 12%, rgba(${coreR}, ${coreG}, ${coreB}, ${coreOpacity * 0.4}) 30%, rgba(${coreR}, ${coreG}, ${coreB}, 0) 56%)`;
    const base = `radial-gradient(ellipse 200% 300% at top center, ${stops}, ${surface} 100%)`;

    return `${core}, ${base}`;
  }

  /**
   * Генерирует элегантные цветные тени на основе акцентного цвета
   * @param {string} accent - HEX акцентный цвет
   * @param {string} theme - Тема ('light' или 'dark')
   * @returns {string} CSS box-shadow строка
   */
  static _generateColoredShadow(accent, theme, base) {
    const accentRgb = this.hexToRgb(accent);
    if (!accentRgb) return 'none';

    if (theme === 'light') {
      const shadow1 = this.rgba(accent, 0.04);
      const shadow2 = this.rgba(accent, 0.02);
      return `0 2px 8px ${shadow1}, 0 1px 3px ${shadow2}`;
    }
    const surf = base.surface;
    if (theme === 'dim') {
      const s1 = this.rgba(accent, 0.035);
      const s2 = this._shadowRgbaInk(theme, surf, accent, 0.07);
      return `0 2px 10px ${s1}, 0 1px 3px ${s2}`;
    }
    const s1 = this.rgba(accent, 0.025);
    const s2 = this._shadowRgbaInk(theme, surf, accent, 0.08);
    return `0 2px 8px ${s1}, 0 1px 3px ${s2}`;
  }

  /**
   * Генерирует тени разных уровней для секций
   * Мягкие, объемные тени с учетом скругления углов
   * @param {string} accent - HEX акцентный цвет
   * @param {string} theme - Тема ('light' или 'dark')
   * @param {string} level - Уровень теней ('none', 'subtle', 'moderate', 'strong')
   * @returns {string} CSS box-shadow строка
   */
  static _generateSectionShadow(accent, theme, level = 'moderate', base) {
    if (level === 'none') return 'none';

    const accentRgb = this.hexToRgb(accent);
    if (!accentRgb) return 'none';

    const surf = base.surface;

    if (theme === 'light') {
      switch (level) {
        case 'subtle':
          return `0 2px 12px ${this.rgba(accent, 0.03)}, 0 1px 4px ${this.rgba(accent, 0.02)}`;
        case 'moderate': {
          const shadow1 = this.rgba(accent, 0.035);
          const shadow2 = this.rgba(accent, 0.025);
          const shadow3 = this.rgba(accent, 0.01);
          return `0 4px 24px ${shadow1}, 0 2px 12px ${shadow2}, 0 1px 6px ${shadow3}`;
        }
        case 'strong': {
          const s1 = this.rgba(accent, 0.05);
          const s2 = this.rgba(accent, 0.035);
          const s3 = this.rgba(accent, 0.02);
          return `0 8px 32px ${s1}, 0 4px 16px ${s2}, 0 2px 8px ${s3}`;
        }
        default:
          return this._generateColoredShadow(accent, theme, base);
      }
    }

    const sectionInk = (a1, a2, a3) => {
      const i = this._shadowRgbaInk(theme, surf, accent, a1);
      const j = this._shadowRgbaInk(theme, surf, accent, a2);
      const k = a3 != null ? this._shadowRgbaInk(theme, surf, accent, a3) : null;
      return k ? `0 4px 24px ${i}, 0 2px 12px ${j}, 0 1px 6px ${k}` : `0 2px 12px ${i}, 0 1px 4px ${j}`;
    };

    if (theme === 'dim') {
      switch (level) {
        case 'subtle':
          return sectionInk(0.06, 0.04);
        case 'moderate':
          return sectionInk(0.09, 0.065, 0.045);
        case 'strong':
          return sectionInk(0.13, 0.09, 0.065);
        default:
          return sectionInk(0.09, 0.065, 0.045);
      }
    }

    switch (level) {
      case 'subtle':
        return sectionInk(0.09, 0.06);
      case 'moderate':
        return sectionInk(0.13, 0.1, 0.07);
      case 'strong':
        return sectionInk(0.18, 0.14, 0.1);
      default:
        return sectionInk(0.13, 0.1, 0.07);
    }
  }

  /**
   * Генерирует тени разных уровней для карточек
   * Мягкие, объемные тени с учетом скругления углов
   * @param {string} accent - HEX акцентный цвет
   * @param {string} theme - Тема ('light' или 'dark')
   * @param {string} level - Уровень теней ('none', 'subtle', 'moderate', 'strong')
   * @returns {string} CSS box-shadow строка
   */
  static _generateCardShadow(accent, theme, level = 'moderate', base) {
    if (level === 'none') return 'none';

    const accentRgb = this.hexToRgb(accent);
    if (!accentRgb) return 'none';

    const surf = base.surface;

    if (theme === 'light') {
      switch (level) {
        case 'subtle':
          return `0 1px 8px ${this.rgba(accent, 0.04)}, 0 1px 3px ${this.rgba(accent, 0.02)}`;
        case 'moderate': {
          const shadow1 = this.rgba(accent, 0.05);
          const shadow2 = this.rgba(accent, 0.03);
          const shadow3 = this.rgba(accent, 0.02);
          return `0 2px 16px ${shadow1}, 0 1px 8px ${shadow2}, 0 1px 4px ${shadow3}`;
        }
        case 'strong': {
          const s1 = this.rgba(accent, 0.07);
          const s2 = this.rgba(accent, 0.05);
          const s3 = this.rgba(accent, 0.03);
          return `0 4px 24px ${s1}, 0 2px 12px ${s2}, 0 1px 6px ${s3}`;
        }
        default:
          return `0 2px 16px ${this.rgba(accent, 0.05)}, 0 1px 8px ${this.rgba(accent, 0.03)}`;
      }
    }

    const cardInk = (a1, a2, a3) => {
      const i = this._shadowRgbaInk(theme, surf, accent, a1);
      const j = this._shadowRgbaInk(theme, surf, accent, a2);
      const k = a3 != null ? this._shadowRgbaInk(theme, surf, accent, a3) : null;
      return k
        ? `0 2px 16px ${i}, 0 1px 8px ${j}, 0 1px 4px ${k}`
        : `0 1px 8px ${i}, 0 1px 3px ${j}`;
    };

    if (theme === 'dim') {
      switch (level) {
        case 'subtle':
          return `0 1px 8px ${this.rgba(accent, 0.035)}, 0 1px 3px ${this._shadowRgbaInk(theme, surf, accent, 0.07)}`;
        case 'moderate':
          return cardInk(0.11, 0.08, 0.055);
        case 'strong':
          return cardInk(0.16, 0.12, 0.085);
        default:
          return cardInk(0.11, 0.08, 0.055);
      }
    }

    switch (level) {
      case 'subtle':
        return cardInk(0.08, 0.055);
      case 'moderate':
        return cardInk(0.11, 0.08, 0.055);
      case 'strong':
        return cardInk(0.15, 0.11, 0.08);
      default:
        return cardInk(0.11, 0.08, 0.055);
    }
  }

  // ============================================
  // ГЕНЕРАЦИЯ ВСЕХ ТОКЕНОВ
  // ============================================
  static generateTokens(accent, theme = 'dark', shadowLevel = 'subtle', gradientIntensity = 1) {
    const normalizedTheme = this.CONFIG.themes[theme] ? theme : 'dark';
    const base = this.CONFIG.themes[normalizedTheme];
    const accentRgb = this.hexToRgb(accent);
    if (!accentRgb) return {};

    // Для тёмных акцентов — осветлённая версия для кнопок/границ, чтобы не сливались с фоном
    const accentUI = this._accentForUI(accent, normalizedTheme);

    const op = this.CONFIG.opacity;
    const strong = op.gradient[normalizedTheme];
    const MAX_GRADIENT_INTENSITY = 5; // максимум соответствует 500% на слайдере
    const intensity = gradientIntensity != null && gradientIntensity !== '' ? Number(gradientIntensity) : 1;
    // При intensity=0 — градиент выключен (плоский фон).
    // Для высоких значений (200-500%) используем усиленный нелинейный буст, иначе свечение выглядит «блекло».
    const clampedIntensity = Math.max(0, Math.min(MAX_GRADIENT_INTENSITY, intensity));
    const highIntensityBoost = clampedIntensity <= 1
      ? clampedIntensity
      : 1 + Math.pow(clampedIntensity - 1, 1.25);
    const themeGlowBoost = normalizedTheme === 'light' ? 1.12 : normalizedTheme === 'dim' ? 1.22 : 1.32;
    const grad = clampedIntensity <= 0
      ? strong.map(() => 0)
      : clampedIntensity <= 1
        // 0..100% — линейный и мягкий рост от полного нуля, без floor от weak.
        ? strong.map((s) => Math.min(0.92, s * clampedIntensity))
        // 100..500% — усиление поверх базового уровня.
        : strong.map((s) => {
          const boostedStep = s * highIntensityBoost * themeGlowBoost;
          return Math.min(0.92, boostedStep);
        });

    // Генерируем все уровни теней
    const shadowSectionNone = 'none';
    const shadowSectionSubtle = this._generateSectionShadow(accent, normalizedTheme, 'subtle', base);
    const shadowSectionModerate = this._generateSectionShadow(accent, normalizedTheme, 'moderate', base);
    const shadowSectionStrong = this._generateSectionShadow(accent, normalizedTheme, 'strong', base);

    const shadowCardNone = 'none';
    const shadowCardSubtle = this._generateCardShadow(accent, normalizedTheme, 'subtle', base);
    const shadowCardModerate = this._generateCardShadow(accent, normalizedTheme, 'moderate', base);
    const shadowCardStrong = this._generateCardShadow(accent, normalizedTheme, 'strong', base);

    // Определяем текущий уровень теней на основе shadowLevel
    const shadowSectionLevel = shadowLevel === 'none' ? shadowSectionNone :
                               shadowLevel === 'subtle' ? shadowSectionSubtle :
                               shadowLevel === 'strong' ? shadowSectionStrong :
                               shadowSectionModerate;

    const shadowCardLevel = shadowLevel === 'none' ? shadowCardNone :
                            shadowLevel === 'subtle' ? shadowCardSubtle :
                            shadowLevel === 'strong' ? shadowCardStrong :
                            shadowCardModerate;

    const sectionBlendOpacity = op.section[normalizedTheme] ?? op.card[normalizedTheme] * 0.55;

    const inkHex = this._shadowInkHex(normalizedTheme, base.surface, accent);
    const edgeAlphas = normalizedTheme === 'light'
      ? { sm: 0.04, md: 0.06, lg: 0.045, popover: 0.06, elevate: 0.06, tooltip: 0.06 }
      : normalizedTheme === 'dim'
        ? { sm: 0.055, md: 0.07, lg: 0.06, popover: 0.09, elevate: 0.065, tooltip: 0.065 }
        : { sm: 0.065, md: 0.09, lg: 0.07, popover: 0.12, elevate: 0.08, tooltip: 0.08 };
    const borderRaisedMuted = this.withOpacity(
      base.onSurface,
      normalizedTheme === 'light' ? 0.12 : normalizedTheme === 'dim' ? 0.09 : 0.07
    );
    const borderRaisedEmphasis = this.withOpacity(
      base.onSurface,
      normalizedTheme === 'light' ? 0.2 : normalizedTheme === 'dim' ? 0.15 : 0.12
    );

    const sectionBackgroundHex = this._blendSectionBackground(accent, base, sectionBlendOpacity);
    const onSectionHex = this._harmonizedOnBackground(sectionBackgroundHex, base.onSurface, 4.5);
    const secondaryStrength = op.secondary[normalizedTheme] ?? 0.8;
    const onSectionSecondary = this._mutedOnBackground(
      onSectionHex,
      sectionBackgroundHex,
      1 - secondaryStrength
    );

    // Базовые цвета
    const tokens = {
      // Поверхности
      '--color-surface': base.surface,
      '--color-on-surface': base.onSurface,
      '--color-on-surface-secondary': this.withOpacity(base.onSurface, op.secondary[normalizedTheme] ?? 0.8),
      '--color-section-background': sectionBackgroundHex,
      /* Текст на панели секции: контраст к фактическому section background (с тинтом акцента), не к «сырому» surface */
      '--color-on-section': onSectionHex,
      '--color-on-section-secondary': onSectionSecondary,
      '--color-calendar-cell-background': this._calendarCellBackground(accent, base, normalizedTheme, sectionBlendOpacity),
      '--color-card-background': this._blendCardBackground(accent, base, op.card[normalizedTheme], normalizedTheme),
      /* Полупрозрачные заливки «стекла» (базовые hex выше — для контраста, графиков, color-mix) */
      '--color-section-fill': (() => {
        const p = normalizedTheme === 'light' ? 78 : normalizedTheme === 'dim' ? 64 : 58;
        return `color-mix(in srgb, var(--color-section-background) ${p}%, transparent)`;
      })(),
      '--color-card-fill': (() => {
        const p = normalizedTheme === 'light' ? 84 : normalizedTheme === 'dim' ? 72 : 66;
        return `color-mix(in srgb, var(--color-card-background) ${p}%, transparent)`;
      })(),
      '--color-section-fill-dense': 'color-mix(in srgb, var(--color-section-background) 91%, transparent)',
      '--color-card-fill-dense': 'color-mix(in srgb, var(--color-card-background) 91%, transparent)',

      // Акцент (оригинал — для градиентов, фонов)
      '--color-accent': accent,
      '--color-on-accent': this.getContrastColor(accent),
      // Акцент для UI (осветлён при тёмном акценте — кнопки, границы, фокус)
      '--color-accent-ui': accentUI,
      '--color-on-accent-ui': this.getContrastColor(accentUI),

      // Элементы (интерактивные) — непрозрачные смеси с surface (hover/кнопки/навигация)
      '--color-element': this._solidAccentWash(accentUI, base.surface, op.element[normalizedTheme]),
      '--color-element-hover': (() => {
        // Hover делаем чуть мягче и стабильнее по темам:
        // light — заметно, но без "грязного" затемнения,
        // dim/dark — умеренно светлый акцентный wash.
        const hoverOpacity = normalizedTheme === 'light'
          ? Math.max(0, (op.hover[normalizedTheme] ?? 0.28) - 0.06)
          : normalizedTheme === 'dim'
            ? Math.max(0, (op.hover[normalizedTheme] ?? 0.24) - 0.04)
            : Math.max(0, (op.hover[normalizedTheme] ?? 0.18) - 0.03);
        return this._solidAccentWash(accentUI, base.surface, hoverOpacity);
      })(),
      '--color-element-active': accentUI,
      // Приглушённый акцентный цвет для неактивных кнопок/радио — бледный оттенок темы
      '--color-element-muted': (() => {
        if (normalizedTheme === 'light') {
          const blended = this.blendColors(accentUI, base.surface, 0.12);
          return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : '#e5e5e5';
        }
        if (normalizedTheme === 'dim') {
          const blended = this.blendColors(accentUI, base.surface, 0.16);
          return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : '#3a3632';
        }
        const blended = this.blendColors(accentUI, base.surface, 0.2);
        return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : '#2e2a26';
      })(),
      '--color-on-element-muted': base.onSurface,
      '--color-element-muted-hover': (() => {
        if (normalizedTheme === 'light') {
          const blended = this.blendColors(accentUI, base.surface, 0.18);
          return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : '#d5d5d5';
        }
        if (normalizedTheme === 'dim') {
          const blended = this.blendColors(accentUI, base.surface, 0.24);
          return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : '#48433d';
        }
        const blended = this.blendColors(accentUI, base.surface, 0.3);
        return blended ? this.rgbToHex(blended.r, blended.g, blended.b) : '#3a3632';
      })(),

      // Состояния элементов (disabled, focus, placeholder)
      '--color-disabled': this._solidAccentWash(accentUI, base.surface, normalizedTheme === 'light' ? 0.06 : 0.04),
      '--color-on-disabled': this.withOpacity(base.onSurface, normalizedTheme === 'light' ? 0.4 : 0.35),
      '--color-focus-ring': accentUI,
      '--color-placeholder': this.withOpacity(base.onSurface, normalizedTheme === 'light' ? 0.45 : 0.35),
      '--color-selection-background': this.withOpacity(accentUI, normalizedTheme === 'light' ? 0.15 : 0.2),

      // Границы — accentUI для контраста
      '--color-border': this._blendBorder(accentUI, base.border, op.border[normalizedTheme]),

      // Календарь / метрики: минус и «ниже нуля» без семантического красного
      '--color-metric-negative': this._metricNegativeColor(base),

      // Семантические (динамические — адаптируются к теме и насыщенности акцента)
      // Категории задач (адаптируются к теме)
      ...this._generateTaskCategoryColors(normalizedTheme),
      
      // Типы транзакций (адаптируются к теме)
      ...this._generateTransactionColors(normalizedTheme),

      ...this._generateSemanticColors(accent, normalizedTheme),

      // Эффекты (теневые уровни)
      '--shadow-section-none': shadowSectionNone,
      '--shadow-section-subtle': shadowSectionSubtle,
      '--shadow-section-moderate': shadowSectionModerate,
      '--shadow-section-strong': shadowSectionStrong,
      '--shadow-section-level': shadowSectionLevel,
      
      '--shadow-card-none': shadowCardNone,
      '--shadow-card-subtle': shadowCardSubtle,
      '--shadow-card-moderate': shadowCardModerate,
      '--shadow-card-strong': shadowCardStrong,
      '--shadow-card-level': shadowCardLevel,

      // «Стекло» отключено (backdrop-filter убран из UI); токены оставлены для совместимости/будущих тем
      '--effect-glass-blur': '0px',
      '--effect-modal-backdrop-blur': '0px',
      '--effect-glass-background': 'var(--color-section-fill-dense, var(--color-section-fill))',
      '--effect-glass-backdrop': 'none',
      '--shadow-edge-sm': `2px 0 4px ${this.withOpacity(inkHex, edgeAlphas.sm)}`,
      '--shadow-edge-md': `2px 0 4px ${this.withOpacity(inkHex, edgeAlphas.md)}`,
      '--shadow-edge-lg': `2px 0 6px ${this.withOpacity(inkHex, edgeAlphas.lg)}`,
      '--shadow-sticky-header': normalizedTheme === 'light'
        ? `2px 0 4px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.06)`
        : normalizedTheme === 'dim'
          ? `2px 0 4px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.055), 0 0 0 1px ${this.withOpacity(inkHex, 0.02)}`
          : `2px 0 4px ${this.withOpacity(inkHex, 0.09)}`,
      '--shadow-sticky-date': normalizedTheme === 'light'
        ? `2px 0 6px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.04)`
        : normalizedTheme === 'dim'
          ? `2px 0 6px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.035), 0 0 0 1px ${this.withOpacity(inkHex, 0.02)}`
          : `2px 0 6px ${this.withOpacity(inkHex, 0.05)}`,
      '--shadow-popover': `0 12px 16px ${this.withOpacity(inkHex, edgeAlphas.popover)}`,
      '--shadow-elevate-sm': `0 2px 4px ${this.withOpacity(inkHex, edgeAlphas.elevate)}`,
      '--shadow-tooltip': `0 4px 12px ${this.withOpacity(inkHex, edgeAlphas.tooltip)}`,
      '--color-border-raised-muted': borderRaisedMuted,
      '--color-border-raised-emphasis': borderRaisedEmphasis,

      // Обратная совместимость
      '--shadow-section': shadowSectionLevel,
      '--shadow-colored': this._generateColoredShadow(accent, normalizedTheme, base),
      '--color-page-background': intensity <= 0
        ? base.surface
        : this._generateGradient(accentRgb, grad, base.surface, clampedIntensity / MAX_GRADIENT_INTENSITY),
      
      // RGB значения акцента для использования в CSS (для цветных теней)
      '--accent-r': accentRgb.r,
      '--accent-g': accentRgb.g,
      '--accent-b': accentRgb.b,

      // Для палитр palette.css (--palette-1..10)
      '--theme-hue': String(this.hexToHsl(accent).h),
      '--intensity': String(intensity)
    };

    // Цвета категорий задач
    Object.entries(this.CONFIG.taskCategories).forEach(([key, value]) => {
      tokens[`--task-${key}`] = value;
    });

    // Цвета типов транзакций
    Object.entries(this.CONFIG.transactionTypes).forEach(([key, value]) => {
      tokens[`--transaction-${key}`] = value;
    });

    return tokens;
  }

  /**
   * Полный набор токенов для темы (для синхронизации themes/index.css с дефолтным акцентом).
   * После правок CONFIG / generateTokens обновите fallbacks: см. комментарий в themes/index.css.
   */
  static getFallbackTokensForTheme(themeKey, accentHex = null) {
    const accent = accentHex || this.CONFIG.accents[0].value;
    return this.generateTokens(accent, themeKey, 'subtle', 1);
  }

  // ============================================
  // ПРИМЕНЕНИЕ
  // ============================================
  static apply(accent = null, theme = null, shadowLevel = null) {
    accent = accent || localStorage.getItem('aura-accent-color') || this.CONFIG.accents[0].value;
    theme = theme || document.documentElement.getAttribute('data-theme') || 'dark';

    // Всегда используем минимальные тени (subtle)
    shadowLevel = 'subtle';

    const db = typeof window !== 'undefined' && window.getDB ? window.getDB() : null;
    const gradientIntensity = (db && typeof db.getAppSettings === 'function') ? (db.getAppSettings()?.gradient_intensity ?? 1) : 1;
    const tokens = this.generateTokens(accent, theme, shadowLevel, gradientIntensity);
    const root = document.documentElement;

    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value, 'important');
    });

    return { accent, theme, shadowLevel, tokens };
  }

  // ============================================
  // ПУБЛИЧНЫЙ API
  // ============================================
  static init() {
    this.apply();
    // Автоматическое обновление при смене темы
    new MutationObserver(() => this.apply()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  static setAccent(color) {
    localStorage.setItem('aura-accent-color', color);
    this.apply(color);
    
    // Отправляем событие об изменении акцентного цвета
    window.dispatchEvent(new CustomEvent('accentColorChanged', {
      detail: { color }
    }));
  }

  static setTheme(theme) {
    const normalizedTheme = this.CONFIG.themes[theme] ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    localStorage.setItem('aura-theme', normalizedTheme);
    this.apply();
    
    // Отправляем событие об изменении темы
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: normalizedTheme }
    }));
  }

  /**
   * Получает отсортированные и отфильтрованные пресеты цветов
   * @returns {Array} Массив цветов, отсортированных по оттенку, без похожих
   */
  static getPresets() {
    let accents = [...this.CONFIG.accents];
    
    // Удаляем похожие цвета (расстояние < 20)
    // Порог 20 означает, что удаляются только очень похожие цвета
    // (с близким оттенком, насыщенностью и яркостью)
    accents = this._removeSimilarColors(accents, 20);
    
    // Разделяем на цветные и серые (с низкой насыщенностью)
    const colored = [];
    const grays = [];
    
    accents.forEach(accent => {
      const hsl = this.hexToHsl(accent.value);
      if (hsl.s < 25) {
        // Серые/приглушенные цвета (насыщенность < 25%)
        grays.push(accent);
      } else {
        colored.push(accent);
      }
    });
    
    // Сортируем цветные по оттенку (hue)
    // Учитываем, что красный = 0 или 360, поэтому красные должны быть в начале
    colored.sort((a, b) => {
      const hslA = this.hexToHsl(a.value);
      const hslB = this.hexToHsl(b.value);
      
      // Нормализуем оттенки для правильной сортировки
      // Красные цвета (H > 330) должны быть в начале вместе с красными (H < 30)
      let hA = hslA.h;
      let hB = hslB.h;
      
      // Если оттенок больше 330, это красный цвет, нормализуем его к отрицательному
      // чтобы он был перед оранжевыми, но после других красных
      if (hA > 330) {
        hA = hA - 360;
      }
      if (hB > 330) {
        hB = hB - 360;
      }
      
      return hA - hB;
    });
    
    // Серые сортируем по яркости (от светлых к темным)
    grays.sort((a, b) => {
      const hslA = this.hexToHsl(a.value);
      const hslB = this.hexToHsl(b.value);
      return hslB.l - hslA.l; // От светлых к темным
    });
    
    // Объединяем: сначала цветные, потом серые
    return [...colored, ...grays];
  }

  /**
   * Удаляет похожие цвета из массива
   * @param {Array} colors - Массив цветов
   * @param {number} threshold - Порог расстояния (по умолчанию 20)
   * @returns {Array} Отфильтрованный массив
   */
  static _removeSimilarColors(colors, threshold = 20) {
    const filtered = [];
    
    for (const color of colors) {
      let isSimilar = false;
      
      for (const existing of filtered) {
        const hsl1 = this.hexToHsl(color.value);
        const hsl2 = this.hexToHsl(existing.value);
        
        // Вычисляем разницу оттенка с учетом циклической природы
        const hDiff = Math.min(
          Math.abs(hsl1.h - hsl2.h),
          360 - Math.abs(hsl1.h - hsl2.h)
        );
        
        // Удаляем только если оттенок очень близкий (менее 15 градусов)
        // И насыщенность и яркость тоже близкие (разница менее 15%)
        if (hDiff < 15 && 
            Math.abs(hsl1.s - hsl2.s) < 15 && 
            Math.abs(hsl1.l - hsl2.l) < 15) {
          isSimilar = true;
          break;
        }
      }
      
      if (!isSimilar) {
        filtered.push(color);
      }
    }
    
    return filtered;
  }

  static getDefaultAccent() {
    return this.CONFIG.accents[0].value;
  }

  /**
   * Получает цвет категории задачи
   * @param {string} category - Тип категории ('rituals', 'time', 'body', 'deps')
   * @returns {string} HSL цвет категории
   */
  static getTaskCategoryColor(category) {
    return taskCategoriesConfigService.getColor(category);
  }

  /**
   * Получает цвет типа транзакции
   * @param {string} type - Тип транзакции ('income', 'expense', 'transfer')
   * @returns {string} HSL цвет типа транзакции
   */
  static getTransactionTypeColor(type) {
    return this.CONFIG.transactionTypes[type] || this.CONFIG.accents[0].value;
  }
}

export default ColorSystem;
