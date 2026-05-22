// ─── Settings References: Index ───────────────────────────────────────────────
// Агрегатор всех справочников настроек по доменам.
// Импортируйте SETTINGS_REFERENCES или getSettingsReference() из этого файла.

export type {
  SettingsReference,
  SettingsFieldDef,
  SettingsReferenceUsage,
  SettingsReferenceRelated,
  SettingsReferenceAdditionalFunction,
  SettingsReferenceImpact,
  TaskTypeGuide,
} from './types';

export { INTERFACE_REFERENCES } from './interface';
export { RITUALS_REFERENCES }   from './rituals';
export { TASKS_REFERENCES }     from './tasks';
export { FINANCE_REFERENCES }   from './finance';
export { LEISURE_REFERENCES }   from './leisure';
export { AMBIENT_REFERENCES }   from './ambient';
export { DIARY_REFERENCES }     from './diary';
export { NUTRITION_REFERENCES } from './nutrition';

import { INTERFACE_REFERENCES } from './interface';
import { RITUALS_REFERENCES }   from './rituals';
import { TASKS_REFERENCES }     from './tasks';
import { FINANCE_REFERENCES }   from './finance';
import { LEISURE_REFERENCES }   from './leisure';
import { AMBIENT_REFERENCES }   from './ambient';
import { DIARY_REFERENCES }     from './diary';
import { NUTRITION_REFERENCES } from './nutrition';
import type { SettingsReference } from './types';

/** Объединённый справочник всех секций конфига */
export const SETTINGS_REFERENCES: Record<string, SettingsReference> = {
  ...INTERFACE_REFERENCES,
  ...RITUALS_REFERENCES,
  ...TASKS_REFERENCES,
  ...FINANCE_REFERENCES,
  ...LEISURE_REFERENCES,
  ...AMBIENT_REFERENCES,
  ...DIARY_REFERENCES,
  ...NUTRITION_REFERENCES,
};

/** Возвращает справочник для секции по её id, или undefined */
export function getSettingsReference(id: string): SettingsReference | undefined {
  return SETTINGS_REFERENCES[id];
}
