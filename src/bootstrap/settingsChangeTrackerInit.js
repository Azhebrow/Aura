export async function initSettingsChangeTracker() {
  try {
    const { settingsChangeTracker } = await import('../system/services/index.js');
    window.settingsChangeTracker = settingsChangeTracker;
    console.log('[AURA] SettingsChangeTracker инициализирован');
  } catch (e) {
    console.warn('[AURA] Ошибка инициализации SettingsChangeTracker:', e);
  }
}
