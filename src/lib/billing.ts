import { supabase } from './supabase';
import { PRICES, VAT_RATE } from './prices';

type DogType = 'fulltime' | 'parttime-3' | 'parttime-2' | null;
type Location = 'malmo' | 'staffanstorp';

export type DogCostLine = {
  dog_id: string;
  dog_name: string;
  dog_type: DogType;
  location: Location;
  monthly_base: number;
  extra_days_count: number;
  extra_days_cost: number;
  boarding_nights: number;
  boarding_cost: number;
  subtotal: number;
};

export type CustomerCost = {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  dogs: DogCostLine[];
  total_inkl_moms: number;
  total_excl_moms: number;
  vat: number;
};

const monthlyBaseFor = (type: DogType, location: Location): number => {
  const prices = PRICES[location];
  if (type === 'fulltime') return prices.fulltime;
  if (type === 'parttime-3') return prices.parttime3;
  if (type === 'parttime-2') return prices.parttime2;
  return 0;
};

const nightsBetween = (start: string, end: string, monthStart: string, monthEnd: string): number => {
  // Clip the booking to the selected month, then count nights.
  const s = start > monthStart ? start : monthStart;
  const e = end < monthEnd ? end : monthEnd;
  if (s > e) return 0;
  const startMs = new Date(s).getTime();
  const endMs = new Date(e).getTime();
  return Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
};

const dateRangeForMonth = (year: number, month: number): { start: string; end: string } => {
  const last = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(last)}`,
  };
};

const pickPrimaryLocation = (locations: unknown): Location => {
  if (Array.isArray(locations)) {
    if (locations.includes('malmo')) return 'malmo';
    if (locations.includes('staffanstorp')) return 'staffanstorp';
  }
  return 'staffanstorp';
};

// Compute every customer's billing breakdown for the given calendar month.
// month is 0-indexed (0 = January).
export const computeBillingForMonth = async (year: number, month: number): Promise<CustomerCost[]> => {
  if (!supabase) return [];
  const { start, end } = dateRangeForMonth(year, month);

  // Get every customer with their dogs, then every confirmed booking in
  // the month for those dogs. Two queries; bookings join-filtered in JS.
  const [customersRes, dogsRes, bookingsRes] = await Promise.all([
    supabase.from('customers').select('id, name, email'),
    supabase.from('customer_dogs')
      .select('customer_id, dog_id, dogs(id, name, type, locations, is_active)'),
    supabase.from('bookings')
      .select('dog_id, booking_type, status, start_date, end_date')
      .in('booking_type', ['extra', 'boarding', 'single_day'])
      .eq('status', 'confirmed')
      .lte('start_date', end)
      .gte('end_date', start),
  ]);

  type CustRow = { id: string; name: string; email: string };
  type DogJoin = { id: string; name: string; type: DogType; locations: unknown; is_active: boolean };
  type CustDogRow = { customer_id: string; dog_id: string; dogs: DogJoin | null };
  type BookingRow = { dog_id: string; booking_type: string; status: string; start_date: string; end_date: string };

  const customers = (customersRes.data ?? []) as CustRow[];
  const dogLinks = (dogsRes.data ?? []) as CustDogRow[];
  const bookings = (bookingsRes.data ?? []) as BookingRow[];

  // Group bookings by dog_id for fast lookup.
  const bookingsByDog = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    if (!bookingsByDog.has(b.dog_id)) bookingsByDog.set(b.dog_id, []);
    bookingsByDog.get(b.dog_id)!.push(b);
  }

  // Group dogs by customer.
  const dogsByCustomer = new Map<string, DogJoin[]>();
  for (const link of dogLinks) {
    if (!link.dogs || link.dogs.is_active === false) continue;
    if (!dogsByCustomer.has(link.customer_id)) dogsByCustomer.set(link.customer_id, []);
    dogsByCustomer.get(link.customer_id)!.push(link.dogs);
  }

  const result: CustomerCost[] = [];

  for (const cust of customers) {
    const dogs = dogsByCustomer.get(cust.id) ?? [];
    if (dogs.length === 0) continue;
    const lines: DogCostLine[] = [];
    for (const dog of dogs) {
      const location = pickPrimaryLocation(dog.locations);
      const monthly_base = monthlyBaseFor(dog.type, location);
      let extra_days_count = 0;
      let boarding_nights = 0;
      const dogBookings = bookingsByDog.get(dog.id) ?? [];
      for (const b of dogBookings) {
        if (b.booking_type === 'extra' || b.booking_type === 'single_day') {
          // Each row spans one date — count distinct days in month.
          extra_days_count += nightsBetween(b.start_date, b.end_date, start, end);
        } else if (b.booking_type === 'boarding') {
          boarding_nights += nightsBetween(b.start_date, b.end_date, start, end);
        }
      }
      const prices = PRICES[location];
      const extra_days_cost = extra_days_count * prices.singleDay;
      const boarding_cost = boarding_nights * prices.boarding;
      lines.push({
        dog_id: dog.id,
        dog_name: dog.name,
        dog_type: dog.type,
        location,
        monthly_base,
        extra_days_count,
        extra_days_cost,
        boarding_nights,
        boarding_cost,
        subtotal: monthly_base + extra_days_cost + boarding_cost,
      });
    }
    const total_inkl_moms = lines.reduce((s, l) => s + l.subtotal, 0);
    const total_excl_moms = total_inkl_moms / (1 + VAT_RATE);
    const vat = total_inkl_moms - total_excl_moms;
    if (total_inkl_moms > 0) {
      result.push({
        customer_id: cust.id,
        customer_name: cust.name,
        customer_email: cust.email,
        dogs: lines,
        total_inkl_moms,
        total_excl_moms,
        vat,
      });
    }
  }

  return result.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
};
