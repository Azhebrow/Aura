import { useEffect, useRef } from 'react';

export type TabSlideDirection = 'left' | 'right' | null;

interface UseTabSlideAnimationOptions {
  duration?: number;
}

/**
 * Hook для отслеживания направления переключения между табами.
 * Возвращает текущее направление (left/right/null), которое можно использовать для применения класса анимации.
 */
export function useTabSlideAnimation(
  currentIndex: number,
  options: UseTabSlideAnimationOptions = {}
) {
  const { duration = 300 } = options;
  const prevIndexRef = useRef(currentIndex);
  const directionRef = useRef<TabSlideDirection>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Определяем направление переключения
    if (currentIndex > prevIndexRef.current) {
      directionRef.current = 'right';
    } else if (currentIndex < prevIndexRef.current) {
      directionRef.current = 'left';
    } else {
      directionRef.current = null;
    }

    prevIndexRef.current = currentIndex;

    // Очищаем направление после завершения анимации
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      directionRef.current = null;
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, duration]);

  return directionRef.current;
}
