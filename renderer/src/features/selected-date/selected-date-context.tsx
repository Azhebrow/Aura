import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'aura_renderer_selected_date';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function dateToYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 0, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

type SelectedDateContextValue = {
  dateString: string;
  setDateString: (ymd: string) => void;
  addDays: (delta: number) => void;
  /** Сегодня по локальному календарю (YYYY-MM-DD) */
  todayString: string;
  canGoNext: boolean;
};

const SelectedDateContext = createContext<SelectedDateContextValue | null>(null);

function readInitialDate(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  } catch {
    /* ignore */
  }
  return dateToYmd(new Date());
}

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [dateString, setDateStringState] = useState(readInitialDate);

  const setDateString = useCallback((ymd: string) => {
    const d = parseYmd(ymd);
    if (!d) return;
    const today = parseYmd(dateToYmd(new Date()))!;
    if (d.getTime() > today.getTime()) return;
    setDateStringState(ymd);
    try {
      localStorage.setItem(STORAGE_KEY, ymd);
    } catch {
      /* ignore */
    }
  }, []);

  const addDays = useCallback(
    (delta: number) => {
      const d = parseYmd(dateString);
      if (!d) return;
      d.setDate(d.getDate() + delta);
      setDateString(dateToYmd(d));
    },
    [dateString, setDateString]
  );

  const value = useMemo(() => {
    const todayString = dateToYmd(new Date());
    const d = parseYmd(dateString);
    const t = parseYmd(todayString);
    const canGoNext = Boolean(d && t && d.getTime() < t.getTime());
    return {
      dateString,
      setDateString,
      addDays,
      todayString,
      canGoNext,
    };
  }, [addDays, dateString, setDateString]);

  return (
    <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>
  );
}

export function useSelectedDate(): SelectedDateContextValue {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) {
    throw new Error('useSelectedDate must be used within SelectedDateProvider');
  }
  return ctx;
}
