import { supabase } from './supabase';

export type AttendanceEntry = {
  id: string | null;          // null until first check-in
  dog_id: string;
  dog_name: string;
  breed: string;
  owner: string;
  source: 'recurring' | 'booking';
  booking_type?: string;       // 'scheduled' | 'extra' | 'boarding' | 'single_day'
  checked_in_at: string | null;
  checked_out_at: string | null;
};

const toMonFirst = (jsDay: number) => (jsDay + 6) % 7;
const todayIso = () => new Date().toISOString().slice(0, 10);

// Returns the set of dogs that are expected today: recurring-schedule dogs
// for today's weekday plus any confirmed bookings spanning today, minus
// dogs that were explicitly cancelled today. Joined with existing
// dog_attendance rows so the caller sees current check-in/out timestamps.
export const getTodaysScheduledDogs = async (): Promise<AttendanceEntry[]> => {
  if (!supabase) return [];
  const date = todayIso();
  const weekday = toMonFirst(new Date().getDay());

  const [recurringRes, bookingsRes, attendanceRes] = await Promise.all([
    supabase
      .from('recurring_schedule')
      .select('dog_id, dogs(name, breed, owner, is_active)')
      .eq('weekday', weekday)
      .eq('active', true),
    supabase
      .from('bookings')
      .select('dog_id, booking_type, status, dogs(name, breed, owner, is_active)')
      .lte('start_date', date)
      .gte('end_date', date),
    supabase.from('dog_attendance').select('*').eq('date', date),
  ]);

  const byDog = new Map<string, AttendanceEntry>();

  type RecurringRow = { dog_id: string; dogs: { name: string; breed: string; owner: string; is_active: boolean } | null };
  for (const r of (recurringRes.data ?? []) as RecurringRow[]) {
    if (!r.dogs || r.dogs.is_active === false) continue;
    byDog.set(r.dog_id, {
      id: null,
      dog_id: r.dog_id,
      dog_name: r.dogs.name,
      breed: r.dogs.breed,
      owner: r.dogs.owner,
      source: 'recurring',
      booking_type: 'scheduled',
      checked_in_at: null,
      checked_out_at: null,
    });
  }

  type BookingRow = {
    dog_id: string;
    booking_type: string;
    status: string;
    dogs: { name: string; breed: string; owner: string; is_active: boolean } | null;
  };
  for (const b of (bookingsRes.data ?? []) as BookingRow[]) {
    if (!b.dogs || b.dogs.is_active === false) continue;
    // A 'cancelled' booking covering today removes the dog from the day.
    if (b.booking_type === 'cancelled' || b.status === 'cancelled') {
      byDog.delete(b.dog_id);
      continue;
    }
    if (b.status !== 'confirmed') continue;
    if (b.booking_type === 'boarding' || b.booking_type === 'single_day' || b.booking_type === 'extra') {
      byDog.set(b.dog_id, {
        id: null,
        dog_id: b.dog_id,
        dog_name: b.dogs.name,
        breed: b.dogs.breed,
        owner: b.dogs.owner,
        source: 'booking',
        booking_type: b.booking_type,
        checked_in_at: null,
        checked_out_at: null,
      });
    }
  }

  type AttendanceRow = {
    id: string;
    dog_id: string;
    checked_in_at: string | null;
    checked_out_at: string | null;
  };
  for (const a of (attendanceRes.data ?? []) as AttendanceRow[]) {
    const entry = byDog.get(a.dog_id);
    if (entry) {
      entry.id = a.id;
      entry.checked_in_at = a.checked_in_at;
      entry.checked_out_at = a.checked_out_at;
    }
  }

  return Array.from(byDog.values()).sort((a, b) => a.dog_name.localeCompare(b.dog_name));
};

export const checkInDog = async (dogId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Ej inloggad');
  const now = new Date().toISOString();
  const { error } = await supabase.from('dog_attendance').upsert(
    {
      dog_id: dogId,
      date: todayIso(),
      checked_in_at: now,
      checked_in_by: session.user.id,
      updated_at: now,
    },
    { onConflict: 'dog_id,date' },
  );
  if (error) throw error;
};

export const checkOutDog = async (dogId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Ej inloggad');
  const now = new Date().toISOString();
  const { error } = await supabase.from('dog_attendance').upsert(
    {
      dog_id: dogId,
      date: todayIso(),
      checked_out_at: now,
      checked_out_by: session.user.id,
      updated_at: now,
    },
    { onConflict: 'dog_id,date' },
  );
  if (error) throw error;
};

// Undo a check-in or check-out (e.g. staff tapped wrong button).
export const undoCheckIn = async (dogId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase
    .from('dog_attendance')
    .update({ checked_in_at: null, checked_in_by: null, updated_at: new Date().toISOString() })
    .eq('dog_id', dogId).eq('date', todayIso());
  if (error) throw error;
};

export const undoCheckOut = async (dogId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase
    .from('dog_attendance')
    .update({ checked_out_at: null, checked_out_by: null, updated_at: new Date().toISOString() })
    .eq('dog_id', dogId).eq('date', todayIso());
  if (error) throw error;
};
