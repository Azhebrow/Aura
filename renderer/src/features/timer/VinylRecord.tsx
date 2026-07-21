import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  coverImage?: string;
  accent: string;
  isPlaying: boolean;
  size?: number;
  className?: string;
};

export function VinylRecord({ coverImage, accent, size = 220, className }: Props) {
  const visualSize = Math.round(size);

  return (
    <div
      className={cn('relative flex select-none items-center justify-center', className)}
      style={{ width: visualSize, height: visualSize }}
    >
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-soft bg-panel"
        style={{ borderColor: `color-mix(in oklab, ${accent} 14%, var(--aura-border-soft))` }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            aria-hidden
          />
        ) : (
          <Music2 className="size-10 text-dim" aria-hidden />
        )}
      </div>
    </div>
  );
}
