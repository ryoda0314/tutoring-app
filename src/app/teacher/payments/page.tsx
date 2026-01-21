import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PaymentsClient } from './payments-client'
import { format, addMonths, startOfMonth } from 'date-fns'
import { getBillingMonthRange, calculateBillingInfo, getPaymentDueDate } from '@/lib/billing'
import type { Lesson, BillingInfo } from '@/lib/billing'

interface UpcomingBilling {
    studentId: string
    studentName: string
    yearMonth: string
    totalAmount: number
    lessonCount: number
    isConfirmed: boolean
    paymentDueDate: Date
}

export interface StudentBillingInfo {
    studentId: string
    studentName: string
    billingInfo: BillingInfo
    lessons: Lesson[]
}

interface TeacherPaymentsPageProps {
    searchParams: { date?: string }
}

export default async function TeacherPaymentsPage({ searchParams }: TeacherPaymentsPageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get all students for this teacher
    const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .eq('teacher_id', user.id)
        .order('name')

    // Get all payments with pending reports (payment_reported_at is set but payment_confirmed_at is null)
    const { data: payments } = await supabase
        .from('monthly_payments')
        .select(`
            *,
            student:students!inner(id, name, teacher_id)
        `)
        .eq('student.teacher_id', user.id)
        .not('payment_reported_at', 'is', null)
        .order('payment_reported_at', { ascending: false })

    // Calculate upcoming billing for next month (unconfirmed)
    const today = new Date()
    const nextMonth = addMonths(startOfMonth(today), 1)
    const { start, end } = getBillingMonthRange(nextMonth)

    const upcomingBillings: UpcomingBilling[] = []

    // Selected month for billing history view
    let selectedMonth = nextMonth
    if (searchParams.date) {
        const [year, month] = searchParams.date.split('-').map(Number)
        if (!isNaN(year) && !isNaN(month)) {
            selectedMonth = new Date(year, month - 1, 1)
        }
    }
    const selectedYearMonth = format(selectedMonth, 'yyyy-MM')
    const { start: selectedStart, end: selectedEnd } = getBillingMonthRange(selectedMonth)
    const prevMonth = addMonths(selectedMonth, -1)
    const { start: prevStart, end: prevEnd } = getBillingMonthRange(prevMonth)

    if (students) {
        const studentsTyped = students as Array<{ id: string; name: string }>
        for (const student of studentsTyped) {
            // Check if payment already exists for this month
            const paymentsTyped = payments as Array<{ student_id: string; year_month: string }> | null
            const existingPayment = paymentsTyped?.find(
                p => p.student_id === student.id && p.year_month === format(nextMonth, 'yyyy-MM')
            )

            // Skip if already reported
            if (existingPayment) continue

            // Fetch lessons for this student in the billing period
            const { data: lessons } = await supabase
                .from('lessons')
                .select('*')
                .eq('student_id', student.id)
                .eq('status', 'planned')
                .gte('date', start)
                .lte('date', end)

            if (lessons && lessons.length > 0) {
                const billingInfo = calculateBillingInfo(lessons as Lesson[], nextMonth, today)

                upcomingBillings.push({
                    studentId: student.id,
                    studentName: student.name,
                    yearMonth: format(nextMonth, 'yyyy-MM'),
                    totalAmount: billingInfo.totalAmount,
                    lessonCount: billingInfo.lessonCount,
                    isConfirmed: billingInfo.isConfirmed,
                    paymentDueDate: getPaymentDueDate(nextMonth),
                })
            }
        }
    }

    // Fetch billing info for selected month (all students)
    const studentBillings: StudentBillingInfo[] = []

    if (students) {
        const studentsTyped = students as Array<{ id: string; name: string }>
        for (const student of studentsTyped) {
            // Fetch lessons for selected month
            const { data: selectedLessons } = await supabase
                .from('lessons')
                .select('*')
                .eq('student_id', student.id)
                .gte('date', selectedStart)
                .lte('date', selectedEnd)
                .order('date', { ascending: true })

            // Fetch lessons for previous month (for adjustments)
            const { data: prevLessons } = await supabase
                .from('lessons')
                .select('*')
                .eq('student_id', student.id)
                .gte('date', prevStart)
                .lte('date', prevEnd)

            const lessons = (selectedLessons || []) as Lesson[]
            const prevLessonsList = (prevLessons || []) as Lesson[]

            if (lessons.length > 0 || prevLessonsList.some(l => l.status === 'cancelled')) {
                const billingInfo = calculateBillingInfo(lessons, selectedMonth, today, prevLessonsList)

                studentBillings.push({
                    studentId: student.id,
                    studentName: student.name,
                    billingInfo,
                    lessons,
                })
            }
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">振込管理</h1>
            <PaymentsClient
                payments={payments || []}
                upcomingBillings={upcomingBillings}
                studentBillings={studentBillings}
                selectedMonth={selectedMonth}
                selectedYearMonth={selectedYearMonth}
            />
        </div>
    )
}
