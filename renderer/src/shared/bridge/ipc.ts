import type { IpcRenderer } from 'electron';

/** Доступ к IPC только в Electron renderer (Vite помечает `electron` как external). */
export function getIpcRenderer(): IpcRenderer | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as typeof import('electron');
    return electron.ipcRenderer ?? null;
  } catch {
    return null;
  }
}

/** Состояние таймера для main (трей) — тот же контракт, что в legacy `TimerControl.sendTimerState`. */
export type TimerIpcState = {
  isRunning: boolean;
  elapsedTime: number;
  targetDuration: number;
  selectedTask: { id: string; title: string } | null;
  timerType: string;
  startTime: number | null;
};

export function sendTimerStateChanged(state: TimerIpcState): void {
  getIpcRenderer()?.send('timer:state-changed', state);
}

export function sendTimerCompleted(payload: {
  isNaturalCompletion: boolean;
  taskTitle: string | null;
}): void {
  getIpcRenderer()?.send('timer:completed', payload);
}
