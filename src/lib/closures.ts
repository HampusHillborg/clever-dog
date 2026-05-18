import { supabase } from './supabase';

export type Closure = {
  id: string;
  date: string;
  reason: string;
  created_at: string | null;
};

// Returns a Map<iso-date, reason> for admin closures in [start, end]
// (inclusive). Reads are cached for the lifetime of the page once a range
// is fetched, so the calendar can call this on every month-switch cheaply.
let cache: Map<string, string> | null = null;
let cacheKey = '';

const monthKey = (start: string, end: string) => `${start}_${end}`;

export const getClosures = async (start: string, end: string): Promise<Map<string, string>> => {
  if (!supabase) return new Map();
  const key = monthKey(start, end);
  if (cache && cacheKey === key) return cache;

  const { data, error } = await supabase
    .from('dagis_closures')
    .select('date, reason')
    .gte('date', start)
    .lte('date', end);
  if (error) { console.error('getClosures', error); return new Map(); }
  const map = new Map<string, string>();
  for (const row of (data ?? [])) map.set(row.date, row.reason);
  cache = map;
  cacheKey = key;
  return map;
};

export const invalidateClosures = () => { cache = null; cacheKey = ''; };

export const listClosuresInRange = async (start: string, end: string): Promise<Closure[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dagis_closures')
    .select('id, date, reason, created_at')
    .gte('date', start)
    .lte('date', end)
    .order('date');
  if (error) { console.error('listClosuresInRange', error); return []; }
  return (data ?? []) as Closure[];
};

export const addClosure = async (date: string, reason: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.from('dagis_closures').upsert(
    {
      date,
      reason,
      created_by: session?.user.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'date' },
  );
  if (error) throw error;
  invalidateClosures();
};

export const removeClosure = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('dagis_closures').delete().eq('id', id);
  if (error) throw error;
  invalidateClosures();
};
