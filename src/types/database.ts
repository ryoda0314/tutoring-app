// Database entity types for the tutoring app
// These match the Supabase table structures

export type UserRole = 'teacher' | 'parent'

export interface Profile {
    id: string
    role: UserRole
    name: string
    student_id: string | null
    created_at: string
}

export interface Student {
    id: string
    teacher_id: string
    name: string
    grade: string
    school: string | null
    subjects: string[]
    contact: string | null
    note: string | null
    transportation_fee: number
    created_at: string
}

export type ScheduleRequestStatus = 'requested' | 'reproposed' | 'rejected' | 'confirmed'
export type RequestedBy = 'parent' | 'teacher'

export interface ScheduleRequest {
    id: string
    student_id: string
    requested_by: RequestedBy
    date: string // YYYY-MM-DD
    start_time: string // HH:MM:SS
    end_time: string // HH:MM:SS
    location: string | null
    memo: string | null
    status: ScheduleRequestStatus
    created_at: string
    updated_at: string
}

export type LessonStatus = 'planned' | 'done' | 'cancelled'

export interface Lesson {
    id: string
    student_id: string
    date: string // YYYY-MM-DD
    start_time: string // HH:MM:SS
    end_time: string // HH:MM:SS
    hours: number
    amount: number
    transport_fee: number
    status: LessonStatus
    is_makeup: boolean
    memo: string | null
    homework: string | null
    created_at: string
}

export type MessageType = '日程相談' | '宿題' | '連絡事項' | '欠席連絡'
export type SenderType = 'teacher' | 'parent'

export interface Message {
    id: string
    student_id: string
    sender_type: SenderType
    body: string
    message_type: MessageType
    related_schedule_request_id: string | null
    is_pinned: boolean
    created_at: string
}

export interface MakeupCredit {
    id: string
    student_id: string
    total_minutes: number
    expires_at: string
    origin_lesson_id: string | null
    created_at: string
}

export interface TeacherSettings {
    id: string
    teacher_id: string
    lesson_price: number
    lesson_duration: number
    notes: string | null
    created_at: string
    updated_at: string
}

export interface StudentLocation {
    id: string
    student_id: string
    name: string
    transportation_fee: number
    created_at: string
}

export interface MonthlyPayment {
    id: string
    student_id: string
    year_month: string // 'YYYY-MM' format
    total_amount: number
    payment_reported_at: string | null // When parent reported payment
    payment_confirmed_at: string | null // When teacher confirmed
    created_at: string
    updated_at: string
}

export type PaymentStatus = 'unpaid' | 'reported' | 'confirmed'

export function getPaymentStatus(payment: MonthlyPayment | null): PaymentStatus {
    if (!payment) return 'unpaid'
    if (payment.payment_confirmed_at) return 'confirmed'
    if (payment.payment_reported_at) return 'reported'
    return 'unpaid'
}

// Create/Update types (without auto-generated fields)
export type CreateStudent = Omit<Student, 'id' | 'created_at'>
export type UpdateStudent = Partial<Omit<Student, 'id' | 'teacher_id' | 'created_at'>>

export type CreateScheduleRequest = Omit<ScheduleRequest, 'id' | 'created_at' | 'updated_at' | 'status'>
export type UpdateScheduleRequest = Partial<Omit<ScheduleRequest, 'id' | 'student_id' | 'requested_by' | 'created_at'>>

export type CreateLesson = Omit<Lesson, 'id' | 'created_at'>
export type UpdateLesson = Partial<Omit<Lesson, 'id' | 'student_id' | 'created_at'>>

export type CreateMessage = Omit<Message, 'id' | 'created_at'>

export type CreateMakeupCredit = Omit<MakeupCredit, 'id' | 'created_at'>

// Database type for Supabase client typing
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile
                Insert: Omit<Profile, 'created_at'> & { created_at?: string }
                Update: Partial<Omit<Profile, 'id'>>
            }
            students: {
                Row: Student
                Insert: CreateStudent & { id?: string; created_at?: string }
                Update: UpdateStudent
            }
            schedule_requests: {
                Row: ScheduleRequest
                Insert: CreateScheduleRequest & { id?: string; status?: ScheduleRequestStatus; created_at?: string; updated_at?: string }
                Update: UpdateScheduleRequest
            }
            lessons: {
                Row: Lesson
                Insert: CreateLesson & { id?: string; created_at?: string }
                Update: UpdateLesson
            }
            messages: {
                Row: Message
                Insert: CreateMessage & { id?: string; created_at?: string }
                Update: Partial<Omit<Message, 'id' | 'student_id' | 'sender_type' | 'created_at'>>
            }
            makeup_credits: {
                Row: MakeupCredit
                Insert: CreateMakeupCredit & { id?: string; created_at?: string }
                Update: Partial<Omit<MakeupCredit, 'id' | 'student_id' | 'created_at'>>
            }
        }
    }
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
