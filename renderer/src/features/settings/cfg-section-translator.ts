import type i18n from 'i18next';
import type { CfgFieldDef, CfgSectionSpec } from '@/features/settings/cfg-section-types';

export function translateCfgFieldDef(field: CfgFieldDef, t: typeof i18n.t): CfgFieldDef {
  const isI18nKey = (str: string): boolean => str.includes(':');

  return {
    ...field,
    label: isI18nKey(field.label) ? t(field.label, { ns: 'settings_cfg' }) : field.label,
    hint: field.hint && isI18nKey(field.hint) ? t(field.hint, { ns: 'settings_cfg' }) : field.hint,
    suffix: field.suffix && isI18nKey(field.suffix) ? t(field.suffix, { ns: 'settings_cfg' }) : field.suffix,
    options: field.options?.map((opt) => ({
      ...opt,
      label: isI18nKey(opt.label) ? t(opt.label, { ns: 'settings_cfg' }) : opt.label,
    })),
  };
}

export function translateCfgSectionSpec(spec: CfgSectionSpec, t: typeof i18n.t): CfgSectionSpec {
  const isI18nKey = (str: string): boolean => str.includes(':');

  return {
    ...spec,
    title: isI18nKey(spec.title) ? t(spec.title, { ns: 'settings_cfg' }) : spec.title,
    fields: spec.fields.map((field) => translateCfgFieldDef(field, t)),
  };
}
