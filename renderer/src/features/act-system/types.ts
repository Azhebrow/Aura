import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ActItemKind =
  | 'transaction'
  | 'daily-plan'
  | 'nutrition'
  | 'timer-session'
  | 'ritual'
  | 'goal-progress'
  | 'diary';

export type ActItemState = 'default' | 'done' | 'locked' | 'active';

export type ActItemAction = {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
};

export type ActItem = {
  id: string;
  kind: ActItemKind;
  title: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
  icon?: string | null;
  iconTint?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  state?: ActItemState;
  density?: 'normal' | 'compact';
  checked?: boolean;
  disabled?: boolean;
  onActivate?: () => void;
  onToggle?: (checked: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  actions?: ActItemAction[];
};

export type ActComposerOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
};

export type ActComposerConfig = {
  options?: ActComposerOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  iconOptions?: string[];
  iconValue?: string;
  onIconChange?: (value: string) => void;
  fields?: ReactNode;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
};
