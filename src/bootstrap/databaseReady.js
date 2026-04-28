import { databaseService } from '../system/services/index.js';

let dbInitialized = false;

export function initDatabaseService() {
  let getDBFunction = null;

  if (window.getDB && typeof window.getDB === 'function') {
    const testDB = window.getDB();
    if (testDB !== null) {
      getDBFunction = window.getDB;
      dbInitialized = true;
    }
  }

  if (!getDBFunction) {
    getDBFunction = () => null;
  }

  databaseService.init(getDBFunction);
}

export function updateDatabaseService() {
  if (window.getDB && typeof window.getDB === 'function' && !dbInitialized) {
    const db = window.getDB();
    if (db) {
      databaseService.init(window.getDB);
      dbInitialized = true;
      console.log('[AURA] ✅ База данных обновлена из main процесса');
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('aura-db-ready'));
      }
    }
  }
}

export async function waitForDatabase() {
  if (dbInitialized) {
    return true;
  }

  return new Promise((resolve) => {
    const checkDB = () => {
      if (window.getDB && typeof window.getDB === 'function') {
        const db = window.getDB();
        if (db) {
          updateDatabaseService();
          resolve(true);
          return;
        }
      }
      setTimeout(checkDB, 100);
    };

    if (typeof window.addEventListener !== 'undefined') {
      window.addEventListener('aura-db-ready', () => {
        updateDatabaseService();
        resolve(true);
      }, { once: true });
    }

    checkDB();

    setTimeout(() => {
      resolve(false);
    }, 5000);
  });
}
