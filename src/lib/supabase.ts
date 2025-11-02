import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Supabase configuration
// Get these from your Supabase project settings (Settings > API)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key is missing. Using localStorage fallback.');
}

// Create Supabase client
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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
  locations: ('malmo' | 'staffanstorp')[];
  type?: 'fulltime' | 'parttime-3' | 'parttime-2' | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BoardingRecord = {
  id: string;
  dog_id: string;
  dog_name: string;
  location: 'malmo' | 'staffanstorp';
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
  location: 'malmo' | 'staffanstorp';
  cages: Array<{
    id: string;
    name: string;
    type: 'cage' | 'free-area';
    dogs?: string[];
  }>;
  created_at?: string;
  updated_at?: string;
};

