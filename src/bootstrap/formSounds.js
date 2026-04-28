export async function setupFormSoundHandlers(audioSystem) {
  const { getSoundByType, SOUND_CATEGORIES, UI_ELEMENT_TYPES, DEFAULT_VOLUME } = await import('../system/audio/soundConfig.js');

  document.addEventListener('change', (e) => {
    if (!audioSystem) return;

    const target = e.target;
    let sound = null;

    if (target.type === 'radio') {
      sound = getSoundByType(SOUND_CATEGORIES.FORM_INPUT, UI_ELEMENT_TYPES.INPUT_RADIO);
      if (sound) {
        audioSystem.play(sound, { volume: DEFAULT_VOLUME / 6 });
      }
    } else if (target.type === 'checkbox') {
      sound = getSoundByType(SOUND_CATEGORIES.FORM_INPUT, UI_ELEMENT_TYPES.INPUT_CHECKBOX);
      if (sound) {
        audioSystem.play(sound, { volume: DEFAULT_VOLUME / 5 });
      }
    }
  }, true);

  document.addEventListener('focus', (e) => {
    if (!audioSystem) return;

    const target = e.target;
    const tagName = target.tagName;
    const inputType = target.type || 'text';

    const excludedTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'hidden', 'range', 'color'];

    let sound = null;

    if (tagName === 'TEXTAREA') {
      sound = getSoundByType(SOUND_CATEGORIES.FORM_INPUT, UI_ELEMENT_TYPES.INPUT_TEXTAREA);
    } else if (tagName === 'INPUT' && !excludedTypes.includes(inputType)) {
      sound = getSoundByType(SOUND_CATEGORIES.FORM_INPUT, UI_ELEMENT_TYPES.INPUT_TEXT);
    }

    if (sound) {
      audioSystem.play(sound);
    }
  }, true);
}
