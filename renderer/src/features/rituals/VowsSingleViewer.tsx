import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Circle, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { MEGA_PANEL_INSET_CN } from '@/shared/ui/mega-section-layout';
import { cn } from '@/lib/utils';
import type { AuraRow } from '@/types/aura';
import { RAW_BUTTON_FOCUS_CN } from './rituals-utils';

function VowsCreditsModal({ vows, onClose }: { vows: AuraRow[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [done, setDone] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idxRef = useRef(0);
  const doneRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const goNext = useCallback(() => {
    if (doneRef.current) return;
    clearTimer();
    setVisible(false);
    timerRef.current = setTimeout(() => {
      const next = idxRef.current + 1;
      if (next >= vows.length) {
        doneRef.current = true;
        setDone(true);
        setConfirmVisible(true);
      } else {
        idxRef.current = next;
        setIdx(next);
        setVisible(true);
      }
    }, 250);
  }, [vows.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && confirmVisible) onClose();
      if ((e.key === ' ' || e.key === 'ArrowRight') && !doneRef.current) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, confirmVisible]);

  const vow = vows[idx];

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-y-auto bg-black/95 px-4 py-16 backdrop-blur-sm"
      onClick={() => { if (!done) goNext(); }}
    >
      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {vows.map((_, i) => (
          <span
            key={i}
            className={cn(
              'block rounded-full transition-all duration-500',
              i < idx ? 'size-1.5 bg-white/50' :
              i === idx ? 'h-1.5 w-5 bg-white' :
              'size-1.5 bg-white/20'
            )}
          />
        ))}
      </div>

      {/* Vow content */}
      {!done && vow && (
        <div
          className={cn(
            'relative mx-auto max-h-[calc(100svh-9rem)] max-w-xl px-4 text-center sm:px-8',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
          onClick={(e) => e.stopPropagation()}
          style={{ transitionProperty: 'opacity, transform', transitionDuration: '220ms', transitionTimingFunction: 'ease' }}
        >
          <div className="overflow-y-auto [scrollbar-width:thin] max-h-[calc(100svh-9rem)] py-4">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
              {String(vow.title ?? vow.id)}
            </h2>
            {vow.description ? (
              <p className="whitespace-pre-wrap text-base leading-relaxed text-white/70 sm:text-lg sm:leading-[1.85]">
                {String(vow.description)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirm button */}
      {confirmVisible && (
        <div
          className="flex flex-col items-center gap-3 animate-in fade-in duration-700"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-white/40 tracking-widest uppercase">Все обеты прочитаны</p>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
          >
            Принять обеты
          </button>
        </div>
      )}

      {/* Skip hint */}
      {!done && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/25 select-none">
          нажмите, чтобы пропустить · {idx + 1} из {vows.length}
        </p>
      )}
    </div>,
    document.body
  );
}

export function VowsSingleViewer({ vows }: { vows: AuraRow[] }) {
  const [idx, setIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

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
      {isCreditsOpen && vows.length > 0 && (
        <VowsCreditsModal vows={vows} onClose={() => setIsCreditsOpen(false)} />
      )}
      <MegaPanelHeader
        title="Обеты"
        right={
          <div className="flex items-center gap-2">
            {vows.length > 1 && (
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {idx + 1}/{vows.length}
              </span>
            )}
            {vows.length > 0 && (
              <button
                type="button"
                aria-label="Читать как титры"
                title="Читать как титры"
                onClick={() => setIsCreditsOpen(true)}
                className={cn(
                  'flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground aura-tx-colors',
                  RAW_BUTTON_FOCUS_CN
                )}
              >
                <Maximize2 className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
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
              <div className={cn('relative min-h-0 flex-1 overflow-hidden aura-tx-opacity-fast', isTransitioning && 'opacity-60')}>
                {/* Top fade */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[var(--card)] to-transparent" />
                {/* Bottom fade */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-[var(--card)] to-transparent" />
                <div className="min-h-0 h-full overflow-y-auto whitespace-pre-wrap break-words text-sm leading-[1.8] text-foreground/85 [scrollbar-width:thin] sm:text-[15px] sm:leading-[1.95] py-1">
                  {current.description ? String(current.description) : 'Описание не задано.'}
                </div>
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
