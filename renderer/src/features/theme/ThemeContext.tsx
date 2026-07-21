import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  LS_ACCENT_KEY,
  LS_COLOR_FILTER_KEY,
  LS_FONT_KEY,
  LS_ICON_THEME_KEY,
  LS_STRICT_MODE_KEY,
  LS_THEME_KEY,
  type AuraAccentPreset,
  type AuraColorFilter,
  type AuraIconTheme,
  type AuraStrictMode,
  type AuraThemeMode,
  isAuraAccentPreset,
  isAuraIconTheme,
  isAuraThemeMode,
  normalizeAuraAccentPreset,
  normalizeAuraThemeMode,
} from '@/features/theme/theme-constants';
import { applyAuraAppearance } from '@/features/theme/apply-theme-dom';
import { DEFAULT_AURA_FONT, isAuraFontFamily, type AuraFontFamily } from '@/features/theme/font-constants';
import { ensureAuraFontsStylesheet } from '@/features/theme/load-google-fonts';

type ThemeContextValue = {
  theme: AuraThemeMode;
  setTheme: (mode: AuraThemeMode) => void;
  accentPreset: AuraAccentPreset;
  setAccentPreset: (preset: AuraAccentPreset) => void;
  fontFamily: AuraFontFamily;
  setFontFamily: (font: AuraFontFamily) => void;
  iconTheme: AuraIconTheme;
  setIconTheme: (theme: AuraIconTheme) => void;
  colorFilter: AuraColorFilter;
  setColorFilter: (filter: AuraColorFilter) => void;
  strictMode: AuraStrictMode;
  setStrictMode: (mode: AuraStrictMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): AuraThemeMode {
  try {
    const raw = localStorage.getItem(LS_THEME_KEY);
    if (raw && isAuraThemeMode(raw)) return raw;
    if (raw === 'dim') return 'tinted';
  } catch {
    /* ignore */
  }
  return 'dark';
}

function readStoredFontFamily(): AuraFontFamily {
  try {
    const raw = localStorage.getItem(LS_FONT_KEY);
    if (raw && isAuraFontFamily(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_AURA_FONT;
}

function readStoredAccentPreset(): AuraAccentPreset {
  try {
    const raw = localStorage.getItem(LS_ACCENT_KEY);
    if (raw && isAuraAccentPreset(raw)) return normalizeAuraAccentPreset(raw);
  } catch {
    /* ignore */
  }
  return 'fantasy';
}

function readStoredColorFilter(): AuraColorFilter {
  return 'standard';
}

function readStoredIconTheme(): AuraIconTheme {
  try {
    const raw = localStorage.getItem(LS_ICON_THEME_KEY);
    if (raw && isAuraIconTheme(raw)) return raw;
    if (raw === 'minimal') return 'plain';
    if (raw === 'gradient') return 'filled';
  } catch {
    /* ignore */
  }
  return 'filled';
}

function readStoredStrictMode(): AuraStrictMode {
  try {
    return localStorage.getItem(LS_STRICT_MODE_KEY) === 'on' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AuraThemeMode>(() => readStoredTheme());
  const [accentPreset, setAccentPresetState] = useState<AuraAccentPreset>(() => readStoredAccentPreset());
  const [fontFamily, setFontFamilyState] = useState<AuraFontFamily>(() => readStoredFontFamily());
  const [iconTheme, setIconThemeState] = useState<AuraIconTheme>(() => readStoredIconTheme());
  const [colorFilter, setColorFilterState] = useState<AuraColorFilter>(() => readStoredColorFilter());
  const [strictMode, setStrictModeState] = useState<AuraStrictMode>(() => readStoredStrictMode());

  useLayoutEffect(() => {
    ensureAuraFontsStylesheet();
  }, []);

  useLayoutEffect(() => {
    applyAuraAppearance({ theme, accentPreset, fontFamily, iconTheme, colorFilter, strictMode });
  }, [accentPreset, colorFilter, fontFamily, iconTheme, strictMode, theme]);

  const setTheme = useCallback((mode: AuraThemeMode) => {
    const normalized = normalizeAuraThemeMode(mode);
    setThemeState(normalized);
    try {
      localStorage.setItem(LS_THEME_KEY, normalized);
    } catch {
      /* ignore */
    }
    // Persist theme for Electron main process — used to set backgroundColor
    // before React loads, eliminating white flash on next launch.
    try {
      const uDataPath = (window as { __auraUserDataPath?: string }).__auraUserDataPath;
      if (uDataPath && typeof require !== 'undefined') {
        const fs = (require as NodeRequire)('fs') as { writeFileSync: (p: string, d: string) => void };
        const path = (require as NodeRequire)('path') as { join: (...p: string[]) => string };
        fs.writeFileSync(path.join(uDataPath, 'aura-prefs.json'), JSON.stringify({ theme: normalized }));
      }
    } catch {
      /* non-critical, ignore in web mode */
    }
  }, []);

  const setAccentPreset = useCallback((preset: AuraAccentPreset) => {
    const normalized = normalizeAuraAccentPreset(preset);
    setAccentPresetState(normalized);
    try {
      localStorage.setItem(LS_ACCENT_KEY, normalized);
    } catch {
      /* ignore */
    }
  }, []);

  const setFontFamily = useCallback((font: AuraFontFamily) => {
    setFontFamilyState(font);
    try {
      localStorage.setItem(LS_FONT_KEY, font);
    } catch {
      /* ignore */
    }
  }, []);

  const setIconTheme = useCallback((theme: AuraIconTheme) => {
    setIconThemeState(theme);
    try {
      localStorage.setItem(LS_ICON_THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, []);

  const setColorFilter = useCallback((filter: AuraColorFilter) => {
    setColorFilterState(filter);
    try {
      localStorage.setItem(LS_COLOR_FILTER_KEY, filter);
    } catch {
      /* ignore */
    }
  }, []);

  const setStrictMode = useCallback((mode: AuraStrictMode) => {
    setStrictModeState(mode);
    try {
      localStorage.setItem(LS_STRICT_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      accentPreset,
      setAccentPreset,
      fontFamily,
      setFontFamily,
      iconTheme,
      setIconTheme,
      colorFilter,
      setColorFilter,
      strictMode,
      setStrictMode,
    }),
    [accentPreset, colorFilter, fontFamily, iconTheme, setAccentPreset, setColorFilter, setFontFamily, setIconTheme, setStrictMode, setTheme, strictMode, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAuraTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAuraTheme must be used within ThemeProvider');
  return ctx;
}
