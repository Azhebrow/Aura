// ─── CurrentRankHero ─────────────────────────────────────────────────────────
// Верхний блок страницы рангов: изображение текущего ранга, очки, прогресс до следующего.

import type { CSSProperties } from 'react';
import { Progress } from '@/components/ui/progress';
import { formatRankPoints, rankAuraHsl, rankImageSrc, type RankTier } from '@/shared/config/ranks-model';
import { RankImage } from './RankImage';

type Props = {
  current: RankTier;
  actualCurrent: RankTier;
  next: RankTier | null;
  points: number;
  pct: number;
  needed: number;
  dateString: string;
};

export function CurrentRankHero({ current, actualCurrent, next, points, pct, needed, dateString }: Props) {
  const aura = rankAuraHsl(current.id);
  const heroAuraVars = { ['--rank-aura' as string]: aura } as CSSProperties;
  const hasLocalPointsFallback = typeof window === 'undefined' || !window.PointsService;

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-[var(--aura-border-soft)]/40 bg-transparent px-2.5 py-3 sm:px-4 sm:py-5"
      style={heroAuraVars}
    >
      {/* Фоновое свечение ранга */}
      <div aria-hidden className="ranks-hero-aura-flow pointer-events-none absolute inset-0 hidden sm:block" />

      <div className="relative z-[1] mx-auto flex max-w-3xl flex-col gap-3 xl:max-w-none xl:flex-row xl:items-stretch xl:gap-6">
        {/* Изображение ранга с aura-glow */}
        <div className="relative mx-auto flex aspect-square w-full max-w-[min(126px,34vw)] shrink-0 items-center justify-center sm:max-w-[min(132px,34vw)] xl:mx-0 xl:max-w-[min(220px,28%)]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-[min(64rem,150vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.62] blur-[72px] motion-safe:transition-opacity motion-safe:duration-aura-glide motion-safe:ease-aura"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${aura} calc(var(--ranks-aura-core-mix) * 1.25), transparent) 0%, color-mix(in srgb, ${aura} calc(var(--ranks-aura-mid-mix) * 1.05), transparent) 28%, color-mix(in srgb, ${aura} calc(var(--ranks-aura-mid-mix) * 0.42), transparent) 54%, color-mix(in srgb, ${aura} calc(var(--ranks-aura-mid-mix) * 0.16), transparent) 76%, transparent 100%)`,
            }}
          />
          <RankImage
            src={rankImageSrc(current.imageNumber)}
            alt={current.name}
            className="relative z-[1] max-h-full w-full object-contain drop-shadow-sm"
            loading="eager"
            revealWhenLoaded
          />
        </div>

        {/* Информация о ранге */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-3 sm:gap-4 xl:justify-center">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Текущий ранг</p>
          <h2 className="font-heading text-balance text-lg font-semibold tracking-tight text-foreground sm:text-2xl xl:text-3xl">
            {current.name}
          </h2>

          {/* Подсказка при просмотре достигнутого (не активного) ранга */}
          {current.id !== actualCurrent.id ? (
            <p className="text-muted-foreground text-xs">
              Просмотр достигнутого ранга. Активный сейчас:{' '}
              <span className="font-medium text-foreground">{actualCurrent.name}</span>
            </p>
          ) : null}

          <div className="text-muted-foreground max-h-[min(5rem,16svh)] overflow-y-auto overscroll-y-contain pr-1 text-xs leading-relaxed [scrollbar-width:thin] sm:text-sm sm:max-h-[min(7.5rem,22svh)] xl:max-h-[min(9rem,26svh)]">
            {current.description}
          </div>

          {/* Карточки: накоплено / до следующего */}
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Накоплено очков</p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{formatRankPoints(points)}</p>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">на {dateString}</p>
            </div>
            <div className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5 sm:px-4 sm:py-3">
              {next ? (
                <>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">До «{next.name}»</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                    ещё <span className="text-primary">{formatRankPoints(needed)}</span>
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">порог: {formatRankPoints(next.threshold)}</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Вершина</p>
                  <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">Максимальный ранг</p>
                  <p className="text-muted-foreground mt-1 text-xs">Вы прошли весь путь лестницы.</p>
                </>
              )}
            </div>
          </div>

          {/* Прогресс-бар к следующему рангу */}
          {next ? (
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Прогресс к следующему рангу</span>
                <span className="font-semibold tabular-nums text-foreground">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          ) : null}

          {hasLocalPointsFallback ? (
            <p className="text-muted-foreground text-xs">
              Локальный режим: очки берутся из сохранённых дневных данных без Electron.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
