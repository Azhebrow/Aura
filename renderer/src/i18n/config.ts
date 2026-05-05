import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LS_LANGUAGE_KEY, DEFAULT_LANGUAGE, isAuraLanguage } from './language-constants';

// Russian locale imports
import ruCommon from './locales/ru/common';
import ruNav from './locales/ru/nav';
import ruSettings from './locales/ru/settings';
import ruAppearance from './locales/ru/appearance';
import ruDomain from './locales/ru/domain';
import ruRanks from './locales/ru/ranks';
import ruSettingsInfo from './locales/ru/settings_info';
import ruSettingsRefs from './locales/ru/settings_refs';
import ruSettingsInstructions from './locales/ru/settings_instructions';
import ruGuide from './locales/ru/guide';
import ruSettingsCfg from './locales/ru/settings_cfg';

// English locale imports
import enCommon from './locales/en/common';
import enNav from './locales/en/nav';
import enSettings from './locales/en/settings';
import enAppearance from './locales/en/appearance';
import enDomain from './locales/en/domain';
import enRanks from './locales/en/ranks';
import enSettingsInfo from './locales/en/settings_info';
import enSettingsRefs from './locales/en/settings_refs';
import enSettingsInstructions from './locales/en/settings_instructions';
import enGuide from './locales/en/guide';
import enSettingsCfg from './locales/en/settings_cfg';

function readStoredLanguage() {
  try {
    const raw = localStorage.getItem(LS_LANGUAGE_KEY);
    if (raw && isAuraLanguage(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  lng: readStoredLanguage(),
  fallbackLng: 'ru',
  defaultNS: 'common',
  ns: [
    'common',
    'nav',
    'settings',
    'appearance',
    'domain',
    'ranks',
    'settings_info',
    'settings_refs',
    'settings_instructions',
    'guide',
    'settings_cfg',
  ],
  resources: {
    ru: {
      common: ruCommon,
      nav: ruNav,
      settings: ruSettings,
      appearance: ruAppearance,
      domain: ruDomain,
      ranks: ruRanks,
      settings_info: ruSettingsInfo,
      settings_refs: ruSettingsRefs,
      settings_instructions: ruSettingsInstructions,
      guide: ruGuide,
      settings_cfg: ruSettingsCfg,
    },
    en: {
      common: enCommon,
      nav: enNav,
      settings: enSettings,
      appearance: enAppearance,
      domain: enDomain,
      ranks: enRanks,
      settings_info: enSettingsInfo,
      settings_refs: enSettingsRefs,
      settings_instructions: enSettingsInstructions,
      guide: enGuide,
      settings_cfg: enSettingsCfg,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
