import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  Flame,
  House,
  Settings,
  Timer,
  Trophy,
} from 'lucide-react';
import type { PageId } from '@/shared/config/nav-model';

/** Единая карта иконок для chrome (sidebar + mobile dock). */
export const PAGE_ICONS: Record<PageId, LucideIcon> = {
  home: House,
  rituals: Flame,
  diary: BookOpen,
  timer: Timer,
  ranks: Trophy,
  stats: ChartColumn,
  calendar: CalendarDays,
  settings: Settings,
};
