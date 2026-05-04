/**
 * ui.ts — Universal types for UI configuration objects.
 * Forms, lists, and dialogs are always described by these contracts.
 */

import type { LucideIcon } from 'lucide-react';
import type { CfgFieldDef } from '@/features/settings/cfg-section-types';

// Re-export for convenience — FieldConfig IS CfgFieldDef (same contract)
export type FieldConfig = CfgFieldDef;

// ─── Form ─────────────────────────────────────────────────────────────────────
export type FormConfig<T extends Record<string, unknown> = Record<string, unknown>> = {
  fields:       FieldConfig[];
  defaults:     Partial<T>;
  onSubmit:     (values: T) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
};

// ─── List ─────────────────────────────────────────────────────────────────────
export type ListConfig<T> = {
  items:        T[];
  keyExtractor: (item: T) => string;
  renderItem:   (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  emptyIcon?:   LucideIcon;
};

// ─── Dialog ───────────────────────────────────────────────────────────────────
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

export type DialogConfig = {
  title:    string;
  icon?:    LucideIcon;
  size?:    DialogSize;
  onClose?: () => void;
};
