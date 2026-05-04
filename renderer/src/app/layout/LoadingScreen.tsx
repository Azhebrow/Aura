import { useSyncExternalStore } from 'react';
import { AuraBrandIcon } from '@/widgets/app-chrome/AuraBrandIcon';
import { Progress } from '@/components/ui/progress';
import {
  getStartupReadiness,
  subscribeStartupReadiness,
} from './startup-readiness';

export function LoadingScreen() {
  const startup = useSyncExternalStore(subscribeStartupReadiness, getStartupReadiness, getStartupReadiness);
  const total = Math.max(1, startup.tasks.length);
  const completed = startup.tasks.filter((task) => task.status === 'done' || task.status === 'error').length;
  const progress = startup.progress > 0 ? startup.progress : (completed / total) * 100;

  return (
    <div className="flex h-full w-full items-center justify-center bg-background/95">
      <div className="flex w-full max-w-[14rem] flex-col items-center gap-4 px-6">
        <AuraBrandIcon className="text-primary size-12 opacity-90 transition-opacity duration-700 ease-out" />
        <div className="w-full overflow-hidden rounded-full">
          <Progress value={progress} className="h-1 w-full" />
        </div>
      </div>
    </div>
  );
}
