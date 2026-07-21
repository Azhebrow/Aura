import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { MEGA_PANEL_INSET_CN } from '@/shared/ui/mega-section-layout';
import { cn } from '@/lib/utils';
import type { AuraRow } from '@/types/aura';
import { RAW_BUTTON_FOCUS_CN } from './rituals-utils';

function VowsReaderOverlay({ vows, initialIdx, onClose }: { vows: AuraRow[]; initialIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(Math.min(Math.max(initialIdx, 0), Math.max(vows.length - 1, 0)));
  }, [initialIdx, vows.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setIdx((prev) => Math.min(prev + 1, vows.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIdx((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && idx >= vows.length - 1) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, onClose, vows.length]);

  const vow = vows[idx];
  const isFirst = idx <= 0;
  const isLast = idx >= vows.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background/98 text-foreground backdrop-blur-md animate-in slide-in-from-top-4 duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Обеты"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className={cn('flex size-9 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-foreground aura-tx-colors', RAW_BUTTON_FOCUS_CN)}
          aria-label="Закрыть"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-5">
          {vows.map((v, i) => (
            <button
              key={String(v.id)}
              type="button"
              onClick={() => setIdx(i)}
              className={cn('h-4 min-w-0 flex-1 max-w-14 rounded-full py-[5px]', RAW_BUTTON_FOCUS_CN)}
              aria-label={`Перейти к обету ${i + 1}`}
              aria-current={i === idx}
            >
              <span className={cn('block h-1 rounded-full bg-border aura-tx-colors', i <= idx && 'bg-foreground')} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn('flex size-9 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-foreground aura-tx-colors', RAW_BUTTON_FOCUS_CN)}
          aria-label="Готово"
        >
          <Check className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid min-h-0 place-items-center px-5 py-6">
        {vow ? (
          <article key={String(vow.id)} className="mx-auto flex max-h-full w-full max-w-2xl animate-in slide-in-from-bottom-2 duration-300 flex-col items-center overflow-hidden text-center">
            <h2 className="font-heading max-w-full text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {String(vow.title ?? vow.id)}
            </h2>
            {vow.description ? (
              <p className="mt-5 max-h-[min(48svh,28rem)] overflow-y-auto whitespace-pre-wrap text-balance break-words text-base leading-[1.85] text-dim [scrollbar-width:thin] sm:text-lg sm:leading-[1.95]">
                {String(vow.description)}
              </p>
            ) : null}
          </article>
        ) : null}
      </div>

      <div className="flex h-20 shrink-0 items-center justify-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setIdx((prev) => Math.max(prev - 1, 0))}
          disabled={isFirst}
          className={cn(
            'flex size-10 items-center justify-center rounded-md text-dim aura-tx-colors hover:bg-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-25',
            RAW_BUTTON_FOCUS_CN
          )}
          aria-label="Предыдущий обет"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={isLast ? onClose : () => setIdx((prev) => Math.min(prev + 1, vows.length - 1))}
          className={cn(
            'h-10 min-w-28 rounded-md bg-foreground px-5 text-sm font-semibold text-background aura-tx-interactive hover:opacity-90',
            RAW_BUTTON_FOCUS_CN
          )}
        >
          {isLast ? 'Готово' : 'Дальше'}
        </button>
        <button
          type="button"
          onClick={() => setIdx((prev) => Math.min(prev + 1, vows.length - 1))}
          disabled={isLast}
          className={cn(
            'flex size-10 items-center justify-center rounded-md text-dim aura-tx-colors hover:bg-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-25',
            RAW_BUTTON_FOCUS_CN
          )}
          aria-label="Следующий обет"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>,
    document.body
  );
}

export function VowsSingleViewer({ vows }: { vows: AuraRow[] }) {
  const [idx, setIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

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
    <div className="aura-col">
      {isReaderOpen && vows.length > 0 && (
        <VowsReaderOverlay vows={vows} initialIdx={idx} onClose={() => setIsReaderOpen(false)} />
      )}
      <MegaPanelHeader
        title="Обеты"
        right={
          <div className="flex items-center gap-2">
            {vows.length > 0 && (
              <button
                type="button"
                aria-label="Открыть режим чтения"
                title="Открыть режим чтения"
                onClick={() => setIsReaderOpen(true)}
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
                'flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden rounded-lg bg-transparent px-3 py-3 text-left aura-tx-opacity',
                vows.length > 1 ? 'cursor-pointer active:opacity-85' : 'cursor-default',
                RAW_BUTTON_FOCUS_CN
              )}
            >
              <div className={cn('aura-tx-opacity-fast', isTransitioning && 'opacity-60')}>
                <h3 className="font-heading mb-2 text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
                  {String(current.title ?? current.id)}
                </h3>
              </div>
              <div className={cn('relative min-h-0 flex-1 overflow-hidden aura-tx-opacity-fast', isTransitioning && 'opacity-60')}>
                <div className="min-h-0 h-full overflow-y-auto whitespace-pre-wrap break-words text-sm leading-[1.75] text-dim [scrollbar-width:thin] sm:text-[15px] sm:leading-[1.9]">
                  {current.description ? String(current.description) : 'Описание не задано.'}
                </div>
              </div>
            </div>

            {vows.length > 1 ? (
              <div className="mt-2 flex shrink-0 items-center justify-center gap-1.5">
                <button
                  type="button"
                  aria-label="Предыдущий обет"
                  onClick={handlePrevVow}
                  className={cn(
                    'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover aura-tx-colors',
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
                      className={cn('flex h-7 flex-1 max-w-10 items-center justify-center px-1 cursor-pointer', RAW_BUTTON_FOCUS_CN)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVowChange(i);
                      }}
                    >
                      <span className={cn('block h-1 w-full rounded-full bg-border aura-tx-colors', i === idx && 'bg-foreground')} aria-hidden />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Следующий обет"
                  onClick={handleNextVow}
                  className={cn(
                    'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover aura-tx-colors',
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
