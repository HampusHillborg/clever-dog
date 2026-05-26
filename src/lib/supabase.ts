import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Supabase configuration
// Get these from your Supabase project settings (Settings > API)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase initialization:', {
  hasUrl: !!SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  urlLength: SUPABASE_URL.length,
  keyLength: SUPABASE_ANON_KEY.length
});

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key is missing. Using localStorage fallback.');
  console.warn('Missing:', {
    url: !SUPABASE_URL,
    key: !SUPABASE_ANON_KEY
  });
}

// Create Supabase client. Uses the default localStorage adapter, which
// works in both the web browser and inside the Capacitor WebView. WebView
// localStorage persists per-app between launches — combined with
// persistSession + autoRefreshToken, this gives us a true "stay logged
// in" experience without needing a separate native keychain integration.
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Default storageKey kept ("sb-<projectRef>-auth-token") so existing
        // logins survive deploys. The remaining flags make the "stay logged
        // in" behaviour explicit instead of relying on Supabase defaults.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

console.log('Supabase client created:', supabase !== null);

// Type definitions matching our database schema
export type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  owner: string;
  phone: string;
  notes?: string | null;
  color: string;
  type?: 'fulltime' | 'parttime-3' | 'parttime-2' | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BoardingRecord = {
  id: string;
  dog_id: string;
  dog_name: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PlanningData = {
  id: string;
  date: string;
  cages: Array<{
    id: string;
    name: string;
    type: 'cage' | 'free-area';
    dogs?: string[];
  }>;
  created_at?: string;
  updated_at?: string;
};

