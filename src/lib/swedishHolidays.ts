// Swedish public holidays ("röda dagar") + the day-before-holiday rule
// ("helgdagsafton"-flagged half day where dagis closes at 14:00).
//
// Pure date math, no I/O — cached per-year. Holidays whose date floats
// (Easter, Midsummer, All Saints' Day) are computed; the fixed ones are
// listed by month/day.

type HolidayInfo = {
  iso: string;
  name: string;
  /** half-day on the day BEFORE (close 14:00) */
  closesEarlyDayBefore?: boolean;
};

// Anonymous Gregorian Easter (Meeus/Jones/Butcher).
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const isoFor = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const cache = new Map<number, Map<string, HolidayInfo>>();

function buildYear(year: number): Map<string, HolidayInfo> {
  const easter = easterSunday(year);
  const longfredag = addDays(easter, -2);
  const annandagPask = addDays(easter, 1);
  const kristiHimmelsfard = addDays(easter, 39);
  const pingstdagen = addDays(easter, 49);

  // Midsummer's Eve: Friday between 19 June and 25 June.
  let midsommarafton: Date | null = null;
  for (let day = 19; day <= 25; day++) {
    const d = new Date(year, 5, day); // June
    if (d.getDay() === 5) { midsommarafton = d; break; }
  }
  const midsommardagen = midsommarafton ? addDays(midsommarafton, 1) : null;

  // All Saints' Day: Saturday between 31 Oct and 6 Nov.
  let allaHelgon: Date | null = null;
  for (let day = 31; day <= 31 + 6; day++) {
    const d = new Date(year, 9, day); // 9 = October; day rolls into Nov.
    if (d.getDay() === 6) { allaHelgon = d; break; }
  }
  const allaHelgonAfton = allaHelgon ? addDays(allaHelgon, -1) : null;

  const list: HolidayInfo[] = [
    { iso: `${year}-01-01`, name: 'Nyårsdagen' },
    { iso: `${year}-01-06`, name: 'Trettondag jul' },
    { iso: isoFor(longfredag), name: 'Långfredagen' },
    { iso: isoFor(easter), name: 'Påskdagen' },
    { iso: isoFor(annandagPask), name: 'Annandag påsk' },
    { iso: `${year}-05-01`, name: 'Första maj', closesEarlyDayBefore: true },
    { iso: isoFor(kristiHimmelsfard), name: 'Kristi himmelsfärd', closesEarlyDayBefore: true },
    { iso: isoFor(pingstdagen), name: 'Pingstdagen' },
    { iso: `${year}-06-06`, name: 'Sveriges nationaldag', closesEarlyDayBefore: true },
    ...(midsommarafton ? [{ iso: isoFor(midsommarafton), name: 'Midsommarafton' }] : []),
    ...(midsommardagen ? [{ iso: isoFor(midsommardagen), name: 'Midsommardagen' }] : []),
    ...(allaHelgonAfton ? [{ iso: isoFor(allaHelgonAfton), name: 'Allhelgonaafton' }] : []),
    ...(allaHelgon ? [{ iso: isoFor(allaHelgon), name: 'Alla helgons dag' }] : []),
    { iso: `${year}-12-24`, name: 'Julafton' },
    { iso: `${year}-12-25`, name: 'Juldagen' },
    { iso: `${year}-12-26`, name: 'Annandag jul' },
    { iso: `${year}-12-31`, name: 'Nyårsafton' },
  ];

  const map = new Map<string, HolidayInfo>();
  for (const h of list) map.set(h.iso, h);
  return map;
}

function yearMap(year: number): Map<string, HolidayInfo> {
  let m = cache.get(year);
  if (!m) { m = buildYear(year); cache.set(year, m); }
  return m;
}

export type DayHolidayInfo =
  | { kind: 'closed';     name: string }
  | { kind: 'half_day';   beforeName: string }
  | { kind: 'normal' };

// Treats Sat/Sun as 'closed' too — adjust here if you ever open weekends.
export const getHolidayInfo = (iso: string): DayHolidayInfo => {
  const d = new Date(iso + 'T00:00:00');
  const year = d.getFullYear();

  const m = yearMap(year);
  const here = m.get(iso);
  if (here) return { kind: 'closed', name: here.name };

  // Weekends are also closed for hunddagis.
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return { kind: 'closed', name: dow === 0 ? 'Söndag' : 'Lördag' };

  // Day-before-holiday: only mark when the holiday itself flags it AND the
  // day-after is a workday (Mon-Fri). Day-before being already a weekend
  // would never be reached because of the weekend check above.
  const next = addDays(d, 1);
  const nextIso = isoFor(next);
  const nextYearMap = yearMap(next.getFullYear());
  const nextHoliday = nextYearMap.get(nextIso);
  if (nextHoliday?.closesEarlyDayBefore) {
    return { kind: 'half_day', beforeName: nextHoliday.name };
  }

  return { kind: 'normal' };
};

export const holidayName = (iso: string): string | null => {
  const d = new Date(iso + 'T00:00:00');
  return yearMap(d.getFullYear()).get(iso)?.name ?? null;
};
