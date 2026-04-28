import { useEffect, useState } from 'react';
import { waitForAuraDatabase } from '@/shared/bridge/wait-for-database';
import type { AuraDatabase } from '@/types/aura';

export function useAuraDb() {
  const [db, setDb] = useState<AuraDatabase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
  }, []);

  return { db, ready };
}
