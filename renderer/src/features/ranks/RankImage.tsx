// ─── RankImage ────────────────────────────────────────────────────────────────
// Изображение ранга с отложенным показом: рендерит placeholder до загрузки,
// кешируя объекты Image в window.__auraRankImageCache для повторного использования.

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  ariaHidden?: boolean;
  /** Показывает изображение только после завершения загрузки (анти-мигание) */
  revealWhenLoaded?: boolean;
};

export function RankImage({ src, alt, className, loading = 'eager', ariaHidden = false, revealWhenLoaded = false }: Props) {
  const [ready, setReady] = useState(!revealWhenLoaded || Boolean(window.__auraRankImageCache?.[src]?.complete));

  useEffect(() => {
    if (!revealWhenLoaded) { setReady(true); return; }
    if (window.__auraRankImageCache?.[src]?.complete) { setReady(true); return; }

    let alive = true;
    const image = new Image();
    image.onload = () => {
      window.__auraRankImageCache = { ...(window.__auraRankImageCache ?? {}), [src]: image };
      if (alive) setReady(true);
    };
    image.onerror = () => { if (alive) setReady(true); };
    image.src = src;
    if (image.complete) {
      window.__auraRankImageCache = { ...(window.__auraRankImageCache ?? {}), [src]: image };
      setReady(true);
    }
    return () => { alive = false; };
  }, [revealWhenLoaded, src]);

  return (
    <>
      {!ready ? <div aria-hidden className={cn('relative z-[1]', className)} /> : null}
      {ready ? (
        <img
          src={src}
          alt={alt}
          aria-hidden={ariaHidden || undefined}
          decoding="sync"
          fetchPriority={loading === 'eager' ? 'high' : 'auto'}
          loading={loading}
          className={cn('relative z-[1]', className)}
        />
      ) : null}
    </>
  );
}
