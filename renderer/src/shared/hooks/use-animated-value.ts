// ─── use-animated-value ───────────────────────────────────────────────────────
// Хуки для плавной анимации числовых значений через requestAnimationFrame.
// Используются для прогресс-баров, счётчиков и SVG-диаграмм на главной.

import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Плавно анимирует одиночное числовое значение к `target`.
 * При смене target продолжает анимацию из текущего отображаемого значения.
 */
export function useAnimatedValue(target: number, durationMs = 400): number {
  const [displayed, setDisplayed] = useState(target);

  // Всегда актуальное отображаемое значение — читается в эффекте после commit.
  const displayedRef = useRef(displayed);
  displayedRef.current = displayed;

  const rafRef = useRef<number | null>(null);
  const prevTargetRef = useRef(target);
  // Флаг: target сменился в текущем рендере, эффект должен запустить анимацию.
  const changedRef = useRef(false);

  if (prevTargetRef.current !== target) {
    prevTargetRef.current = target;
    changedRef.current = true;
  }

  useEffect(() => {
    if (!changedRef.current) return;
    changedRef.current = false;

    const from = displayedRef.current;
    if (from === target) return;

    const start = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const v = from + (target - from) * easeOutCubic(t);
      setDisplayed(t >= 1 ? target : v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayed;
}

/**
 * Плавно анимирует массив числовых значений к `targets`.
 * Для стабильной работы передавай мемоизированный массив (useMemo).
 */
export function useAnimatedValues(
  targets: readonly number[],
  durationMs = 400,
): readonly number[] {
  const [displayed, setDisplayed] = useState<readonly number[]>(targets);

  const displayedRef = useRef<readonly number[]>(displayed);
  displayedRef.current = displayed;

  const rafRef = useRef<number | null>(null);

  // Строковый ключ для сравнения массива по значениям, а не по ссылке.
  const targetsKey = targets.join(',');
  const prevKeyRef = useRef(targetsKey);
  const changedRef = useRef(false);

  if (prevKeyRef.current !== targetsKey) {
    prevKeyRef.current = targetsKey;
    changedRef.current = true;
  }

  useEffect(() => {
    if (!changedRef.current) return;
    changedRef.current = false;

    const from = displayedRef.current;
    const start = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const next = targets.map((tgt, i) => {
        const f = from[i] ?? tgt;
        return t >= 1 ? tgt : f + (tgt - f) * eased;
      });
      setDisplayed(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey, durationMs]);

  return displayed;
}
