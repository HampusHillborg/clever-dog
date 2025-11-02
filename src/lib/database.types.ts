// Type definitions for Supabase database
// This is a placeholder - Supabase can generate these automatically
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Database = {
  public: {
    Tables: {
      dogs: {
        Row: {
          id: string;
          name: string;
          breed: string;
          age: string;
          owner: string;
          phone: string;
          notes: string | null;
          color: string;
          locations: string[];
          type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          breed: string;
          age: string;
          owner: string;
          phone: string;
          notes?: string | null;
          color: string;
          locations?: string[];
          type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          breed?: string;
          age?: string;
          owner?: string;
          phone?: string;
          notes?: string | null;
          color?: string;
          locations?: string[];
          type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      boarding_records: {
        Row: {
          id: string;
          dog_id: string;
          dog_name: string;
          location: string;
          start_date: string;
          end_date: string;
          notes: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dog_id: string;
          dog_name: string;
          location: string;
          start_date: string;
          end_date: string;
          notes?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dog_id?: string;
          dog_name?: string;
          location?: string;
          start_date?: string;
          end_date?: string;
          notes?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      planning_history: {
        Row: {
          id: string;
          date: string;
          location: string;
          cages: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          location: string;
          cages?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          location?: string;
          cages?: unknown;
          created_at?: string;
          updated_at?: string;
        };
      };
      box_settings: {
        Row: {
          id: string;
          location: string;
          settings: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          location: string;
          settings?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          location?: string;
          settings?: unknown;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

