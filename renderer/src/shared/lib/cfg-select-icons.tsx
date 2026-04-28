import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Beef,
  Circle,
  Flame,
  Hash,
  ListOrdered,
  PiggyBank,
  Salad,
  Sparkles,
  SquareCheckBig,
  Sun,
  Sunrise,
  Sunset,
  Tag,
  Timer,
  Wallet,
  Wheat,
} from 'lucide-react';

const iconCls = 'text-muted-foreground size-4 shrink-0';

function Ic(Icon: LucideIcon) {
  return <Icon className={iconCls} aria-hidden />;
}

/** Иконка для пункта CFG-Select (по таблице, полю и значению). */
export function CfgSelectOptionIcon(table: string, fieldKey: string, value: string): ReactNode {
  if (fieldKey === 'task_type') {
    if (value === 'checkbox') return Ic(SquareCheckBig);
    if (value === 'number') return Ic(Hash);
    if (value === 'ritual') return Ic(Sparkles);
    if (value === 'nutrition') return Ic(Salad);
    if (value === 'list') return Ic(ListOrdered);
    if (value === 'timer') return Ic(Timer);
  }
  if (fieldKey === 'ritual_type') {
    if (value === 'sunrise') return Ic(Sunrise);
    if (value === 'sunset') return Ic(Sunset);
    if (value === 'sun') return Ic(Sun);
  }
  if (fieldKey === 'group') {
    if (value === 'proteins') return Ic(Beef);
    if (value === 'fats') return Ic(Flame);
    if (value === 'carbs') return Ic(Wheat);
  }
  if (fieldKey === 'type' && table === 'cfg_accounts') {
    if (value === 'regular') return Ic(Wallet);
    if (value === 'savings') return Ic(PiggyBank);
  }
  if (fieldKey === 'type' && table === 'cfg_expense_categories') {
    if (value === '__ordinary__' || value === 'ordinary' || value === '') return Ic(Tag);
    if (value === 'compulsive') return Ic(AlertTriangle);
  }
  return Ic(Circle);
}
