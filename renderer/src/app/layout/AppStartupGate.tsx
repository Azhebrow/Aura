import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AuraBrandIcon } from '@/widgets/app-chrome/AuraBrandIcon';
import { PageWarmer } from './PageWarmer';

const STARTUP_FADE_MS = 420;
const MIN_VISIBLE_MS = 600;

type Star = {
  x: number;
  y: number;
  delay: number;
  dur: number;
  size: number;
  tone: 'primary' | 'muted' | 'accent';
};

const STARS: Star[] = [
  { x: -0.82, y: -0.68, delay: 0,    dur: 2.2, size: 2, tone: 'muted' },
  { x: 0.88,  y: -0.62, delay: 0.15, dur: 2.0, size: 2, tone: 'primary' },
  { x: -0.74, y: 0.7,   delay: 0.28, dur: 2.4, size: 3, tone: 'accent' },
  { x: 0.79,  y: 0.64,  delay: 0.42, dur: 2.1, size: 2, tone: 'muted' },
  { x: -0.62, y: -0.2,  delay: 0.55, dur: 1.9, size: 2, tone: 'primary' },
  { x: 0.6,   y: 0.18,  delay: 0.68, dur: 2.3, size: 2, tone: 'accent' },
  { x: -0.28, y: -0.84, delay: 0.8,  dur: 2.0, size: 2, tone: 'muted' },
  { x: 0.24,  y: 0.86,  delay: 0.92, dur: 2.5, size: 2, tone: 'primary' },
  { x: -0.12, y: -0.58, delay: 1.05, dur: 1.8, size: 2, tone: 'accent' },
  { x: 0.12,  y: 0.6,   delay: 1.18, dur: 2.2, size: 2, tone: 'muted' },
  { x: -0.92, y: 0.02,  delay: 1.3,  dur: 2.4, size: 2, tone: 'primary' },
  { x: 0.94,  y: -0.02, delay: 1.42, dur: 2.1, size: 2, tone: 'accent' },
  { x: -0.46, y: 0.34,  delay: 1.55, dur: 2.0, size: 3, tone: 'primary' },
  { x: 0.44,  y: -0.36, delay: 1.68, dur: 2.3, size: 3, tone: 'muted' },
  { x: -0.35, y: -0.34, delay: 1.8,  dur: 2.2, size: 2, tone: 'accent' },
  { x: 0.38,  y: 0.33,  delay: 1.92, dur: 2.0, size: 2, tone: 'primary' },
  { x: -0.15, y: 0.2,   delay: 2.05, dur: 1.9, size: 2, tone: 'muted' },
  { x: 0.14,  y: -0.21, delay: 2.18, dur: 2.1, size: 2, tone: 'accent' },
];

export function AppStartupGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'show' | 'hide' | 'done'>('show');
  const [progress, setProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ progress: number; label: string }>).detail;
      if (typeof detail?.progress === 'number') {
        setProgress((prev) => Math.max(prev, Math.min(1, detail.progress)));
      }
      if (typeof detail?.label === 'string') {
        setCurrentLabel(detail.label);
      }
    };
    window.addEventListener('aura-startup-progress', onProgress);
    return () => window.removeEventListener('aura-startup-progress', onProgress);
  }, []);

  const handleWarmDone = useCallback(() => {
    const elapsed = Date.now() - mountedAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.setTimeout(() => setPhase('hide'), remaining);
  }, [mountedAt]);

  useEffect(() => {
    if (phase !== 'hide') return;
    const t = window.setTimeout(() => setPhase('done'), STARTUP_FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done') return;
    window.dispatchEvent(new CustomEvent('aura-startup-done'));
  }, [phase]);

  const hidden = phase === 'done';
  const overlayOpacity = phase === 'show' ? 'opacity-100' : phase === 'hide' ? 'opacity-0' : 'opacity-0 pointer-events-none';
  const appOpacity = phase === 'done' ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.998]';

  const starDots = useMemo(() => STARS, []);
  const pct = Math.round(progress * 100);

  return (
    <div className="relative h-full w-full">
      <div className={`h-full w-full transition-[opacity,transform] duration-500 ease-aura ${appOpacity}`}>
        {children}
      </div>

      {phase === 'show' ? <PageWarmer onDone={handleWarmDone} /> : null}

      {!hidden ? (
        <div
          aria-hidden
          className={`absolute inset-0 z-[120] flex items-center justify-center bg-background transition-opacity duration-[420ms] ease-aura ${overlayOpacity}`}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {starDots.map((star, idx) => (
              <span
                key={idx}
                className="aura-startup-star"
                data-tone={star.tone}
                style={
                  {
                    ['--sx' as string]: String(star.x),
                    ['--sy' as string]: String(star.y),
                    ['--star-delay' as string]: `${star.delay}s`,
                    ['--star-dur' as string]: `${star.dur}s`,
                    ['--star-size' as string]: `${star.size}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="aura-startup-core relative z-[1] flex flex-col items-center gap-3">
            <span className="aura-startup-logo-wrap">
              <AuraBrandIcon className="aura-startup-logo text-primary" />
            </span>
            <span className="font-heading text-foreground/90 text-sm tracking-[0.18em]">AURA</span>
          </div>

          <div className="absolute bottom-10 left-0 right-0 z-[1] flex flex-col items-center gap-2 px-8">
            <div className="h-[2px] w-full max-w-xs overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex w-full max-w-xs items-center justify-between font-mono text-[9px] tabular-nums tracking-widest uppercase text-foreground/45">
              <span className="truncate">{currentLabel || 'loading...'}</span>
              <span>{pct}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
