import { useEffect, useRef, useState } from 'react';

export type SlideDirection = 'left' | 'right' | null;

interface UseRadioGroupSlideAnimationOptions {
  duration?: number;
}

/**
 * Hook для отслеживания направления переключения в radio группах, select, или других компонентах.
 * Преобразует строковые value в индексы на основе переданного массива опций.
 */
export function useRadioGroupSlideAnimation<T extends string | number>(
  currentValue: T,
  optionValues: T[],
  options: UseRadioGroupSlideAnimationOptions = {}
) {
  const { duration = 300 } = options;
  const prevIndexRef = useRef(optionValues.indexOf(currentValue));
  const [direction, setDirection] = useState<SlideDirection>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentIndex = optionValues.indexOf(currentValue);

    // Определяем направление переключения
    if (currentIndex > prevIndexRef.current) {
      setDirection('right');
    } else if (currentIndex < prevIndexRef.current) {
      setDirection('left');
    }

    prevIndexRef.current = currentIndex;

    // Очищаем направление после завершения анимации
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDirection(null);
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentValue, optionValues, duration]);

  return direction;
}

/**
 * Возвращает CSS классы для анимации слайда в зависимости от направления.
 * Используется для применения к контенту, который нужно анимировать.
 */
export function getSlideAnimationClasses(
  isActive: boolean,
  direction: SlideDirection
): string {
  if (!direction) return '';

  if (direction === 'right') {
    return isActive ? 'aura-tabs-slide-enter-right' : 'aura-tabs-slide-exit-left';
  }
  if (direction === 'left') {
    return isActive ? 'aura-tabs-slide-enter-left' : 'aura-tabs-slide-exit-right';
  }

  return '';
}
