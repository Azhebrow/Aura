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
  LS_FONT_KEY,
  LS_THEME_KEY,
  type AuraAccentPreset,
  type AuraThemeMode,
  isAuraAccentPreset,
  isAuraThemeMode,
} from '@/features/theme/theme-constants';
import { applyAuraAccentPreset, applyAuraFontFamily, applyAuraThemeMode } from '@/features/theme/apply-theme-dom';
import { DEFAULT_AURA_FONT, isAuraFontFamily, type AuraFontFamily } from '@/features/theme/font-constants';
import { ensureAuraFontsStylesheet } from '@/features/theme/load-google-fonts';

type ThemeContextValue = {
  theme: AuraThemeMode;
  setTheme: (mode: AuraThemeMode) => void;
  accentPreset: AuraAccentPreset;
  setAccentPreset: (preset: AuraAccentPreset) => void;
  fontFamily: AuraFontFamily;
  setFontFamily: (font: AuraFontFamily) => void;
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AuraThemeMode>(() => readStoredTheme());
  const [accentPreset, setAccentPresetState] = useState<AuraAccentPreset>(() => readStoredAccentPreset());
  const [fontFamily, setFontFamilyState] = useState<AuraFontFamily>(() => readStoredFontFamily());

  useLayoutEffect(() => {
    ensureAuraFontsStylesheet();
  }, []);

  useLayoutEffect(() => {
    applyAuraThemeMode(theme);
    applyAuraAccentPreset(accentPreset, theme);
    applyAuraFontFamily(fontFamily);
  }, [accentPreset, fontFamily, theme]);

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

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      accentPreset,
      setAccentPreset,
      fontFamily,
      setFontFamily,
    }),
    [accentPreset, fontFamily, setAccentPreset, setFontFamily, setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAuraTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAuraTheme must be used within ThemeProvider');
  return ctx;
}
