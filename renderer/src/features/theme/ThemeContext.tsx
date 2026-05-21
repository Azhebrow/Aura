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
  LS_THEME_KEY,
  type AuraAccentPreset,
  type AuraColorFilter,
  type AuraThemeMode,
  isAuraAccentPreset,
  isAuraColorFilter,
  isAuraThemeMode,
} from '@/features/theme/theme-constants';
import { applyAuraAccentPreset, applyAuraColorFilter, applyAuraFontFamily, applyAuraThemeMode } from '@/features/theme/apply-theme-dom';
import { DEFAULT_AURA_FONT, isAuraFontFamily, type AuraFontFamily } from '@/features/theme/font-constants';
import { ensureAuraFontsStylesheet } from '@/features/theme/load-google-fonts';

type ThemeContextValue = {
  theme: AuraThemeMode;
  setTheme: (mode: AuraThemeMode) => void;
  accentPreset: AuraAccentPreset;
  setAccentPreset: (preset: AuraAccentPreset) => void;
  fontFamily: AuraFontFamily;
  setFontFamily: (font: AuraFontFamily) => void;
  colorFilter: AuraColorFilter;
  setColorFilter: (filter: AuraColorFilter) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): AuraThemeMode {
  try {
    const raw = localStorage.getItem(LS_THEME_KEY);
    if (raw && isAuraThemeMode(raw)) return raw;
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
    if (raw && isAuraAccentPreset(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'violet';
}

function readStoredColorFilter(): AuraColorFilter {
  try {
    const raw = localStorage.getItem(LS_COLOR_FILTER_KEY);
    if (raw && isAuraColorFilter(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'vivid';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AuraThemeMode>(() => readStoredTheme());
  const [accentPreset, setAccentPresetState] = useState<AuraAccentPreset>(() => readStoredAccentPreset());
  const [fontFamily, setFontFamilyState] = useState<AuraFontFamily>(() => readStoredFontFamily());
  const [colorFilter, setColorFilterState] = useState<AuraColorFilter>(() => readStoredColorFilter());

  useLayoutEffect(() => {
    ensureAuraFontsStylesheet();
  }, []);

  useLayoutEffect(() => {
    applyAuraThemeMode(theme);
    applyAuraAccentPreset(accentPreset, theme);
    applyAuraFontFamily(fontFamily);
    applyAuraColorFilter(colorFilter);
  }, [accentPreset, colorFilter, fontFamily, theme]);

  const setTheme = useCallback((mode: AuraThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(LS_THEME_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const setAccentPreset = useCallback((preset: AuraAccentPreset) => {
    setAccentPresetState(preset);
    try {
      localStorage.setItem(LS_ACCENT_KEY, preset);
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

  const setColorFilter = useCallback((filter: AuraColorFilter) => {
    setColorFilterState(filter);
    try {
      localStorage.setItem(LS_COLOR_FILTER_KEY, filter);
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
      colorFilter,
      setColorFilter,
    }),
    [accentPreset, colorFilter, fontFamily, setAccentPreset, setColorFilter, setFontFamily, setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAuraTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAuraTheme must be used within ThemeProvider');
  return ctx;
}
