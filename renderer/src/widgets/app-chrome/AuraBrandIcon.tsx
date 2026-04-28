import { cn } from '@/lib/utils';

type Props = { className?: string };

/** Фирменная иконка AURA (используется в sidebar и startup-screen). */
export function AuraBrandIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('size-4', className)}
    >
      <path
        d="M12 1.75L14.88 9.12L22.25 12L14.88 14.88L12 22.25L9.12 14.88L1.75 12L9.12 9.12L12 1.75Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="1.7" fill="var(--background)" />
    </svg>
  );
}
