export type StartupPhase = 'booting' | 'ready';

export type StartupTaskStatus = 'pending' | 'running' | 'done' | 'error';

export type StartupTask = {
  id: string;
  label: string;
  detail?: string;
  status: StartupTaskStatus;
  error?: string;
};

export type StartupReadiness = {
  cfgReady: boolean;
  actReadyByScreen: Partial<Record<'home' | 'rituals' | 'sidebar' | 'date-strip', boolean>>;
  startupReady: boolean;
  phase: StartupPhase;
  progress: number;
  activeTaskId: string | null;
  activeTaskLabel: string | null;
  tasks: StartupTask[];
};

const INITIAL_STATE: StartupReadiness = {
  cfgReady: false,
  actReadyByScreen: {},
  startupReady: false,
  phase: 'booting',
  progress: 0,
  activeTaskId: null,
  activeTaskLabel: null,
  tasks: [],
};

let state: StartupReadiness = INITIAL_STATE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getStartupReadiness(): StartupReadiness {
  return state;
}

export function subscribeStartupReadiness(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setStartupReadiness(next: Partial<StartupReadiness>) {
  state = {
    ...state,
    ...(typeof next.cfgReady === 'boolean' ? { cfgReady: next.cfgReady } : {}),
    ...(next.actReadyByScreen
      ? {
          actReadyByScreen: {
            ...state.actReadyByScreen,
            ...next.actReadyByScreen,
          },
        }
      : {}),
    ...(typeof next.startupReady === 'boolean' ? { startupReady: next.startupReady } : {}),
    ...(typeof next.phase === 'string' ? { phase: next.phase } : {}),
    ...(typeof next.progress === 'number' ? { progress: next.progress } : {}),
    ...(typeof next.activeTaskId === 'string' || next.activeTaskId === null
      ? { activeTaskId: next.activeTaskId ?? null }
      : {}),
    ...(typeof next.activeTaskLabel === 'string' || next.activeTaskLabel === null
      ? { activeTaskLabel: next.activeTaskLabel ?? null }
      : {}),
    ...(next.tasks
      ? {
          tasks: next.tasks.map((task) => ({ ...task })),
        }
      : {}),
  };
  emit();
}

export function resetStartupReadiness() {
  state = {
    ...INITIAL_STATE,
    actReadyByScreen: {},
    tasks: [],
  };
  emit();
}
