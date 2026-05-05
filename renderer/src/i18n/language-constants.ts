export const LS_LANGUAGE_KEY = 'aura-language';

export type AuraLanguage = 'ru' | 'en';

export function isAuraLanguage(s: string | null | undefined): s is AuraLanguage {
  return s === 'ru' || s === 'en';
}

export const DEFAULT_LANGUAGE: AuraLanguage = 'ru';
