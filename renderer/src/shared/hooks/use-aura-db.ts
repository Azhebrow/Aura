import { useEffect, useState } from 'react';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import type { AuraDatabase } from '@/types/aura';

/** Try to resolve the database synchronously on the first render.
 *  In both Electron (preload injects window.getDB before React starts) and
 *  web mode (init-web-db-bridge sets window.getDB synchronously before React),
 *  the db is usually available immediately — no async wait needed.
 */
function tryGetDbSync(): AuraDatabase | null {
  if (typeof window === 'undefined') return null;
  const getDB = (window as Window & { getDB?: () => AuraDatabase | null }).getDB;
  if (typeof getDB !== 'function') return null;
  try {
    return getDB() ?? null;
  } catch {
    return null;
  }
}

export function useAuraDb() {
  const [db, setDb] = useState<AuraDatabase | null>(tryGetDbSync);
  const [ready, setReady] = useState(() => Boolean(tryGetDbSync()));

  useEffect(() => {
    // If we already resolved synchronously, nothing to do.
    if (db) return;

    let cancelled = false;
    waitForAuraDatabase()
      .then(() => {
        if (cancelled) return;
        const getDB = window.getDB;
        const instance =
          typeof getDB === 'function' ? (getDB() as AuraDatabase | null) : null;
        setDb(instance);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setDb(null);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  return { db, ready };
}
