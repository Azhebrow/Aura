import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Ban,
  BookHeart,
  BookOpen,
  BookText,
  Ghost,
  Apple,
  Flame,
  ListTodo,
  Moon,
  Music,
  PiggyBank,
  Settings2,
  Sparkles,
  Sun,
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
    label: 'Старт',
    items: [
      { id: 'interface-data', title: 'Система', icon: Settings2 },
      { id: 'app-guide', title: 'Гайд', icon: BookOpen },
    ],
  },
  {
    id: 'day-habits',
    label: 'День',
    items: [
      { id: 'tasks-rituals', title: TASK_CATEGORY_DEFAULT_META.rituals.title, icon: Sparkles },
      { id: 'tasks-time', title: TASK_CATEGORY_DEFAULT_META.time.title, icon: ListTodo },
      { id: 'tasks-body', title: TASK_CATEGORY_DEFAULT_META.body.title, icon: Activity },
      { id: 'tasks-deps', title: TASK_CATEGORY_DEFAULT_META.deps.title, icon: Ban },
      { id: 'rituals-morning', title: 'Утро', icon: Sun },
      { id: 'rituals-evening', title: 'Вечер', icon: Moon },
      { id: 'rituals-vows', title: 'Обеты', icon: Flame },
    ],
  },
  {
    id: 'recovery',
    label: 'Досуг',
    items: [
      { id: 'leisure-filling', title: LEISURE_CATEGORY_META.filling.title, icon: Sparkles },
      { id: 'leisure-escape', title: LEISURE_CATEGORY_META.escape.title, icon: Ghost },
      { id: 'ambient-music', title: 'Музыка', icon: Music },
    ],
  },
  {
    id: 'diary',
    label: 'Дневник',
    items: [
      { id: 'diary-categories', title: 'Категории', icon: BookHeart },
      { id: 'diary-entry-presets', title: 'Цитаты', icon: BookText },
    ],
  },
  {
    id: 'nutrition',
    label: 'Питание',
    items: [
      { id: 'nutrition-products', title: NUTRITION_SECTION_META.products.title, icon: Apple },
      { id: 'nutrition-presets', title: NUTRITION_SECTION_META.presets.title, icon: UtensilsCrossed },
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
];

export function flattenSettingsNav(): SettingsNavItem[] {
  return SETTINGS_NAV_GROUPS.flatMap((g) => g.items);
}
