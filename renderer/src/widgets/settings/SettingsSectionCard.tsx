import type { ComponentProps, ReactNode } from 'react';
import { PageSectionCard } from '@/widgets/page-section/PageSectionCard';
import { cn } from '@/lib/utils';

type PageProps = ComponentProps<typeof PageSectionCard>;

export type SettingsSectionCardProps = Omit<PageProps, 'contentClassName'> & {
  contentClassName?: string;
  /** Подсказка под карточкой (мелкий текст). */
  footnote?: ReactNode;
};

/**
 * Единый визуальный каркас блоков настроек: как `PageSectionCard`, плотнее по умолчанию,
 * лёгкий hover-elevate для «живой» панели.
 */
export function SettingsSectionCard({
  footnote,
  contentClassName,
  cardClassName,
  ...props
}: SettingsSectionCardProps) {
  return (
    <div className="space-y-1">
      <PageSectionCard
        cardClassName={cn(
          'border-border/70 shadow-none transition-colors duration-aura-base ease-aura motion-reduce:transition-none',
          cardClassName
        )}
        contentClassName={cn('gap-2.5', contentClassName)}
        {...props}
      />
      {footnote ? (
        <p className="text-muted-foreground px-1 text-xs leading-relaxed">{footnote}</p>
      ) : null}
    </div>
  );
}
