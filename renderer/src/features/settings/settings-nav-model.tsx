import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Ban,
  BookHeart,
  Ghost,
  Apple,
  Flame,
  ListTodo,
  Moon,
  Music,
  Palette,
  PiggyBank,
  Settings2,
  Smile,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { LEISURE_CATEGORY_META, NUTRITION_SECTION_META, TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';

export type SettingsNavItem = {
  id: string;
  title: string;
  icon: LucideIcon;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: 'system',
    label: 'Система',
    items: [{ id: 'appearance', title: 'Оформление', icon: Palette }],
  },
  {
    id: 'advanced',
    label: 'Дополнительно',
    items: [{ id: 'app-snapshot', title: 'Данные и навигация', icon: Settings2 }],
  },
  {
    id: 'rituals',
    label: 'Ритуалы',
    items: [
      { id: 'rituals-morning', title: 'Утренние ритуалы', icon: Sun },
      { id: 'rituals-evening', title: 'Вечерние ритуалы', icon: Moon },
      { id: 'rituals-vows', title: 'Обеты', icon: Flame },
    ],
  },
  {
    id: 'tasks',
    label: 'Задачи',
    items: [
      { id: 'tasks-rituals', title: TASK_CATEGORY_DEFAULT_META.rituals.title, icon: Sparkles },
      { id: 'tasks-time', title: TASK_CATEGORY_DEFAULT_META.time.title, icon: ListTodo },
      { id: 'tasks-body', title: TASK_CATEGORY_DEFAULT_META.body.title, icon: Activity },
      { id: 'tasks-deps', title: TASK_CATEGORY_DEFAULT_META.deps.title, icon: Ban },
    ],
  },
  {
    id: 'finance',
    label: 'Финансы',
    items: [
      { id: 'finance-accounts', title: 'Счета', icon: PiggyBank },
      { id: 'finance-income', title: 'Доходы', icon: TrendingUp },
      { id: 'finance-expense', title: 'Расходы', icon: TrendingDown },
    ],
  },
  {
    id: 'leisure',
    label: 'Досуг',
    items: [
      { id: 'leisure-filling', title: LEISURE_CATEGORY_META.filling.title, icon: Sparkles },
      { id: 'leisure-escape', title: LEISURE_CATEGORY_META.escape.title, icon: Ghost },
    ],
  },
  {
    id: 'diary',
    label: 'Дневник и питание',
    items: [
      { id: 'diary-moods', title: 'Настроения', icon: Smile },
      { id: 'diary-categories', title: 'Категории дневника', icon: BookHeart },
      { id: 'nutrition-targets', title: 'Цели КБЖУ', icon: Target },
      { id: 'nutrition-products', title: NUTRITION_SECTION_META.products.title, icon: Apple },
      { id: 'nutrition-presets', title: NUTRITION_SECTION_META.presets.title, icon: UtensilsCrossed },
    ],
  },
  {
    id: 'ambient',
    label: 'Медиа',
    items: [{ id: 'ambient-music', title: 'Фоновая музыка', icon: Music }],
  },
];

export function flattenSettingsNav(): SettingsNavItem[] {
  return SETTINGS_NAV_GROUPS.flatMap((g) => g.items);
}
