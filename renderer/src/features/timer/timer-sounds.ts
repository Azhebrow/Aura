export type TimerSoundEvent = 'start' | 'resume' | 'pause' | 'finish' | 'cancel' | 'break_alarm' | 'break_finish';

type ToneStep = {
  freq: number;
  at: number;
  length: number;
  gain: number;
};

const SOUND_PRESETS: Record<TimerSoundEvent, { wave: OscillatorType; master: number; steps: ToneStep[] }> = {
  start: {
    wave: 'sine',
    master: 0.075,
    steps: [
      { freq: 392, at: 0, length: 0.16, gain: 0.7 },
      { freq: 523.25, at: 0.11, length: 0.22, gain: 1 },
    ],
  },
  resume: {
    wave: 'sine',
    master: 0.07,
    steps: [
      { freq: 440, at: 0, length: 0.12, gain: 0.65 },
      { freq: 554.37, at: 0.09, length: 0.16, gain: 0.9 },
    ],
  },
  pause: {
    wave: 'sine',
    master: 0.055,
    steps: [
      { freq: 392, at: 0, length: 0.12, gain: 0.75 },
      { freq: 329.63, at: 0.08, length: 0.16, gain: 0.7 },
    ],
  },
  finish: {
    wave: 'triangle',
    master: 0.085,
    steps: [
      { freq: 523.25, at: 0, length: 0.16, gain: 0.65 },
      { freq: 659.25, at: 0.12, length: 0.18, gain: 0.75 },
      { freq: 783.99, at: 0.24, length: 0.34, gain: 1 },
    ],
  },
  cancel: {
    wave: 'sine',
    master: 0.055,
    steps: [
      { freq: 349.23, at: 0, length: 0.12, gain: 0.65 },
      { freq: 293.66, at: 0.09, length: 0.18, gain: 0.75 },
    ],
  },
  break_alarm: {
    wave: 'sine',
    master: 0.078,
    steps: [
      { freq: 659.25, at: 0, length: 0.13, gain: 0.7 },
      { freq: 880, at: 0.13, length: 0.2, gain: 0.9 },
    ],
  },
  break_finish: {
    wave: 'triangle',
    master: 0.08,
    steps: [
      { freq: 587.33, at: 0, length: 0.16, gain: 0.7 },
      { freq: 739.99, at: 0.13, length: 0.18, gain: 0.8 },
      { freq: 987.77, at: 0.26, length: 0.28, gain: 0.95 },
    ],
  },
};

/** Ненавязчивые системные тоны таймера: мягкие атаки, короткие хвосты, без резкого писка. */
export function playTimerTone(event: TimerSoundEvent) {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const preset = SOUND_PRESETS[event];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(preset.master, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(...preset.steps.map((step) => step.at + step.length)) + 0.16);
    master.connect(ctx.destination);

    preset.steps.forEach((step) => {
      const start = now + step.at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = preset.wave;
      osc.frequency.setValueAtTime(step.freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(step.gain, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + step.length);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + step.length + 0.03);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {
        /* ignore close errors */
      });
    }, 900);
  } catch {
    /* ignore audio errors */
  }
}
