import { LoadingShell } from '@/shared/ui/data-states';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { ActComposer } from './ActComposer';
import { ActItemRow } from './ActItemRow';
import type { ActComposerConfig, ActItem } from './types';

type Props = {
  items: ActItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
  itemClassName?: string;
  composer?: ActComposerConfig;
};

export function ActList({
  items,
  loading,
  emptyTitle = 'Пока нет элементов.',
  emptyHint,
  className,
  itemClassName,
  composer,
}: Props) {
  if (loading) return <LoadingShell />;

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2', className)}>
      {composer ? <ActComposer config={composer} /> : null}
      {items.length === 0 && !composer ? (
        <EmptyState title={emptyTitle} hint={emptyHint} compact />
      ) : null}
      {items.length > 0 ? (
        <ul className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain">
          {items.map((item) => (
            <li key={item.id} className="w-full min-w-0">
              <ActItemRow item={item} className={itemClassName} />
            </li>
          ))}
        </ul>
      ) : composer ? (
        <div className="min-h-0 flex-1" aria-hidden />
      ) : null}
    </div>
  );
}
