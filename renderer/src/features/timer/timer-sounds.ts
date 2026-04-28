export type TimerSoundEvent = 'start' | 'resume' | 'pause' | 'finish' | 'cancel' | 'break_alarm';

/** Те же тоны, что при завершении сессии в `useTimerSession` — можно вызывать из UI (перерыв и т.д.). */
export function playTimerTone(event: TimerSoundEvent) {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    master.connect(ctx.destination);

    const sequence: number[] =
      event === 'start'
        ? [440]
        : event === 'resume'
          ? [440, 554]
          : event === 'pause'
            ? [320]
            : event === 'break_alarm'
              ? [784, 659, 784, 659, 784]
            : event === 'finish'
              ? [523, 659, 784]
              : [280, 220];

    sequence.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = event === 'finish' || event === 'break_alarm' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.055);
      gain.gain.setValueAtTime(0.001, now + index * 0.055);
      gain.gain.exponentialRampToValueAtTime(1, now + index * 0.055 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.055 + 0.07);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.055);
      osc.stop(now + index * 0.055 + 0.08);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {
        /* ignore close errors */
      });
    }, 400);
  } catch {
    /* ignore audio errors */
  }
}
