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
} from '@/lib/billing'
import type { MonthlyPayment } from '@/types/database'
import { BillingClient } from './billing-client'
import {
    Wallet,
    ChevronRight,
    GraduationCap,
} from 'lucide-react'

export default async function ParentBillingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get parent's student_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single()

    if (!profile?.student_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <GraduationCap size={48} className="text-ink-faint mb-4" />
                <h2 className="text-xl font-display text-ink mb-2">生徒情報が登録されていません</h2>
                <p className="text-ink-light">先生に連絡してアカウントの設定を完了してください</p>
            </div>
        )
    }

    const today = new Date()
    const nextMonth = addMonths(startOfMonth(today), 1)
    const yearMonth = format(nextMonth, 'yyyy-MM')
    const { start, end } = getBillingMonthRange(nextMonth)

    // Fetch lessons for next month
    const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', profile.student_id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

    const lessons = (lessonsData || []) as Lesson[]
    const billingInfo = calculateBillingInfo(lessons, nextMonth, today)

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
