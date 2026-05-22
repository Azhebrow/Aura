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
  LS_LANGUAGE_KEY,
  DEFAULT_LANGUAGE,
  isAuraLanguage,
  type AuraLanguage,
} from '@/i18n/language-constants';
import i18n from '@/i18n/config';

type LanguageContextValue = {
  language: AuraLanguage;
  setLanguage: (lang: AuraLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): AuraLanguage {
  try {
    const raw = localStorage.getItem(LS_LANGUAGE_KEY);
    if (raw && isAuraLanguage(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AuraLanguage>(
    () => readStoredLanguage()
  );

  // Update html[lang] and i18n instance synchronously before paint
  useLayoutEffect(() => {
    document.documentElement.setAttribute('lang', language);
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  const setLanguage = useCallback((lang: AuraLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LS_LANGUAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useAuraLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useAuraLanguage must be used within LanguageProvider');
  return ctx;
}
