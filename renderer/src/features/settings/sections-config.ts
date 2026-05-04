import { LEISURE_CATEGORY_META, NUTRITION_SECTION_META, TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';
/** Как в legacy `settings-sections-config.js` — порядок пунктов меню настроек. */
export type SettingsSectionDef = {
  id: string;
  title: string;
  configKey: string;
};

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  { id: 'tasks-rituals', title: TASK_CATEGORY_DEFAULT_META.rituals.title, configKey: 'tasks-rituals' },
  { id: 'tasks-time', title: TASK_CATEGORY_DEFAULT_META.time.title, configKey: 'tasks-time' },
  { id: 'tasks-body', title: TASK_CATEGORY_DEFAULT_META.body.title, configKey: 'tasks-body' },
  { id: 'tasks-deps', title: TASK_CATEGORY_DEFAULT_META.deps.title, configKey: 'tasks-deps' },
  { id: 'rituals-morning', title: 'Утренние ритуалы', configKey: 'rituals-morning' },
  { id: 'rituals-evening', title: 'Вечерние ритуалы', configKey: 'rituals-evening' },
  { id: 'rituals-vows', title: 'Обеты', configKey: 'rituals-vows' },
  { id: 'finance-accounts', title: 'Счета', configKey: 'finance-accounts' },
  { id: 'finance-income', title: 'Доходы', configKey: 'finance-income' },
  { id: 'finance-expense', title: 'Расходы', configKey: 'finance-expense' },
  { id: 'leisure-filling', title: LEISURE_CATEGORY_META.filling.title, configKey: 'leisure-filling' },
  { id: 'leisure-escape', title: LEISURE_CATEGORY_META.escape.title, configKey: 'leisure-escape' },
  { id: 'diary-categories', title: 'Категории дневника', configKey: 'diary-categories' },
  { id: 'diary-moods', title: 'Настроения', configKey: 'diary-moods' },
  { id: 'diary-entry-presets', title: 'Цитаты записи', configKey: 'diary-entry-presets' },
  { id: 'ambient-music', title: 'Фоновая музыка', configKey: 'ambient-music' },
  { id: 'nutrition-products', title: NUTRITION_SECTION_META.products.title, configKey: 'nutrition-products' },
  { id: 'nutrition-presets', title: NUTRITION_SECTION_META.presets.title, configKey: 'nutrition-presets' },
];
