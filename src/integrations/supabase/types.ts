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
      counters: {
        Row: {
          created_at: string
          id: number
          is_active: boolean | null
          name: string
          officer_id: string | null
          officer_name: string | null
          services: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean | null
          name: string
          officer_id?: string | null
          officer_name?: string | null
          services?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean | null
          name?: string
          officer_id?: string | null
          officer_name?: string | null
          services?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counters_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          sent_at: string | null
          status: string
          token_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sent_at?: string | null
          status?: string
          token_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sent_at?: string | null
          status?: string
          token_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          citizen_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          citizen_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          citizen_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queue_stats: {
        Row: {
          avg_service_time_minutes: number | null
          avg_wait_time_minutes: number | null
          completed_tokens: number | null
          created_at: string
          date: string
          id: string
          peak_queue_size: number | null
          total_tokens: number | null
          updated_at: string
        }
        Insert: {
          avg_service_time_minutes?: number | null
          avg_wait_time_minutes?: number | null
          completed_tokens?: number | null
          created_at?: string
          date?: string
          id?: string
          peak_queue_size?: number | null
          total_tokens?: number | null
          updated_at?: string
        }
        Update: {
          avg_service_time_minutes?: number | null
          avg_wait_time_minutes?: number | null
          completed_tokens?: number | null
          created_at?: string
          date?: string
          id?: string
          peak_queue_size?: number | null
          total_tokens?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          called_at: string | null
          citizen_id: string
          citizen_name: string
          citizen_phone: string
          completed_at: string | null
          counter_id: number | null
          created_at: string
          estimated_time: string | null
          id: string
          notes: string | null
          priority: boolean | null
          qr_code: string | null
          served_at: string | null
          service_type: string
          status: string
          time_slot: string
          token_number: number
          updated_at: string
        }
        Insert: {
          called_at?: string | null
          citizen_id: string
          citizen_name: string
          citizen_phone: string
          completed_at?: string | null
          counter_id?: number | null
          created_at?: string
          estimated_time?: string | null
          id?: string
          notes?: string | null
          priority?: boolean | null
          qr_code?: string | null
          served_at?: string | null
          service_type?: string
          status?: string
          time_slot: string
          token_number: number
          updated_at?: string
        }
        Update: {
          called_at?: string | null
          citizen_id?: string
          citizen_name?: string
          citizen_phone?: string
          completed_at?: string | null
          counter_id?: number | null
          created_at?: string
          estimated_time?: string | null
          id?: string
          notes?: string | null
          priority?: boolean | null
          qr_code?: string | null
          served_at?: string | null
          service_type?: string
          status?: string
          time_slot?: string
          token_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_citizen_id_fkey"
            columns: ["citizen_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_initial_admin: {
        Args: {
          admin_email: string
          admin_name: string
          admin_password: string
          admin_phone: string
        }
        Returns: undefined
      }
      generate_token_number: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      make_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
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
