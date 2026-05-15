export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          additional_info: string | null
          admin_notes: string | null
          allergies: string | null
          created_at: string | null
          days_per_week: string | null
          dog_age: string | null
          dog_breed: string | null
          dog_chip_number: string | null
          dog_gender: string | null
          dog_height: string | null
          dog_name: string
          dog_socialization: string | null
          end_date: string | null
          id: string
          is_neutered: string | null
          location: string
          matched_at: string | null
          matched_by: string | null
          matched_dog_id: string | null
          message: string | null
          owner_address: string | null
          owner_city: string | null
          owner_email: string
          owner_name: string
          owner_personnummer: string | null
          owner_phone: string | null
          owner_postal_code: string | null
          part_time_days: string | null
          problem_behaviors: string | null
          service_type: string
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          admin_notes?: string | null
          allergies?: string | null
          created_at?: string | null
          days_per_week?: string | null
          dog_age?: string | null
          dog_breed?: string | null
          dog_chip_number?: string | null
          dog_gender?: string | null
          dog_height?: string | null
          dog_name: string
          dog_socialization?: string | null
          end_date?: string | null
          id?: string
          is_neutered?: string | null
          location: string
          matched_at?: string | null
          matched_by?: string | null
          matched_dog_id?: string | null
          message?: string | null
          owner_address?: string | null
          owner_city?: string | null
          owner_email: string
          owner_name: string
          owner_personnummer?: string | null
          owner_phone?: string | null
          owner_postal_code?: string | null
          part_time_days?: string | null
          problem_behaviors?: string | null
          service_type: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          admin_notes?: string | null
          allergies?: string | null
          created_at?: string | null
          days_per_week?: string | null
          dog_age?: string | null
          dog_breed?: string | null
          dog_chip_number?: string | null
          dog_gender?: string | null
          dog_height?: string | null
          dog_name?: string
          dog_socialization?: string | null
          end_date?: string | null
          id?: string
          is_neutered?: string | null
          location?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_dog_id?: string | null
          message?: string | null
          owner_address?: string | null
          owner_city?: string | null
          owner_email?: string
          owner_name?: string
          owner_personnummer?: string | null
          owner_phone?: string | null
          owner_postal_code?: string | null
          part_time_days?: string | null
          problem_behaviors?: string | null
          service_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_matched_dog_id_fkey"
            columns: ["matched_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_records: {
        Row: {
          created_at: string | null
          dog_id: string | null
          dog_name: string
          end_date: string
          id: string
          is_archived: boolean | null
          location: string
          notes: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dog_id?: string | null
          dog_name: string
          end_date: string
          id?: string
          is_archived?: boolean | null
          location: string
          notes?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dog_id?: string | null
          dog_name?: string
          end_date?: string
          id?: string
          is_archived?: boolean | null
          location?: string
          notes?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boarding_records_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_response: string | null
          booking_type: string
          created_at: string | null
          customer_id: string | null
          dog_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_response?: string | null
          booking_type: string
          created_at?: string | null
          customer_id?: string | null
          dog_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_response?: string | null
          booking_type?: string
          created_at?: string | null
          customer_id?: string | null
          dog_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      box_settings: {
        Row: {
          created_at: string | null
          id: string
          location: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location: string
          settings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_dogs: {
        Row: {
          created_at: string | null
          customer_id: string
          dog_id: string
          is_primary_owner: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          dog_id: string
          is_primary_owner?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          dog_id?: string
          is_primary_owner?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_dogs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_dogs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accepted_at: string | null
          address: string | null
          auth_user_id: string | null
          city: string | null
          created_at: string | null
          email: string
          id: string
          invite_status: string
          invited_at: string | null
          name: string
          personal_number: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          id?: string
          invite_status?: string
          invited_at?: string | null
          name: string
          personal_number?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invite_status?: string
          invited_at?: string | null
          name?: string
          personal_number?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dog_activities: {
        Row: {
          body: string | null
          created_at: string | null
          dog_id: string
          id: string
          photo_url: string | null
          posted_by: string | null
          posted_by_name: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          dog_id: string
          id?: string
          photo_url?: string | null
          posted_by?: string | null
          posted_by_name?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          dog_id?: string
          id?: string
          photo_url?: string | null
          posted_by?: string | null
          posted_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_activities_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_attendance: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          created_at: string | null
          date: string
          dog_id: string | null
          guest_name: string | null
          guest_owner: string | null
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string | null
          date: string
          dog_id?: string | null
          guest_name?: string | null
          guest_owner?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string | null
          date?: string
          dog_id?: string | null
          guest_name?: string | null
          guest_owner?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_attendance_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dogs: {
        Row: {
          age: string
          birth_date: string | null
          breed: string
          chip_number: string | null
          created_at: string | null
          customer_notes: string | null
          email: string | null
          gender: string | null
          id: string
          insurance_company: string | null
          insurance_number: string | null
          is_active: boolean
          locations: Json
          name: string
          notes: string | null
          owner: string
          owner_address: string | null
          owner_city: string | null
          owner_personal_number: string | null
          phone: string
          photo_url: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          age: string
          birth_date?: string | null
          breed: string
          chip_number?: string | null
          created_at?: string | null
          customer_notes?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          insurance_company?: string | null
          insurance_number?: string | null
          is_active?: boolean
          locations?: Json
          name: string
          notes?: string | null
          owner: string
          owner_address?: string | null
          owner_city?: string | null
          owner_personal_number?: string | null
          phone: string
          photo_url?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: string
          birth_date?: string | null
          breed?: string
          chip_number?: string | null
          created_at?: string | null
          customer_notes?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          insurance_company?: string | null
          insurance_number?: string | null
          is_active?: boolean
          locations?: Json
          name?: string
          notes?: string | null
          owner?: string
          owner_address?: string | null
          owner_city?: string | null
          owner_personal_number?: string | null
          phone?: string
          photo_url?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          email: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          date: string
          dog_name: string | null
          email: string | null
          id: string
          location: string
          name: string
          phone: string | null
          time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          dog_name?: string | null
          email?: string | null
          id?: string
          location: string
          name: string
          phone?: string | null
          time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          dog_name?: string | null
          email?: string | null
          id?: string
          location?: string
          name?: string
          phone?: string | null
          time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          customer_id: string
          dog_id: string | null
          id: string
          is_read: boolean | null
          sender_name: string | null
          sender_role: string
          sender_user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          customer_id: string
          dog_id?: string | null
          id?: string
          is_read?: boolean | null
          sender_name?: string | null
          sender_role: string
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          customer_id?: string
          dog_id?: string | null
          id?: string
          is_read?: boolean | null
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_history: {
        Row: {
          cages: Json
          created_at: string | null
          date: string
          id: string
          location: string
          updated_at: string | null
        }
        Insert: {
          cages?: Json
          created_at?: string | null
          date: string
          id?: string
          location: string
          updated_at?: string | null
        }
        Update: {
          cages?: Json
          created_at?: string | null
          date?: string
          id?: string
          location?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_schedule: {
        Row: {
          active: boolean | null
          created_at: string | null
          dog_id: string
          id: string
          weekday: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dog_id: string
          id?: string
          weekday: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dog_id?: string
          id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedule_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_absences: {
        Row: {
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_absences_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          employee_id: string
          end_time: string
          id: string
          location: string
          notes: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          employee_id: string
          end_time: string
          id?: string
          location: string
          notes?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          employee_id?: string
          end_time?: string
          id?: string
          location?: string
          notes?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_customer_invite: { Args: never; Returns: unknown }
      current_customer_id: { Args: never; Returns: string }
      get_user_role: { Args: { user_id: string }; Returns: string }
      is_admin_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
