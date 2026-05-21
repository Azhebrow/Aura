import type i18n from 'i18next';
import type { CfgFieldDef, CfgSectionSpec } from '@/features/settings/cfg-section-types';

function translateMaybeI18nKey(value: string | undefined, t: typeof i18n.t): string | undefined {
  if (!value) return value;
  const key = value.trim();
  if (!key.includes(':')) return value;
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  return `${leading}${t(key, { ns: 'settings_cfg' })}${trailing}`;
}

export function translateCfgFieldDef(field: CfgFieldDef, t: typeof i18n.t): CfgFieldDef {
  const isI18nKey = (str: string): boolean => str.includes(':');

  return {
    ...field,
    label: isI18nKey(field.label) ? t(field.label, { ns: 'settings_cfg' }) : field.label,
    hint: translateMaybeI18nKey(field.hint, t),
    suffix: translateMaybeI18nKey(field.suffix, t),
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
