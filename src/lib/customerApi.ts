import { supabase } from './supabase';
import type { Database } from './database.types';

export type Dog = Database['public']['Tables']['dogs']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

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
