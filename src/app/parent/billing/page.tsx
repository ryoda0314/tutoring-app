import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format, addMonths, startOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import {
    getBillingMonthRange,
    calculateBillingInfo,
    type Lesson,
    type OtherChargeItem,
} from '@/lib/billing'
import type { MonthlyPayment } from '@/types/database'
import { BillingClient } from './billing-client'
import {
    Wallet,
    ChevronRight,
    GraduationCap,
} from 'lucide-react'

interface ParentBillingPageProps {
    searchParams: { date?: string }
}

export default async function ParentBillingPage({ searchParams }: ParentBillingPageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get parent's student_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single() as { data: { student_id: string | null } | null }

    if (!profile?.student_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <GraduationCap size={48} className="text-ink-faint mb-4" />
                <h2 className="text-xl font-display text-ink mb-2">生徒情報が登録されていません</h2>
                <p className="text-ink-light">先生に連絡してアカウントの設定を完了してください</p>
            </div>
        )
    }

    // Get student info including teacher_id
    const { data: studentData } = await supabase
        .from('students')
        .select('name, teacher_id')
        .eq('id', profile.student_id)
        .single()

    const student = studentData as { name: string; teacher_id: string } | null

    // Get teacher name
    let teacherName = '先生'
    if (student?.teacher_id) {
        const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', student.teacher_id)
            .single()
        teacherName = (teacherProfile as { name: string } | null)?.name || '先生'
    }

    const studentName = student?.name || '生徒'

    const today = new Date()

    // Determine target month (billing month)
    // Default is next month (prepayment)
    let targetMonth = addMonths(startOfMonth(today), 1)

    if (searchParams.date) {
        const [year, month] = searchParams.date.split('-').map(Number)
        if (!isNaN(year) && !isNaN(month)) {
            targetMonth = new Date(year, month - 1, 1)
        }
    }

    const yearMonth = format(targetMonth, 'yyyy-MM')
    const { start, end } = getBillingMonthRange(targetMonth)

    // Previous month (for adjustments) is the month before target month
    const prevMonth = addMonths(targetMonth, -1)
    const { start: prevStart, end: prevEnd } = getBillingMonthRange(prevMonth)

    // Fetch lessons for target month
    const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', profile.student_id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

    // Fetch lessons for previous month for adjustments
    const { data: prevLessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', profile.student_id)
        .gte('date', prevStart)
        .lte('date', prevEnd)

    const lessons = (lessonsData || []) as Lesson[]
    const prevLessons = (prevLessonsData || []) as Lesson[]

    // Fetch other charges for this month
    const { data: otherChargesData } = await supabase
        .from('billing_other_charges')
        .select('*')
        .eq('student_id', profile.student_id)
        .eq('year_month', yearMonth)

    const otherCharges: OtherChargeItem[] = (otherChargesData || [])
        .map((c: { id: string; description: string; amount: number; charge_date: string }) => ({
            id: c.id,
            description: c.description,
            amount: c.amount,
            chargeDate: c.charge_date,
        }))

    // Calculate billing info
    // For manual date navigation, we still use 'today' as the reference for confirmation status
    const billingInfo = calculateBillingInfo(lessons, targetMonth, today, prevLessons, otherCharges)

    // Get all lessons for next month (including makeup) for display
    const allLessons = lessons

    // Fetch payment status
    const { data: paymentData } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('student_id', profile.student_id)
        .eq('year_month', yearMonth)
        .single()

    const payment = paymentData as MonthlyPayment | null

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">請求情報</h1>

            <BillingClient
                billingInfo={billingInfo}
                allLessons={allLessons}
                payment={payment}
                studentId={profile.student_id}
                yearMonth={yearMonth}
                teacherName={teacherName}
                studentName={studentName}
            />

            {/* Quick Link */}
            <Link href="/parent/lessons">
                <Card padding="md" className="animate-fade-slide-up stagger-2 cursor-pointer hover:border-ink-light transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Wallet size={20} className="text-ink-light" />
                            <span className="text-sm font-medium text-ink">過去のレッスン・請求履歴</span>
                        </div>
                        <ChevronRight size={18} className="text-ink-faint" />
                    </div>
                </Card>
            </Link>
        </div>
    )
}
