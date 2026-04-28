export function registerRendererReloadHotkeys() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      window.location.reload();
    }

    if (e.key === 'F5') {
      e.preventDefault();
      window.location.reload();
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'r') {
      e.preventDefault();
      window.location.reload();
    }

    if (e.shiftKey && e.altKey && e.key === 'r') {
      e.preventDefault();
      window.location.reload();
    }
  });
}

export function registerAmbientStopOnUnload() {
  window.addEventListener('beforeunload', async () => {
    if (window.pageManager && window.pageManager.timerControl && window.pageManager.timerControl.fullscreen) {
      const fullscreen = window.pageManager.timerControl.fullscreen;
      if (fullscreen && fullscreen.ambientPlayer) {
        try {
          await fullscreen.stopAmbient();
        } catch (e) {
          console.warn('[AURA] Ошибка при остановке музыки при закрытии:', e);
        }
      }
    }
  });

  window.addEventListener('unload', async () => {
    if (window.pageManager && window.pageManager.timerControl && window.pageManager.timerControl.fullscreen) {
      const fullscreen = window.pageManager.timerControl.fullscreen;
      if (fullscreen && fullscreen.ambientPlayer) {
        try {
          if (fullscreen.ambientPlayer.currentAudio) {
            fullscreen.ambientPlayer.currentAudio.pause();
            fullscreen.ambientPlayer.currentAudio.src = '';
          }
          if (fullscreen.ambientPlayer.nextAudio) {
            fullscreen.ambientPlayer.nextAudio.pause();
            fullscreen.ambientPlayer.nextAudio.src = '';
          }
        } catch (e) {
          // ignore
        }
      }
    }
  });
}
