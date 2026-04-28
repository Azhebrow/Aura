import React, { useMemo } from 'react';
import { MobileSectionSwitcher } from './mobile-section-switcher';
import type { MobileSectionSwitcherProps } from './mobile-section-switcher';
import { useRadioGroupSlideAnimation, getSlideAnimationClasses } from '@/shared/hooks/use-radio-group-slide-animation';

/**
 * Обертка для MobileSectionSwitcher с поддержкой анимации слайда при переключении.
 * Применяет анимационные классы к `animatedChild` элементу.
 */
export interface AnimatedMobileSectionSwitcherProps<T extends string>
  extends Omit<MobileSectionSwitcherProps<T>, 'children'> {
  children?: React.ReactNode;
  /**
   * Элемент, к которому применяется анимация слайда.
   * Обычно это контейнер с контентом, который переключается.
   */
  animatedChild?: React.ReactNode | ((animationClass: string) => React.ReactNode);
}

export function AnimatedMobileSectionSwitcher<T extends string>({
  sections,
  value,
  onChange,
  className,
  animatedChild,
  children,
  ...props
}: AnimatedMobileSectionSwitcherProps<T>) {
  // Создаем массив значений для hook
  const sectionValues = useMemo(() => sections.map((s) => s.id), [sections]);
  const slideDirection = useRadioGroupSlideAnimation(value, sectionValues);

  const animationClass = getSlideAnimationClasses(true, slideDirection);

  return (
    <>
      {animatedChild ? (
        typeof animatedChild === 'function' ? (
          animatedChild(animationClass)
        ) : (
          <div className={animationClass}>{animatedChild}</div>
        )
      ) : null}
      <MobileSectionSwitcher
        sections={sections}
        value={value}
        onChange={onChange}
        className={className}
        {...props}
      >
        {children}
      </MobileSectionSwitcher>
    </>
  );
}
