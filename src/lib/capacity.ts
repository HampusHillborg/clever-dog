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
  weekday: number;
  soft_limit: number | null;
  hard_limit: number | null;
  updated_at: string | null;
};

export type CapacityOverride = {
  date: string;
  soft_limit: number | null;
  hard_limit: number | null;
  note: string | null;
  updated_at: string | null;
};

export type LocationSettings = {
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
): Promise<DayCapacity[]> => {
  if (!supabase) return [];
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: DayCapacity[] | null; error: unknown }>)(
    'day_capacity_overview',
    { p_start: start, p_end: end },
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

export const getCapacityDefaults = async (): Promise<CapacityDefault[]> => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('day_capacity_defaults')
    .select('*')
    .order('weekday');
  return (data as CapacityDefault[]) ?? [];
};

export const setCapacityDefault = async (
  weekday: number,
  soft: number | null,
  hard: number | null,
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('day_capacity_defaults').upsert({
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

export const getCapacityOverrides = async (): Promise<CapacityOverride[]> => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('day_capacity_overrides')
    .select('*')
    .order('date');
  return (data as CapacityOverride[]) ?? [];
};

export const setCapacityOverride = async (
  date: string,
  soft: number | null,
  hard: number | null,
  note: string | null,
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('day_capacity_overrides').upsert({
    date,
    soft_limit: soft,
    hard_limit: hard,
    note,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const deleteCapacityOverride = async (date: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase
    .from('day_capacity_overrides')
    .delete()
    .eq('date', date);
  if (error) throw error;
};

// ---------------------------------------------------------------------------
// Admin: global settings (was per-location, now single-row)
// ---------------------------------------------------------------------------

export const getLocationSettings = async (): Promise<LocationSettings | null> => {
  if (!supabase) return null;
  const { data } = await supabase
    .from('location_settings')
    .select('*')
    .maybeSingle();
  return (data as LocationSettings | null) ?? null;
};

export const setLocationSettings = async (
  patch: { count_boarding_in_dagis?: boolean },
): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('location_settings').upsert({
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};
