import { supabase } from './supabase';
import type { Database } from './database.types';

export type BookingRow = Database['public']['Tables']['bookings']['Row'];

export type DayStatus =
  | 'scheduled' | 'extra' | 'cancelled' | 'pending' | 'rejected' | 'boarding' | 'none';

export type DayInfo = {
  date: string;
  weekday: number;
  status: DayStatus;
  bookingId?: string;
  bookingType?: string; // 'scheduled' (recurring) | 'extra' | 'cancelled' | 'boarding' | 'single_day'
  notes?: string;
  adminResponse?: string;
  bookingCustomerId?: string; // customer_id on the booking row, for co-owner attribution
  bookingCustomerName?: string; // customers.name join, for co-owner attribution
};

const pad = (n: number) => n.toString().padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const toMonFirst = (jsDay: number) => (jsDay + 6) % 7;

export const getDaysForMonth = async (
  dogId: string,
  year: number,
  month: number,
): Promise<DayInfo[]> => {
  if (!supabase) return [];

  const lastDay = new Date(year, month + 1, 0);
  const start = isoDate(year, month, 1);
  const end = isoDate(year, month, lastDay.getDate());

  const [schedRes, bookingsRes] = await Promise.all([
    supabase.from('recurring_schedule').select('weekday')
      .eq('dog_id', dogId).eq('active', true),
    supabase.from('bookings').select('*, customers(name)')
      .eq('dog_id', dogId).lte('start_date', end).gte('end_date', start),
  ]);

  const recurring = new Set((schedRes.data ?? []).map(r => r.weekday as number));
  const bookings = bookingsRes.data ?? [];

  const days: DayInfo[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = isoDate(year, month, d);
    const weekday = toMonFirst(new Date(year, month, d).getDay());
    // En avslagen ("rejected") bokning får aldrig dölja en aktiv bokning på
    // samma dag (t.ex. avslaget pensionat ovanpå inbokat dagis). Välj därför
    // en icke-avslagen bokning i första hand; faller bara tillbaka på den
    // avslagna om det är det enda som finns den dagen.
    const covering = bookings.filter(b => b.start_date <= dateStr && b.end_date >= dateStr);
    const booking = covering.find(b => b.status !== 'rejected') ?? covering[0];

    let status: DayStatus = 'none';
    let bookingType: string | undefined = undefined;
    if (booking) {
      bookingType = booking.booking_type;
      if (booking.status === 'pending') status = 'pending';
      else if (booking.status === 'rejected') status = 'rejected';
      else if (booking.booking_type === 'boarding') status = 'boarding';
      else if (booking.booking_type === 'cancelled' || booking.status === 'cancelled') status = 'cancelled';
      else if (booking.booking_type === 'extra') status = 'extra';
      else status = 'scheduled';
    } else if (recurring.has(weekday)) {
      status = 'scheduled';
      bookingType = 'scheduled';
    }

    days.push({
      date: dateStr,
      weekday,
      status,
      bookingId: booking?.id,
      bookingType,
      notes: booking?.notes ?? undefined,
      adminResponse: booking?.admin_response ?? undefined,
      bookingCustomerId: booking?.customer_id ?? undefined,
      bookingCustomerName: (booking as (typeof booking & { customers?: { name: string } | null }) | undefined)?.customers?.name ?? undefined,
    });
  }
  return days;
};

// Räkna antal "schemalagda" (inbokade) dagar i ISO-veckan som innehåller
// `dateIso` — oberoende av vilken månad kalendern visar. Detta behövs för
// deltidskvoten: en vecka som spänner över ett månadsskifte fick annars sina
// dagar uppdelade på två månadsvyer, så kvoten kunde överskridas.
export const getScheduledCountInWeek = async (
  dogId: string,
  dateIso: string,
): Promise<number> => {
  if (!supabase) return 0;
  const base = new Date(dateIso + 'T00:00:00');
  const mondayOffset = (base.getDay() + 6) % 7; // 0 = måndag
  const monday = new Date(base);
  monday.setDate(base.getDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mondayIso = toIso(monday);
  const sundayIso = toIso(sunday);

  const [schedRes, bookingsRes] = await Promise.all([
    supabase.from('recurring_schedule').select('weekday').eq('dog_id', dogId).eq('active', true),
    supabase.from('bookings').select('*').eq('dog_id', dogId).lte('start_date', sundayIso).gte('end_date', mondayIso),
  ]);
  const recurring = new Set((schedRes.data ?? []).map(r => r.weekday as number));
  const bookings = (bookingsRes.data ?? []).filter(b => b.status !== 'rejected');

  let count = 0;
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = toIso(cur);
    const weekday = toMonFirst(cur.getDay());
    const booking = bookings.find(b => b.start_date <= dateStr && b.end_date >= dateStr);
    let isScheduled = false;
    if (booking) {
      if (booking.status === 'pending' || booking.status === 'cancelled') isScheduled = false;
      else if (booking.booking_type === 'boarding' || booking.booking_type === 'cancelled' || booking.booking_type === 'extra') isScheduled = false;
      else isScheduled = true;
    } else if (recurring.has(weekday)) {
      isScheduled = true;
    }
    if (isScheduled) count++;
  }
  return count;
};

export const upsertBooking = async (params: {
  id?: string;
  dog_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  booking_type: 'scheduled' | 'extra' | 'cancelled' | 'boarding' | 'single_day';
  status?: 'confirmed' | 'pending' | 'rejected' | 'cancelled';
  notes?: string;
}): Promise<BookingRow> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const status = params.status ??
    (params.booking_type === 'boarding' || params.booking_type === 'single_day' ? 'pending' : 'confirmed');
  const row = { ...params, status };
  if (row.id) {
    const { id, ...rest } = row;
    const { data, error } = await supabase.from('bookings').update(rest).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('bookings').insert(row).select().single();
  if (error) throw error;
  return data;
};

export const deleteBooking = async (id: string) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
};

export const setRecurringSchedule = async (dogId: string, weekdays: number[]) => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  await supabase.from('recurring_schedule').delete().eq('dog_id', dogId);
  if (weekdays.length === 0) return;
  const rows = weekdays.map(w => ({ dog_id: dogId, weekday: w, active: true }));
  const { error } = await supabase.from('recurring_schedule').insert(rows);
  if (error) throw error;
};

export const getRecurringSchedule = async (dogId: string): Promise<number[]> => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('recurring_schedule')
    .select('weekday')
    .eq('dog_id', dogId)
    .eq('active', true);
  return (data ?? []).map(r => r.weekday as number);
};
