import { useSyncExternalStore } from 'react';
import { AuraBrandIcon } from '@/widgets/app-chrome/AuraBrandIcon';
import {
  getStartupReadiness,
  subscribeStartupReadiness,
} from './startup-readiness';

export function LoadingScreen({ staticProgress }: { staticProgress?: number }) {
  const startup = useSyncExternalStore(subscribeStartupReadiness, getStartupReadiness, getStartupReadiness);
  const total = Math.max(1, startup.tasks.length);
  const completed = startup.tasks.filter((task) => task.status === 'done' || task.status === 'error').length;
  const progress = startup.progress > 0 ? startup.progress : (completed / total) * 100;
  const visualProgress = staticProgress ?? (startup.startupReady ? 100 : Math.max(8, Math.min(100, progress)));

  return (
    <div className="flex h-full w-full items-center justify-center bg-background/95">
      <div className="flex w-[224px] flex-col items-center gap-[16px] px-[24px]">
        <AuraBrandIcon className="text-primary h-[48px] w-[48px] opacity-90 transition-opacity duration-700 ease-out" />
        <div
          className="h-[4px] w-full overflow-hidden rounded-full border border-[var(--aura-border-soft)]/45 bg-[var(--aura-surface-control)]"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary transition-transform duration-aura-task-fill ease-aura"
            style={{ transform: `translateX(-${100 - visualProgress}%)` }}
          />
        </div>
      </div>
    </div>
  );
}
