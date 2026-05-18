import { PRICES } from './prices';

export type BookingTypeKind = 'extra' | 'boarding' | 'single_day';

// Dog subscription types stored in the database.
// 'fulltime' / 'parttime-3' / 'parttime-2' — regular daycare subscribers
// 'singleDay'  — no subscription, buys single days
// 'boarding'   — boarding-only (pensionat) customer
// null          — legacy / unknown
export type DogSubscriptionType = 'fulltime' | 'parttime-3' | 'parttime-2' | 'singleDay' | 'boarding' | null;

const loc = PRICES.staffanstorp;

/**
 * Return the exact price in SEK (integer) for a booking request.
 *
 * Mapping:
 *   single_day  → singleDay-price × days   (350 kr/dag)
 *   boarding    → boarding-price × days     (400 kr/natt)
 *   extra       → singleDay-price × days    (same list price — no
 *                 subscription discount on ad-hoc extras)
 *
 * Returns 0 when the combination is unknown so admin can set the
 * price manually in the Ekonomi-tab.
 */
export function calcBookingPrice(
  type: BookingTypeKind,
  days: number,
  _dogType?: DogSubscriptionType | string | null,
): number {
  if (days <= 0) return 0;

  switch (type) {
    case 'single_day':
      return loc.singleDay * days;

    case 'boarding':
      return loc.boarding * days;

    case 'extra':
      // Extra days on a daycare subscription are priced per the singleDay
      // rate — the subscription covers the agreed weekly quota, everything
      // outside that is billed at the regular per-day rate.
      return loc.singleDay * days;

    default:
      return 0;
  }
}
