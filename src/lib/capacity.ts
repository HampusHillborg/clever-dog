import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DayCapacity = {
  date: string;
  booked: number;
  soft_limit: number | null;
  hard_limit: number | null;
};

export type CapacityLevel = 'free' | 'busy' | 'full';

export type CapacityDefault = {
  location: string;
  weekday: number;
  soft_limit: number | null;
  hard_limit: number | null;
  updated_at: string | null;
};

export type CapacityOverride = {
  location: string;
  date: string;
  soft_limit: number | null;
  hard_limit: number | null;
  note: string | null;
  updated_at: string | null;
};

export type LocationSettings = {
  location: string;
  count_boarding_in_dagis: boolean;
  updated_at: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const capacityLevel = (cap: DayCapacity): CapacityLevel => {
  if (cap.hard_limit != null && cap.booked >= cap.hard_limit) return 'full';
  if (cap.soft_limit != null && cap.booked >= cap.soft_limit) return 'busy';
  return 'free';
};

// ---------------------------------------------------------------------------
// Customer-facing: fetch capacity overview for a date range
// ---------------------------------------------------------------------------

export const getDayCapacityOverview = async (
  start: string,
  end: string,
  location = 'staffanstorp',
): Promise<DayCapacity[]> => {
  if (!supabase) return [];
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: DayCapacity[] | null; error: unknown }>)(
    'day_capacity_overview',
    { p_start: start, p_end: end, p_location: location },
  );
  if (error) {
    console.error('getDayCapacityOverview', error);
    return [];
  }
  return data ?? [];
};

// ---------------------------------------------------------------------------
// Admin: defaults (per weekday)
// ---------------------------------------------------------------------------

export const getCapacityDefaults = async (
  location = 'staffanstorp',
): Promise<CapacityDefault[]> => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('day_capacity_defaults')
    .select('*')
    .eq('location', location)
    .order('weekday');
  return (data as CapacityDefault[]) ?? [];
};

export const setCapacityDefault = async (
  location: string,
  weekday: number,
  soft: number | null,
  hard: number | null,
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('day_capacity_defaults').upsert({
    location,
    weekday,
    soft_limit: soft,
    hard_limit: hard,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

// ---------------------------------------------------------------------------
// Admin: overrides (per date)
// ---------------------------------------------------------------------------

export const getCapacityOverrides = async (
  location = 'staffanstorp',
): Promise<CapacityOverride[]> => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('day_capacity_overrides')
    .select('*')
    .eq('location', location)
    .order('date');
  return (data as CapacityOverride[]) ?? [];
};

export const setCapacityOverride = async (
  location: string,
  date: string,
  soft: number | null,
  hard: number | null,
  note: string | null,
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('day_capacity_overrides').upsert({
    location,
    date,
    soft_limit: soft,
    hard_limit: hard,
    note,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const deleteCapacityOverride = async (
  location: string,
  date: string,
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase
    .from('day_capacity_overrides')
    .delete()
    .eq('location', location)
    .eq('date', date);
  if (error) throw error;
};

// ---------------------------------------------------------------------------
// Admin: location settings
// ---------------------------------------------------------------------------

export const getLocationSettings = async (
  location = 'staffanstorp',
): Promise<LocationSettings | null> => {
  if (!supabase) return null;
  const { data } = await supabase
    .from('location_settings')
    .select('*')
    .eq('location', location)
    .maybeSingle();
  return (data as LocationSettings | null) ?? null;
};

export const setLocationSettings = async (
  location: string,
  patch: { count_boarding_in_dagis?: boolean },
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('location_settings').upsert({
    location,
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};
