import type ruCommon from './locales/ru/common';
import type ruNav from './locales/ru/nav';
import type ruSettings from './locales/ru/settings';
import type ruAppearance from './locales/ru/appearance';
import type ruDomain from './locales/ru/domain';
import type ruRanks from './locales/ru/ranks';
import type ruSettingsInfo from './locales/ru/settings_info';
import type ruSettingsRefs from './locales/ru/settings_refs';
import type ruSettingsInstructions from './locales/ru/settings_instructions';
import type ruGuide from './locales/ru/guide';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof ruCommon;
      nav: typeof ruNav;
      settings: typeof ruSettings;
      appearance: typeof ruAppearance;
      domain: typeof ruDomain;
      ranks: typeof ruRanks;
      settings_info: typeof ruSettingsInfo;
      settings_refs: typeof ruSettingsRefs;
      settings_instructions: typeof ruSettingsInstructions;
      guide: typeof ruGuide;
    };
  }
}
