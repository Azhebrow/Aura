import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { MEGA_PANEL_INSET_CN } from '@/shared/ui/mega-section-layout';
import { cn } from '@/lib/utils';
import type { AuraRow } from '@/types/aura';
import { RAW_BUTTON_FOCUS_CN } from './rituals-utils';

export function VowsSingleViewer({ vows }: { vows: AuraRow[] }) {
  const [idx, setIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!vows.length) {
      setIdx(0);
      return;
    }
    setIdx((prev) => (prev >= vows.length ? 0 : prev));
  }, [vows]);

  const current = vows[idx] as AuraRow | undefined;

  const handleVowChange = (newIdx: number) => {
    if (newIdx === idx) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIdx(newIdx);
      setIsTransitioning(false);
    }, 150);
  };

  const handleNextVow = () => {
    if (vows.length <= 1) return;
    const nextIdx = (idx + 1) % vows.length;
    handleVowChange(nextIdx);
  };

  const handlePrevVow = () => {
    if (vows.length <= 1) return;
    const nextIdx = (idx - 1 + vows.length) % vows.length;
    handleVowChange(nextIdx);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MegaPanelHeader
        title="Обеты"
        right={
          vows.length > 1 ? (
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {idx + 1}/{vows.length}
            </span>
          ) : null
        }
      />
      <div className={cn(MEGA_PANEL_INSET_CN, 'min-h-0 flex-1 overflow-hidden pt-2')}>
        {vows.length === 0 || !current ? (
          <p className="text-muted-foreground text-sm">Нет обетов.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              role="button"
              tabIndex={vows.length > 1 ? 0 : -1}
              aria-disabled={vows.length <= 1}
              onClick={vows.length > 1 ? handleNextVow : undefined}
              onKeyDown={(e) => {
                if (vows.length <= 1) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNextVow();
                }
              }}
              className={cn(
                'flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden text-left aura-tx-opacity',
                vows.length > 1 ? 'cursor-pointer active:opacity-85' : 'cursor-default',
                RAW_BUTTON_FOCUS_CN
              )}
            >
              <div className={cn('aura-tx-opacity-fast', isTransitioning && 'opacity-60')}>
                <h3 className="font-heading mb-2 text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
                  {String(current.title ?? current.id)}
                </h3>
              </div>
              <div
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-[1.8] text-foreground/85 aura-tx-opacity-fast [scrollbar-width:thin] sm:text-[15px] sm:leading-[1.95]',
                  isTransitioning && 'opacity-60'
                )}
              >
                {current.description ? String(current.description) : 'Описание не задано.'}
              </div>
            </div>

            {vows.length > 1 ? (
              <div className="mt-3 flex shrink-0 items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  aria-label="Предыдущий обет"
                  onClick={handlePrevVow}
                  className={cn(
                    'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 aura-tx-colors',
                    RAW_BUTTON_FOCUS_CN
                  )}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
                  {vows.map((v, i) => (
                    <button
                      key={String(v.id)}
                      type="button"
                      aria-label={`Перейти к обету ${i + 1}`}
                      className={cn('flex h-7 items-center justify-center px-1 cursor-pointer', RAW_BUTTON_FOCUS_CN)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVowChange(i);
                      }}
                    >
                      <Circle
                        className={cn(
                          'size-2',
                          i === idx ? 'fill-foreground text-foreground' : 'fill-muted-foreground/35 text-muted-foreground/35'
                        )}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Следующий обет"
                  onClick={handleNextVow}
                  className={cn(
                    'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 aura-tx-colors',
                    RAW_BUTTON_FOCUS_CN
                  )}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
