// ─── RankLadder ───────────────────────────────────────────────────────────────
// Горизонтальная лестница всех рангов с карточками.
// RankRibbonCard — одна клетка: достигнутый ранг можно выбрать, остальные заблокированы.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RANK_TIERS, rankAuraHsl, rankImageSrc, type RankTier } from '@/shared/config/ranks-model';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { RankImage } from './RankImage';

// ─── RankRibbonCard ────────────────────────────────────────────────────────────

type CardProps = {
  tier: RankTier;
  reached: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: (tierId: number) => void;
};

/** Карточка одного ранга в лестнице: заблокирован или кликабелен */
function RankRibbonCard({ tier, reached, isCurrent, isSelected, onSelect }: CardProps) {
  const aura = rankAuraHsl(tier.id);
  const cardStyle: CSSProperties | undefined =
    reached && isCurrent
      ? {
          boxShadow: `0 0 0 1px color-mix(in srgb, ${aura} 28%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${aura} 8%, var(--card))`,
        }
      : undefined;

  // Заблокированный ранг — только иконка замка
  if (!reached) {
    return (
      <div
        className={cn(
          'isolate flex h-full flex-col items-center justify-center rounded-xl border border-[var(--aura-border-soft)]/50 bg-[var(--aura-surface-panel)] p-2 text-center',
          'transition-[box-shadow,background-color] duration-aura-base ease-aura'
        )}
        title={`${tier.name} — ${tier.threshold}+`}
      >
        <Lock className="size-5 text-[var(--aura-text-subtle)]" aria-hidden />
        <span className="mt-1 text-xs text-[var(--aura-text-disabled)] tabular-nums">{tier.threshold}+</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(tier.id)}
      className={cn(
        'isolate relative flex h-full flex-col items-center justify-center rounded-xl border border-[var(--aura-border-soft)] px-2 py-2 text-center gap-2',
        'transition-[box-shadow,background-color] duration-aura-base ease-aura',
        'w-full',
        !isCurrent && 'bg-card/85 opacity-95',
        isSelected && 'ring-primary/35 ring-2'
      )}
      style={cardStyle}
    >
      <div className="flex flex-col items-center">
        <div className="relative size-10 shrink-0 sm:size-12">
          <RankImage
            src={rankImageSrc(tier.imageNumber)}
            alt=""
            ariaHidden
            className="size-full object-contain"
            loading="eager"
          />
        </div>
      </div>
      <span className={cn(
        'line-clamp-2 w-full text-xs font-semibold leading-tight tracking-wide',
        isCurrent ? 'text-foreground' : 'text-foreground/90'
      )}>
        {tier.name}
      </span>
      <span className="absolute bottom-1 right-1.5 text-micro tabular-nums text-muted-foreground/50">
        {tier.threshold}+
      </span>
    </button>
  );
}

// ─── RankLadder ────────────────────────────────────────────────────────────────

type Props = {
  points: number;
  currentId: number;
  selectedId: number;
  onSelect: (tierId: number) => void;
  showHeader?: boolean;
};

/**
 * Сетка всех рангов. Скрывается, если высоты недостаточно (< 260px),
 * чтобы не ломать лейаут при маленьких экранах.
 */
export function RankLadder({ points, currentId, selectedId, onSelect, showHeader = true }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const rootRef  = useRef<HTMLDivElement>(null);
  const [hasRoom, setHasRoom] = useState(true);

  // Отслеживаем высоту контейнера через ResizeObserver
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setHasRoom(el.getBoundingClientRect().height >= 260);
    update();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => { ro?.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const scrollBy = useCallback((dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  }, []);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {hasRoom ? (
        <>
          {showHeader ? (
            <MegaPanelHeader
              title="Все ранги"
              right={
                <div className="flex gap-1 lg:hidden">
                  <Button type="button" variant="outline" size="icon-sm" className="size-8 shrink-0" aria-label="Прокрутить влево" onClick={() => scrollBy(-1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="size-8 shrink-0" aria-label="Прокрутить вправо" onClick={() => scrollBy(1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            />
          ) : null}

          <div
            ref={stripRef}
            className={cn(
              'h-full min-h-0 flex-1 overflow-hidden p-3 sm:p-4',
              'grid gap-2',
              'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
              'auto-rows-fr'
            )}
          >
            {RANK_TIERS.map((tier) => (
              <RankRibbonCard
                key={tier.id}
                tier={tier}
                reached={points >= tier.threshold}
                isCurrent={tier.id === currentId}
                isSelected={tier.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
