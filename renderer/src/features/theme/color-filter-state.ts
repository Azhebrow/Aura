import type { AuraColorFilter } from './theme-constants';

let _filter: AuraColorFilter = 'standard';

export function setGlobalColorFilter(f: AuraColorFilter): void {
  _filter = f;
}

export function getGlobalColorFilter(): AuraColorFilter {
  return _filter;
}

export function filterColorValue(color: string): string {
  return color;
}
