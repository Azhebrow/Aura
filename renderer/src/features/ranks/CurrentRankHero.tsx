// ─── CurrentRankHero ─────────────────────────────────────────────────────────
// Верхний блок страницы рангов: изображение текущего ранга, очки, прогресс до следующего.

import type { CSSProperties } from 'react';
import { Caption } from '@/shared/ui/caption';
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
  const progressPct = next ? Math.max(0, Math.min(100, Number(pct) || 0)) : 100;

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-soft/40 bg-transparent px-2.5 py-3 sm:px-4 sm:py-5"
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
            className="aura-operator-visual relative z-[1] max-h-full w-full object-contain drop-shadow-sm"
            loading="eager"
            revealWhenLoaded
          />
        </div>

        {/* Информация о ранге */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-3 sm:gap-4 xl:justify-center">
          <Caption>Ранг</Caption>
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

          <div
            className="aura-operator-panel relative z-20 shrink-0 overflow-hidden rounded-xl border border-soft/70 bg-panel/40"
            style={{ ['--rank-tint' as string]: aura } as CSSProperties}
          >
            <div
              className="aura-data-fill pointer-events-none absolute inset-y-0 left-0 w-full"
              aria-hidden
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, color-mix(in oklab, ${aura} 24%, transparent), color-mix(in oklab, ${aura} 12%, transparent))`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-background/30" aria-hidden />

            <div className="relative z-10 grid min-h-[4.25rem] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 sm:px-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
                    {next ? next.name : 'Верхняя ступень'}
                  </span>
                  <span className="aura-operator-kpi shrink-0 text-xs font-semibold tabular-nums text-dim">
                    {Math.round(progressPct)}%
                  </span>
                </div>
                <p className="mt-1 truncate text-caption font-medium text-dim tabular-nums">
                  {next ? `${formatRankPoints(needed)} до перехода` : 'шкала заполнена'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="aura-operator-kpi text-lg font-semibold tabular-nums leading-none text-foreground sm:text-xl">
                  {formatRankPoints(points)}
                </p>
                <p className="mt-1 text-nano font-medium leading-none text-faint">очков</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
