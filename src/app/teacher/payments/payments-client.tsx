'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/pricing'
import type { MonthlyPayment } from '@/types/database'
import {
    CheckCircle2,
    Clock,
    User,
    Calendar,
    Loader2,
    Inbox,
    CreditCard,
} from 'lucide-react'

interface PaymentWithStudent extends MonthlyPayment {
    student: {
        id: string
        name: string
    }
}

interface PaymentsClientProps {
    students: Array<{ id: string; name: string }>
    payments: PaymentWithStudent[]
}

export function PaymentsClient({ students, payments: initialPayments }: PaymentsClientProps) {
    const router = useRouter()
    const [payments, setPayments] = useState(initialPayments)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const pendingPayments = payments.filter(p => !p.payment_confirmed_at)
    const confirmedPayments = payments.filter(p => p.payment_confirmed_at)

    const handleConfirmPayment = async (paymentId: string) => {
        setLoadingId(paymentId)
        setError(null)

        try {
            const supabase = createClient()

            const { data, error: updateError } = await (supabase
                .from('monthly_payments') as any)
                .update({
                    payment_confirmed_at: new Date().toISOString(),
                })
                .eq('id', paymentId)
                .select(`
                    *,
                    student:students(id, name)
                `)
                .single()

            if (updateError) throw updateError

            // Update local state
            setPayments(prev =>
                prev.map(p => p.id === paymentId ? data : p)
            )

            router.refresh()
        } catch (err) {
            console.error('Confirm payment error:', err)
            setError('確認に失敗しました')
        } finally {
            setLoadingId(null)
        }
    }

    const formatYearMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-')
        return `${year}年${parseInt(month)}月`
    }

    return (
        <div className="space-y-6">
            {error && (
                <Card padding="md" className="bg-accent-subtle border-accent">
                    <p className="text-sm text-accent">{error}</p>
                </Card>
            )}

            {/* Pending Payments */}
            <div className="space-y-4">
                <h2 className="text-lg font-display text-ink flex items-center gap-2">
                    <Clock size={20} className="text-ochre" />
                    確認待ち（{pendingPayments.length}件）
                </h2>

                {pendingPayments.length > 0 ? (
                    <div className="space-y-3">
                        {pendingPayments.map((payment) => (
                            <Card
                                key={payment.id}
                                padding="md"
                                className="animate-fade-slide-up bg-ochre-subtle/30 border-ochre-subtle"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-ink-light" />
                                            <span className="font-medium text-ink">
                                                {payment.student.name}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-light">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {formatYearMonth(payment.year_month)}分
                                            </span>
                                            <span className="font-medium text-ink">
                                                {formatCurrency(payment.total_amount)}
                                            </span>
                                        </div>
                                        {payment.payment_reported_at && (
                                            <p className="text-xs text-ochre">
                                                {format(new Date(payment.payment_reported_at), 'M月d日 HH:mm', { locale: ja })}に振込報告
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="primary"
                                        onClick={() => handleConfirmPayment(payment.id)}
                                        disabled={loadingId === payment.id}
                                        className="shrink-0"
                                    >
                                        {loadingId === payment.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={16} />
                                        )}
                                        確認完了
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card padding="lg" className="text-center">
                        <Inbox size={32} className="text-ink-faint mx-auto mb-2" />
                        <p className="text-ink-faint">確認待ちの振込はありません</p>
                    </Card>
                )}
            </div>

            {/* Confirmed Payments */}
            {confirmedPayments.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-display text-ink flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-sage" />
                        確認済み（{confirmedPayments.length}件）
                    </h2>

                    <div className="space-y-3">
                        {confirmedPayments.slice(0, 10).map((payment) => (
                            <Card
                                key={payment.id}
                                padding="md"
                                className="bg-sage-subtle/20 border-sage-subtle"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-ink-light" />
                                            <span className="font-medium text-ink">
                                                {payment.student.name}
                                            </span>
                                        </div>
                                        <span className="text-sm text-ink-light">
                                            {formatYearMonth(payment.year_month)}分
                                        </span>
                                        <span className="text-sm font-medium text-ink">
                                            {formatCurrency(payment.total_amount)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-sage">
                                        <CheckCircle2 size={14} />
                                        {payment.payment_confirmed_at && (
                                            <span>
                                                {format(new Date(payment.payment_confirmed_at), 'M月d日', { locale: ja })}確認
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state when no payments at all */}
            {payments.length === 0 && (
                <Card padding="lg" className="text-center">
                    <CreditCard size={48} className="text-ink-faint mx-auto mb-4" />
                    <h3 className="text-lg font-display text-ink mb-2">振込報告はまだありません</h3>
                    <p className="text-sm text-ink-light">
                        保護者が振込完了を報告するとここに表示されます
                    </p>
                </Card>
            )}
        </div>
    )
}
