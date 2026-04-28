/**
 * Ждёт инъекцию window.getDB из main-процесса (событие `aura-db-ready`).
 */
export function waitForAuraDatabase(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  const tryResolve = (resolve: () => void) => {
    const getDB = window.getDB;
    if (typeof getDB !== 'function') return false;
    try {
      const db = getDB();
      if (db) {
        resolve();
        return true;
      }
    } catch {
      /* БД ещё не готова */
    }
    return false;
  };

  return new Promise((resolve) => {
    if (tryResolve(resolve)) return;
    const onReady = () => {
      window.removeEventListener('aura-db-ready', onReady);
      resolve();
    };
    window.addEventListener('aura-db-ready', onReady);
  });
}
