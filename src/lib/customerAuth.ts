import { supabase } from './supabase';
import type { Database } from './database.types';

export type Customer = Database['public']['Tables']['customers']['Row'];

export const getCustomerForUser = async (): Promise<Customer | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();
  if (error) {
    console.error('getCustomerForUser', error);
    return null;
  }
  return data;
};

export const isAdminUser = async (): Promise<boolean> => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();
  return !!data;
};

export const signInCustomer = async (email: string, password: string) => {
  if (!supabase) return { ok: false, error: 'Supabase ej konfigurerad' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, userId: data.user?.id };
};

export const signOutCustomer = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};
