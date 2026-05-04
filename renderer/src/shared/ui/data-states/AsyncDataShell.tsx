import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { DataStatus } from '@/shared/types/operations';
import { LoadingShell } from './LoadingShell';
import { EmptyShell }   from './EmptyShell';
import { ErrorShell }   from './ErrorShell';

type Props = {
  status:        DataStatus;
  children:      ReactNode;
  /** Number of skeleton rows during loading. Default: 3 */
  loadingRows?:  number;
  emptyMessage?: string;
  emptyIcon?:    LucideIcon;
  emptyAction?:  ReactNode;
  errorMessage?: string;
  onRetry?:      () => void;
  className?:    string;
};

/**
 * AsyncDataShell — THE single wrapper for any content that has data states.
 *
 * Law 3: "Every data state is rendered."
 * Usage: wrap your content with this and pass the status from useAsyncData.
 *
 * @example
 * const { data, status, reload } = useAsyncData(...);
 * return (
 *   <AsyncDataShell status={status} onRetry={reload} emptyMessage="Нет ритуалов">
 *     {data?.map(r => <RitualItem key={r.id} ritual={r} />)}
 *   </AsyncDataShell>
 * );
 */
export function AsyncDataShell({
  status,
  children,
  loadingRows,
  emptyMessage,
  emptyIcon,
  emptyAction,
  errorMessage,
  onRetry,
  className,
}: Props) {
  if (status === 'loading') {
    return <LoadingShell rows={loadingRows} className={className} />;
  }
  if (status === 'error') {
    return <ErrorShell message={errorMessage} onRetry={onRetry} className={className} />;
  }
  if (status === 'empty') {
    return (
      <EmptyShell
        message={emptyMessage}
        icon={emptyIcon}
        action={emptyAction}
        className={className}
      />
    );
  }
  return <>{children}</>;
}
