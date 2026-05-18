import { supabase } from './supabase';
import type { Database } from './database.types';

export type Dog = Database['public']['Tables']['dogs']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type DogActivity = Database['public']['Tables']['dog_activities']['Row'];
export type DailyReport = Database['public']['Tables']['dog_daily_reports']['Row'];

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const getMyDogs = async (): Promise<Dog[]> => {
  if (!supabase) return [];
  const { data: links, error: linkErr } = await supabase
    .from('customer_dogs')
    .select('dog_id');
  if (linkErr) { console.error('getMyDogs links', linkErr); return []; }
  if (!links || links.length === 0) return [];
  const dogIds = links.map(l => l.dog_id);
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .in('id', dogIds)
    .eq('is_active', true);
  if (error) { console.error('getMyDogs dogs', error); return []; }
  return data ?? [];
};

export const getMyDog = async (dogId: string): Promise<Dog | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('dogs').select('*').eq('id', dogId).maybeSingle();
  if (error) { console.error('getMyDog', error); return null; }
  return data;
};

export const updateMyDog = async (
  dogId: string,
  changes: Database['public']['Tables']['dogs']['Update']
): Promise<Dog> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data, error } = await supabase.from('dogs').update(changes).eq('id', dogId).select().single();
  if (error) throw error;
  return data;
};

export const uploadDogPhoto = async (dogId: string, file: File): Promise<string> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  if (file.size > MAX_PHOTO_SIZE) throw new Error('Max filstorlek 5 MB');
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw new Error('Endast JPG, PNG eller WEBP');

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${dogId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('dog-photos').upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('dog-photos').getPublicUrl(path);
  const url = pub.publicUrl;
  await supabase.from('dogs').update({ photo_url: url }).eq('id', dogId);
  return url;
};

export const getMyMessages = async (dogId?: string): Promise<Message[]> => {
  if (!supabase) return [];
  // Show messages for this dog AND any general messages (dog_id IS NULL),
  // since admin currently sends without a dog_id from the per-customer view.
  let query = supabase.from('messages').select('*').order('created_at');
  if (dogId) query = query.or(`dog_id.eq.${dogId},dog_id.is.null`);
  const { data, error } = await query;
  if (error) { console.error('getMyMessages', error); return []; }
  return data ?? [];
};

export const sendMessage = async (params: { dog_id?: string | null; body: string }): Promise<Message> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Ej inloggad');
  const { data: cust } = await supabase
    .from('customers').select('id').eq('auth_user_id', session.user.id).maybeSingle();
  if (!cust) throw new Error('Ingen kund-koppling');
  const { data, error } = await supabase.from('messages').insert({
    customer_id: cust.id,
    dog_id: params.dog_id ?? null,
    sender_role: 'customer',
    sender_user_id: session.user.id,
    body: params.body,
  }).select().single();
  if (error) throw error;
  return data;
};

export const markMessagesRead = async (ids: string[]) => {
  if (!supabase || ids.length === 0) return;
  await supabase.from('messages').update({ is_read: true }).in('id', ids);
};

// Activity / "album" feed — staff posts photos + captions, customers read.
export const getDogActivities = async (dogId: string, limit = 60): Promise<DogActivity[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dog_activities')
    .select('*')
    .eq('dog_id', dogId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getDogActivities', error); return []; }
  return data ?? [];
};

export const postDogActivity = async (params: {
  dog_id: string;
  file?: File | null;
  body?: string | null;
}): Promise<DogActivity> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const body = (params.body ?? '').trim() || null;
  let photo_url: string | null = null;

  if (params.file) {
    if (params.file.size > MAX_PHOTO_SIZE) throw new Error('Max filstorlek 5 MB');
    if (!ALLOWED_PHOTO_TYPES.includes(params.file.type)) throw new Error('Endast JPG, PNG eller WEBP');
    const ext = (params.file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const path = `${params.dog_id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('dog-activities').upload(path, params.file, { upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('dog-activities').getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  if (!photo_url && !body) throw new Error('Foto eller text krävs');

  // Capture poster name from the employees table at insert time so
  // customers see "Hampus / Anna" without needing direct DB access.
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;
  let posted_by_name: string | null = null;
  if (userId) {
    const { data: emp } = await supabase
      .from('employees').select('name').eq('id', userId).maybeSingle();
    posted_by_name = emp?.name ?? null;
  }

  const { data, error } = await supabase.from('dog_activities').insert({
    dog_id: params.dog_id,
    photo_url,
    body,
    posted_by: userId ?? null,
    posted_by_name,
  }).select().single();
  if (error) throw error;
  return data;
};

export const deleteDogActivity = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { error } = await supabase.from('dog_activities').delete().eq('id', id);
  if (error) throw error;
};

// Daily report card — one row per (dog, date). All fields optional;
// customer only sees the report when at least one field is filled in.
const todayIso = () => new Date().toISOString().slice(0, 10);

export const getDailyReport = async (dogId: string, date?: string): Promise<DailyReport | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dog_daily_reports')
    .select('*')
    .eq('dog_id', dogId)
    .eq('date', date ?? todayIso())
    .maybeSingle();
  if (error) { console.error('getDailyReport', error); return null; }
  return data;
};

export const getRecentDailyReports = async (dogId: string, limit = 14): Promise<DailyReport[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dog_daily_reports')
    .select('*')
    .eq('dog_id', dogId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) { console.error('getRecentDailyReports', error); return []; }
  return (data ?? []).filter(reportHasContent);
};

// A report counts as "real" only when staff has filled in something.
// Mood is the closest to a primary field; if all four data fields and
// note are null/empty, treat it as not-yet-reported.
export const reportHasContent = (r: DailyReport | null | undefined): boolean => {
  if (!r) return false;
  return Boolean(
    r.mood ||
    r.food_eaten ||
    r.activity_level ||
    r.pooped !== null ||
    (r.note && r.note.trim().length > 0)
  );
};

export type DailyReportPatch = {
  mood?: 'happy' | 'neutral' | 'rough' | null;
  food_eaten?: 'all' | 'some' | 'none' | null;
  activity_level?: 'low' | 'normal' | 'high' | null;
  pooped?: boolean | null;
  note?: string | null;
};

export const upsertDailyReport = async (dogId: string, patch: DailyReportPatch): Promise<DailyReport> => {
  if (!supabase) throw new Error('Supabase ej konfigurerad');
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;

  // Capture staff name once, only when there isn't one already on the row.
  let posted_by_name: string | null = null;
  if (userId) {
    const { data: emp } = await supabase
      .from('employees').select('name').eq('id', userId).maybeSingle();
    posted_by_name = emp?.name ?? null;
  }

  const { data, error } = await supabase
    .from('dog_daily_reports')
    .upsert(
      {
        dog_id: dogId,
        date: todayIso(),
        ...patch,
        posted_by: userId ?? null,
        posted_by_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'dog_id,date' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
};
