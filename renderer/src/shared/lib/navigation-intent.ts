export type NavigationIntentDetail = Record<string, unknown>;

export function setNavigationIntent<T extends NavigationIntentDetail>(
  storageKey: string,
  eventName: string,
  detail: T
) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(detail));
  } catch {
    /* ignore storage failures */
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function getNavigationIntent<T extends NavigationIntentDetail>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function consumeNavigationIntent<T extends NavigationIntentDetail>(storageKey: string): T | null {
  const value = getNavigationIntent<T>(storageKey);
  if (value) {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore storage failures */
    }
  }
  return value;
}
