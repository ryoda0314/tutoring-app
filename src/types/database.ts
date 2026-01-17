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
      lessons: {
        Row: {
          amount: number
          cancellation_processed_at: string | null
          cancellation_reason: string | null
          cancellation_requested_at: string | null
          created_at: string | null
          date: string
          end_time: string
          homework: string | null
          hours: number
          id: string
          is_makeup: boolean | null
          memo: string | null
          start_time: string
          status: string | null
          student_id: string
          transport_fee: number | null
        }
        Insert: {
          amount: number
          cancellation_processed_at?: string | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          created_at?: string | null
          date: string
          end_time: string
          homework?: string | null
          hours: number
          id?: string
          is_makeup?: boolean | null
          memo?: string | null
          start_time: string
          status?: string | null
          student_id: string
          transport_fee?: number | null
        }
        Update: {
          amount?: number
          cancellation_processed_at?: string | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          created_at?: string | null
          date?: string
          end_time?: string
          homework?: string | null
          hours?: number
          id?: string
          is_makeup?: boolean | null
          memo?: string | null
          start_time?: string
          status?: string | null
          student_id?: string
          transport_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          teacher_id: string
          transportation_fee: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          teacher_id: string
          transportation_fee?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          teacher_id?: string
          transportation_fee?: number | null
        }
        Relationships: []
      }
      makeup_credits: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          origin_lesson_id: string | null
          student_id: string
          total_minutes: number
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          origin_lesson_id?: string | null
          student_id: string
          total_minutes?: number
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          origin_lesson_id?: string | null
          student_id?: string
          total_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "makeup_credits_origin_lesson_id_fkey"
            columns: ["origin_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          message_type: string | null
          related_schedule_request_id: string | null
          sender_type: string
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          related_schedule_request_id?: string | null
          sender_type: string
          student_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          related_schedule_request_id?: string | null
          sender_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_related_schedule_request_id_fkey"
            columns: ["related_schedule_request_id"]
            isOneToOne: false
            referencedRelation: "schedule_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_payments: {
        Row: {
          created_at: string | null
          id: string
          payment_confirmed_at: string | null
          payment_reported_at: string | null
          student_id: string
          total_amount: number
          updated_at: string | null
          year_month: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_reported_at?: string | null
          student_id: string
          total_amount?: number
          updated_at?: string | null
          year_month: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_reported_at?: string | null
          student_id?: string
          total_amount?: number
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: string
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          role: string
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_requests: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          location: string | null
          memo: string | null
          requested_by: string
          start_time: string
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          location?: string | null
          memo?: string | null
          requested_by: string
          start_time: string
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          location?: string | null
          memo?: string | null
          requested_by?: string
          start_time?: string
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_invites: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          invite_code: string
          student_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          invite_code: string
          student_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          invite_code?: string
          student_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_invites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_locations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          student_id: string
          transportation_fee: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          student_id: string
          transportation_fee?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          student_id?: string
          transportation_fee?: number | null
        }
        Relationships: []
      }
      students: {
        Row: {
          contact: string | null
          created_at: string | null
          grade: string
          id: string
          name: string
          note: string | null
          school: string | null
          subjects: string[] | null
          teacher_id: string
          transportation_fee: number | null
        }
        Insert: {
          contact?: string | null
          created_at?: string | null
          grade: string
          id?: string
          name: string
          note?: string | null
          school?: string | null
          subjects?: string[] | null
          teacher_id: string
          transportation_fee?: number | null
        }
        Update: {
          contact?: string | null
          created_at?: string | null
          grade?: string
          id?: string
          name?: string
          note?: string | null
          school?: string | null
          subjects?: string[] | null
          teacher_id?: string
          transportation_fee?: number | null
        }
        Relationships: []
      }
      teacher_settings: {
        Row: {
          created_at: string | null
          id: string
          lesson_duration: number | null
          lesson_price: number | null
          notes: string | null
          teacher_id: string
          transportation_fee: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_duration?: number | null
          lesson_price?: number | null
          notes?: string | null
          teacher_id: string
          transportation_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_duration?: number | null
          lesson_price?: number | null
          notes?: string | null
          teacher_id?: string
          transportation_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_settings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transportation_fees: {
        Row: {
          created_at: string | null
          fee: number | null
          id: string
          location_name: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          fee?: number | null
          id?: string
          location_name: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          fee?: number | null
          id?: string
          location_name?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportation_fees_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_makeup_credits: {
        Row: {
          nearest_expiration: string | null
          student_id: string | null
          total_remaining_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "makeup_credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
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

// ============================================
// Type aliases for backward compatibility
// ============================================

// Entity types (Row types from tables)
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type MakeupCredit = Database['public']['Tables']['makeup_credits']['Row']
export type ScheduleRequest = Database['public']['Tables']['schedule_requests']['Row']
export type MonthlyPayment = Database['public']['Tables']['monthly_payments']['Row']
export type TeacherSettings = Database['public']['Tables']['teacher_settings']['Row']
export type StudentLocation = Database['public']['Tables']['student_locations']['Row']
export type StudentInvite = Database['public']['Tables']['student_invites']['Row']

// Insert/Update types
export type CreateLesson = Database['public']['Tables']['lessons']['Insert']
export type UpdateLesson = Database['public']['Tables']['lessons']['Update']
export type CreateStudent = Database['public']['Tables']['students']['Insert']
export type UpdateStudent = Database['public']['Tables']['students']['Update']
export type CreateScheduleRequest = Database['public']['Tables']['schedule_requests']['Insert']
export type UpdateScheduleRequest = Database['public']['Tables']['schedule_requests']['Update']
export type CreateMessage = Database['public']['Tables']['messages']['Insert']
export type CreateMakeupCredit = Database['public']['Tables']['makeup_credits']['Insert']

// Enum-like types
export type UserRole = 'teacher' | 'parent'
export type LessonStatus = 'planned' | 'done' | 'cancelled'
export type ScheduleRequestStatus = 'requested' | 'reproposed' | 'rejected' | 'confirmed'
export type RequestedBy = 'parent' | 'teacher'
export type MessageType = '日程相談' | '宿題' | '連絡事項' | '欠席連絡'
export type SenderType = 'teacher' | 'parent'
export type PaymentStatus = 'unpaid' | 'reported' | 'confirmed'

// Helper function
export function getPaymentStatus(payment: MonthlyPayment | null): PaymentStatus {
  if (!payment) return 'unpaid'
  if (payment.payment_confirmed_at) return 'confirmed'
  if (payment.payment_reported_at) return 'reported'
  return 'unpaid'
}

// Extended types with joined data
export interface StudentWithDetails extends Student {
  next_lesson?: Lesson | null
  makeup_credits?: MakeupCredit[]
}

export interface ScheduleRequestWithStudent extends ScheduleRequest {
  student: Student
}

export interface LessonWithStudent extends Lesson {
  student: Student
}

export interface MessageWithStudent extends Message {
  student: Student
}

export interface MakeupCreditWithRelations extends MakeupCredit {
  student?: { id: string; name: string; grade: string }
}
