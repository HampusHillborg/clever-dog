// Local-date ISO helpers.
//
// `new Date().toISOString().slice(0, 10)` is a footgun: ISO is UTC, so the
// result lags the wall-clock calendar by one day for any timezone east of
// UTC after local midnight. In Sweden (CEST = UTC+2 in summer) the
// rollover happens at 02:00 local. Always go through these helpers when
// you need "today as the user sees their phone clock."

const pad = (n: number): string => n.toString().padStart(2, '0');

export const toLocalIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayLocalIso = (): string => toLocalIsoDate(new Date());
