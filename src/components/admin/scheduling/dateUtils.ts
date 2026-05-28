// Date helpers for staff scheduling. All "date strings" are YYYY-MM-DD local-date.
// Week starts on Monday (Swedish/ISO convention).

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISODate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date => {
  const next = new Date(d);
  next.setDate(d.getDate() + n);
  return next;
};

// Monday of the week containing d.
export const getWeekStart = (d: Date): Date => {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
};

// ISO week number.
export const getWeekNumber = (d: Date): number => {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
};

// Mon=0..Sun=6 short Swedish label.
const WEEKDAY_SHORT_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'] as const;
const WEEKDAY_LONG_SV = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'] as const;
const MONTH_SHORT_SV = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'] as const;

export const weekdayShort = (idxMon0: number): string => WEEKDAY_SHORT_SV[idxMon0];
export const weekdayLong = (idxMon0: number): string => WEEKDAY_LONG_SV[idxMon0];

// Index where Monday=0.
export const monIndex = (d: Date): number => (d.getDay() + 6) % 7;

export const formatRange = (start: Date, end: Date): string => {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_SHORT_SV[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_SHORT_SV[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT_SV[end.getMonth()]} ${end.getFullYear()}`;
};

export const formatDayHeader = (d: Date): string => `${weekdayShort(monIndex(d))} ${d.getDate()}`;

// Hours between HH:MM strings, handling overnight (end < start).
export const computeHours = (start: string, end: string): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
};

// All dates in [from, to] (inclusive) whose weekday (mon=0..sun=6) is in selected set.
export const expandDateRange = (from: string, to: string, weekdaysMon0: number[]): string[] => {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (end < start) return [];
  const set = new Set(weekdaysMon0);
  const result: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (set.has(monIndex(d))) {
      result.push(toISODate(d));
    }
  }
  return result;
};
