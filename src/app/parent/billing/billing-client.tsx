'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/pricing'
import type { BillingInfo } from '@/lib/billing'
import type { MonthlyPayment, PaymentStatus } from '@/types/database'
import { getPaymentStatus } from '@/types/database'
import {
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Train,
    CreditCard,
    Loader2,
} from 'lucide-react'

interface BillingClientProps {
    billingInfo: BillingInfo
    allLessons: Array<{
        id: string
        date: string
        start_time: string
        end_time: string
        hours: number
        amount: number
        transport_fee: number
        is_makeup: boolean
    }>
    payment: MonthlyPayment | null
    studentId: string
    yearMonth: string
}

export function BillingClient({ billingInfo, allLessons, payment, studentId, yearMonth }: BillingClientProps) {
    const [currentPayment, setCurrentPayment] = useState<MonthlyPayment | null>(payment)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const status = getPaymentStatus(currentPayment)

    const handleReportPayment = async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            if (currentPayment) {
                // Update existing record
                const { data, error: updateError } = await supabase
                    .from('monthly_payments')
                    .update({
                        payment_reported_at: new Date().toISOString(),
                    })
                    .eq('id', currentPayment.id)
                    .select()
                    .single()

                if (updateError) throw updateError
                setCurrentPayment(data)
            } else {
                // Create new record
                const { data, error: insertError } = await supabase
                    .from('monthly_payments')
                    .insert({
                        student_id: studentId,
                        year_month: yearMonth,
                        total_amount: billingInfo.totalAmount,
                        payment_reported_at: new Date().toISOString(),
                    })
                    .select()
                    .single()

                if (insertError) throw insertError
                setCurrentPayment(data)
            }
        } catch (err) {
            console.error('Payment report error:', err)
            setError('振込報告に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const getStatusDisplay = () => {
        switch (status) {
            case 'confirmed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-sage-subtle text-sage-dark border border-sage">
                        <CheckCircle2 size={14} />
                        振込確認済み
                    </span>
                )
            case 'reported':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-ochre-subtle text-ochre-dark border border-ochre">
                        <Clock size={14} />
                        振込報告済み（確認待ち）
                    </span>
                )
            default:
                return null
        }
    }

    return (
        <div className="space-y-6">
            {/* Main Billing Card */}
            <Card padding="lg" className="animate-fade-slide-up">
                <div className="text-center">
                    {/* Month Label */}
                    <p className="text-sm text-ink-light mb-2">
                        {format(billingInfo.targetMonth, 'yyyy年M月', { locale: ja })}分 お支払い
                    </p>

                    {/* Status Badge */}
                    <div className="flex justify-center mb-4">
                        {status !== 'unpaid' ? (
                            getStatusDisplay()
                        ) : billingInfo.isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-sage-subtle text-sage-dark border border-sage">
                                <CheckCircle2 size={14} />
                                確定
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-ochre-subtle text-ochre-dark border border-ochre">
                                <AlertCircle size={14} />
                                暫定
                            </span>
                        )}
                    </div>

                    {/* Total Amount */}
                    <div className="mb-4">
                        <p className="text-4xl font-display text-ink mb-2">
                            {formatCurrency(billingInfo.totalAmount)}
                        </p>
                        <p className="text-sm text-ink-faint">
                            {billingInfo.lessonCount}回のレッスン
                        </p>
                    </div>

                    {/* Breakdown */}
                    <div className="flex justify-center gap-6 text-sm text-ink-light mb-6">
                        <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>授業料: {formatCurrency(billingInfo.lessonFeeTotal)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Train size={14} />
                            <span>交通費: {formatCurrency(billingInfo.transportFeeTotal)}</span>
                        </div>
                    </div>

                    {/* Payment Button */}
                    {status === 'unpaid' && billingInfo.isConfirmed && (
                        <div className="space-y-3">
                            <Button
                                variant="primary"
                                onClick={handleReportPayment}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <CreditCard size={16} />
                                )}
                                振込完了を報告する
                            </Button>
                            <p className="text-xs text-ink-faint">
                                振込後にこのボタンを押してください
                            </p>
                        </div>
                    )}

                    {/* Confirmed Info */}
                    {status === 'confirmed' && currentPayment?.payment_confirmed_at && (
                        <p className="text-xs text-sage">
                            {format(new Date(currentPayment.payment_confirmed_at), 'M月d日', { locale: ja })}に先生が確認しました
                        </p>
                    )}

                    {/* Reported Info */}
                    {status === 'reported' && currentPayment?.payment_reported_at && (
                        <p className="text-xs text-ochre">
                            {format(new Date(currentPayment.payment_reported_at), 'M月d日', { locale: ja })}に振込報告済み
                        </p>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-accent mt-2">{error}</p>
                    )}

                    {/* Confirmation Info */}
                    {!billingInfo.isConfirmed && (
                        <p className="mt-4 text-xs text-ink-faint">
                            {format(billingInfo.confirmationDate, 'M月d日', { locale: ja })}
                            以降に金額が確定します
                        </p>
                    )}
                </div>
            </Card>

            {/* Lesson Details */}
            <Card padding="none" className="animate-fade-slide-up stagger-1">
                <CardHeader className="p-4 border-b border-paper-dark">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar size={18} className="text-ink-light" />
                        {format(billingInfo.targetMonth, 'M月', { locale: ja })}のレッスン予定
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {allLessons.length > 0 ? (
                        <div className="space-y-3">
                            {allLessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    className={`p-3 rounded-lg border ${lesson.is_makeup
                                        ? 'bg-sage-subtle/30 border-sage-subtle'
                                        : 'bg-paper-light border-paper-dark'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-ink">
                                            {format(new Date(lesson.date), 'M月d日（E）', { locale: ja })}
                                        </span>
                                        {lesson.is_makeup ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-sage text-paper font-medium">
                                                振替
                                            </span>
                                        ) : (
                                            <span className="text-sm text-ink">
                                                {formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-ink-light">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                        </span>
                                        <span>{lesson.hours}時間</span>
                                        {!lesson.is_makeup && lesson.transport_fee > 0 && (
                                            <span className="flex items-center gap-1 text-ink-faint">
                                                <Train size={12} />
                                                {formatCurrency(lesson.transport_fee)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-ink-faint text-sm py-8 text-center">
                            {format(billingInfo.targetMonth, 'M月', { locale: ja })}のレッスン予定はありません
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
