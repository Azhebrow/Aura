function isMiniAppRuntime() {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) return false;
  return document.documentElement.dataset.auraMiniapp === '1';
}

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function initMiniAppKeyboardOverlay() {
  if (typeof window === 'undefined' || !isMiniAppRuntime()) return;
  const root = document.documentElement;
  const vv = window.visualViewport;
  const KEYBOARD_DELTA_PX = 120;
  let stableHeight = Math.round(vv?.height ?? window.innerHeight);

  const setStableHeight = (height: number) => {
    const next = Math.max(320, Math.round(height));
    stableHeight = next;
    root.style.setProperty('--aura-app-height', `${next}px`);
  };

  const applyViewportState = () => {
    const currentHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
    const keyboardLikelyOpen = stableHeight - currentHeight > KEYBOARD_DELTA_PX;

    if (!keyboardLikelyOpen) {
      setStableHeight(currentHeight);
      root.dataset.auraKeyboardOpen = '0';
      return;
    }

    root.dataset.auraKeyboardOpen = '1';
    root.style.setProperty('--aura-app-height', `${stableHeight}px`);
  };

  const scrollFocusedIntoView = () => {
    const target = document.activeElement;
    if (!isEditableTarget(target)) return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const rect = target.getBoundingClientRect();
    const bottomLimit = viewportHeight - 12;
    if (rect.bottom <= bottomLimit && rect.top >= 0) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  };

  setStableHeight(stableHeight);
  applyViewportState();

  const onResize = () => {
    applyViewportState();
  };

  const onOrientationChange = () => {
    window.setTimeout(() => {
      setStableHeight(Math.round(window.visualViewport?.height ?? window.innerHeight));
      applyViewportState();
    }, 250);
  };

  const onFocusIn = (event: FocusEvent) => {
    if (!isEditableTarget(event.target)) return;
    window.setTimeout(() => {
      applyViewportState();
      scrollFocusedIntoView();
    }, 60);
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onOrientationChange, { passive: true });
  window.addEventListener('focusin', onFocusIn, { passive: true });
  if (vv) {
    vv.addEventListener('resize', onResize, { passive: true });
    vv.addEventListener('scroll', onResize, { passive: true });
  }
}
