function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function dateToYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 0, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

export function addDaysToYmd(ymd: string, delta: number): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + delta);
  return dateToYmd(d);
}

export function computeWindowStart(selectionYmd: string, count: number, todayYmd: string): string {
  const sel = parseYmd(selectionYmd);
  const todayD = parseYmd(todayYmd);
  if (!sel || !todayD) return selectionYmd;
  const n = Math.max(1, count);
  const start = new Date(sel);
  start.setDate(start.getDate() - Math.floor(n / 2));
  const end = new Date(start);
  end.setDate(end.getDate() + n - 1);
  if (end.getTime() > todayD.getTime()) {
    const endClamped = new Date(todayD);
    const startClamped = new Date(endClamped);
    startClamped.setDate(startClamped.getDate() - (n - 1));
    return dateToYmd(startClamped);
  }
  return dateToYmd(start);
}

export function clampWindowStartOnly(startYmd: string, count: number, todayYmd: string): string {
  const start = parseYmd(startYmd);
  const todayD = parseYmd(todayYmd);
  if (!start || !todayD) return startYmd;
  const n = Math.max(1, count);
  const last = new Date(start);
  last.setDate(last.getDate() + n - 1);
  if (last.getTime() > todayD.getTime()) {
    const endClamped = new Date(todayD);
    const startClamped = new Date(endClamped);
    startClamped.setDate(startClamped.getDate() - (n - 1));
    return dateToYmd(startClamped);
  }
  return startYmd;
}

export function dateWindowCells(windowStart: string, count: number): string[] {
  const cells: string[] = [];
  let cur = windowStart;
  for (let i = 0; i < count; i++) {
    cells.push(cur);
    cur = addDaysToYmd(cur, 1);
  }
  return cells;
}

export function monthCells(
  year: number,
  monthIndex: number,
  options: { fixedSixWeeks?: boolean } = {}
): { d: Date; inMonth: boolean }[] {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const total = options.fixedSixWeeks ? 42 : Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells: { d: Date; inMonth: boolean }[] = [];
  const cur = new Date(start);
  for (let i = 0; i < total; i++) {
    cells.push({ d: new Date(cur), inMonth: cur.getMonth() === monthIndex });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}
