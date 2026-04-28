import type { StatsMode } from '@/shared/stats/types';

export type PrimaryEvilVariant = 'dottedArea' | 'composedFinance' | 'pie' | 'pingingLine';
export type SecondaryEvilVariant = 'multipleBar' | 'glowingBar' | 'defaultBar' | 'glowingVerticalBar';

export const PRIMARY_EVIL_VARIANT: Record<StatsMode, PrimaryEvilVariant> = {
  tasks: 'dottedArea',
  rituals: 'dottedArea',
  finance: 'composedFinance',
  mood: 'pie',
  rank: 'pingingLine',
  time: 'dottedArea',
  leisure: 'dottedArea',
  nutrition: 'dottedArea',
  correlation: 'dottedArea',
};

export const SECONDARY_EVIL_VARIANT: Record<StatsMode, SecondaryEvilVariant> = {
  tasks: 'multipleBar',
  rituals: 'multipleBar',
  finance: 'glowingBar',
  mood: 'defaultBar',
  rank: 'glowingVerticalBar',
  time: 'glowingVerticalBar',
  leisure: 'glowingVerticalBar',
  nutrition: 'multipleBar',
  correlation: 'glowingVerticalBar',
};
