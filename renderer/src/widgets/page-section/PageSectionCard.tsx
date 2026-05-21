import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  /** Иконка слева от заголовка (Lucide). */
  leadingIcon?: LucideIcon;
  /** Правая зона шапки: кнопки, сегменты вкладок и т.д. (`CardAction`). */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Доп. классы для `CardContent` (графики, `flex-1`, свои отступы). */
  contentClassName?: string;
  cardClassName?: string;
};

/**
 * Единый каркас секции страницы (видимость из `page_sections_visibility`):
 * `Card size="sm"`, шапка, опционально действие справа, контент с `pt-0` и стабильными отступами.
 */
export function PageSectionCard({
  title,
  description,
  leadingIcon: Leading,
  headerAction,
  children,
  contentClassName,
  cardClassName,
}: Props) {
  return (
    <Card size="sm" className={cn('w-full min-w-0 shadow-sm', cardClassName)}>
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            'text-sm font-semibold leading-snug',
            Leading && 'flex min-w-0 flex-wrap items-center gap-2'
          )}
        >
          {Leading ? <Leading className="text-muted-foreground size-4 shrink-0" aria-hidden /> : null}
          <span className="min-w-0 flex-1">{title}</span>
        </CardTitle>
        {description != null && description !== '' ? (
          <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
        ) : null}
        {headerAction ? <CardAction>{headerAction}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn('flex flex-col gap-3 pt-0', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
