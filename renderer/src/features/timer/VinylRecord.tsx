import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  coverImage?: string;
  accent: string;
  isPlaying: boolean;
  size?: number;
  className?: string;
};

export function VinylRecord({ coverImage, accent, isPlaying, size = 220, className }: Props) {
  const discRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const disc = discRef.current;
    if (!disc) return;

    if (!isPlaying) {
      lastTimestampRef.current = null;
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const rpm = 33.33;
    const degPerMs = (rpm * 360) / 60000;

    const tick = (ts: number) => {
      if (lastTimestampRef.current !== null) {
        rotationRef.current += (ts - lastTimestampRef.current) * degPerMs;
        if (disc) disc.style.transform = `rotate(${rotationRef.current}deg)`;
      }
      lastTimestampRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); lastTimestampRef.current = null; };
  }, [isPlaying]);

  const labelRadius = size * 0.21;
  const labelSize = labelRadius * 2;
  const holeSize = size * 0.038;
  const numGrooves = 18;

  return (
    <div
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-700"
        style={{
          opacity: isPlaying ? 1 : 0.3,
          background: `radial-gradient(circle at 38% 32%, color-mix(in oklab, ${accent} 22%, transparent) 0%, transparent 65%)`,
          filter: 'blur(2px)',
        }}
        aria-hidden
      />

      {/* Disc */}
      <div
        ref={discRef}
        className="absolute inset-0 rounded-full"
        style={{ willChange: 'transform' }}
      >
        {/* Base vinyl black */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 38% 30%, #2a2a2a 0%, #111 55%, #0a0a0a 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        />

        {/* Groove rings */}
        {Array.from({ length: numGrooves }).map((_, i) => {
          const pct = 30 + (i / numGrooves) * 18;
          return (
            <div
              key={i}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: `0.5px solid rgba(255,255,255,${0.025 + (i % 3 === 0 ? 0.018 : 0)})`,
                margin: `${pct * size / 200}px`,
              }}
            />
          );
        })}

        {/* Sheen highlight */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'conic-gradient(from 200deg, transparent 0deg, rgba(255,255,255,0.04) 30deg, transparent 90deg, rgba(255,255,255,0.025) 200deg, transparent 280deg)',
          }}
        />

        {/* Center label area */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            width: labelSize,
            height: labelSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {coverImage ? (
            <img
              src={coverImage}
              alt="cover"
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `conic-gradient(from 0deg, ${accent}, color-mix(in oklab, ${accent} 55%, #111), ${accent})`,
              }}
            />
          )}
          {/* Label overlay for texture */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 38% 30%, rgba(255,255,255,0.15) 0%, transparent 55%)',
              mixBlendMode: 'screen',
            }}
          />
        </div>

        {/* Center hole */}
        <div
          className="absolute rounded-full bg-black"
          style={{
            width: holeSize,
            height: holeSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
          }}
        />
      </div>
    </div>
  );
}
