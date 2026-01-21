'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, addMonths, startOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/pricing'
import type { MonthlyPayment } from '@/types/database'
import type { BillingInfo, Lesson } from '@/lib/billing'
import {
    CheckCircle2,
    Clock,
    User,
    Calendar,
    Loader2,
    Inbox,
    CreditCard,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    FileText,
    Plus,
    X,
    Trash2,
    FileDown,
} from 'lucide-react'
import { InvoicePDF } from './invoice-pdf'

interface PaymentWithStudent extends MonthlyPayment {
    student: {
        id: string
        name: string
    }
}

interface UpcomingBilling {
    studentId: string
    studentName: string
    yearMonth: string
    totalAmount: number
    lessonCount: number
    isConfirmed: boolean
    paymentDueDate: Date
}

interface StudentBillingInfo {
    studentId: string
    studentName: string
    billingInfo: BillingInfo
    lessons: Lesson[]
}

interface PaymentsClientProps {
    payments: PaymentWithStudent[]
    upcomingBillings: UpcomingBilling[]
    studentBillings: StudentBillingInfo[]
    selectedMonth: Date
    selectedYearMonth: string
    students: Array<{ id: string; name: string }>
}

// 月選択オプションを生成（過去12ヶ月 + 今月 + 翌月）
function generateMonthOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = []
    const today = new Date()
    const nextMonth = addMonths(startOfMonth(today), 1)

    // 翌月から過去12ヶ月分（計14ヶ月分）
    for (let i = -12; i <= 1; i++) {
        const month = addMonths(nextMonth, i)
        options.push({
            value: format(month, 'yyyy-MM'),
            label: format(month, 'yyyy年M月', { locale: ja }),
        })
    }

    return options.reverse() // 新しい月が上に来るように
}

export function PaymentsClient({
    payments: initialPayments,
    upcomingBillings,
    studentBillings,
    selectedMonth,
    selectedYearMonth,
    students,
}: PaymentsClientProps) {
    const router = useRouter()
    const [payments, setPayments] = useState(initialPayments)
    const [showMonthPicker, setShowMonthPicker] = useState(false)
    const [showAddChargeForm, setShowAddChargeForm] = useState(false)
    const [addingCharge, setAddingCharge] = useState(false)
    const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null)
    const [selectedBillingForPDF, setSelectedBillingForPDF] = useState<StudentBillingInfo | null>(null)

    // 追加請求フォームの状態
    const [chargeStudentId, setChargeStudentId] = useState('')
    const [chargeDate, setChargeDate] = useState(format(selectedMonth, 'yyyy-MM-dd'))
    const [chargeDescription, setChargeDescription] = useState('')
    const [chargeAmount, setChargeAmount] = useState('')

    const monthOptions = generateMonthOptions()
    const prevMonth = addMonths(selectedMonth, -1)
    const nextMonth = addMonths(selectedMonth, 1)

    const handleMonthSelect = (yearMonth: string) => {
        setShowMonthPicker(false)
        router.push(`/teacher/payments?date=${yearMonth}`)
    }

    const handleAddCharge = async () => {
        if (!chargeStudentId || !chargeDate || !chargeDescription || !chargeAmount) return

        setAddingCharge(true)
        try {
            const supabase = createClient()
            const { error } = await (supabase
                .from('billing_other_charges') as any)
                .insert({
                    student_id: chargeStudentId,
                    year_month: selectedYearMonth,
                    charge_date: chargeDate,
                    description: chargeDescription,
                    amount: parseInt(chargeAmount, 10),
                })

            if (error) throw error

            // リセットしてリロード
            setShowAddChargeForm(false)
            setChargeStudentId('')
            setChargeDate(format(selectedMonth, 'yyyy-MM-dd'))
            setChargeDescription('')
            setChargeAmount('')
            router.refresh()
        } catch (err) {
            console.error('Add charge error:', err)
        } finally {
            setAddingCharge(false)
        }
    }

    const handleDeleteCharge = async (chargeId: string) => {
        setDeletingChargeId(chargeId)
        try {
            const supabase = createClient()
            const { error } = await (supabase
                .from('billing_other_charges') as any)
                .delete()
                .eq('id', chargeId)

            if (error) throw error
            router.refresh()
        } catch (err) {
            console.error('Delete charge error:', err)
        } finally {
            setDeletingChargeId(null)
        }
    }

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

            {/* Upcoming Billings (Unconfirmed) */}
            {upcomingBillings.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-display text-ink flex items-center gap-2">
                        <AlertCircle size={20} className="text-ink-light" />
                        翌月の請求予定（{upcomingBillings.length}件）
                    </h2>

                    <div className="space-y-3">
                        {upcomingBillings.map((billing) => (
                            <Card
                                key={billing.studentId}
                                padding="md"
                                className={`animate-fade-slide-up ${billing.isConfirmed
                                    ? 'bg-paper border-paper-dark'
                                    : 'bg-paper-light border-paper-dark border-dashed'
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-ink-light" />
                                            <span className="font-medium text-ink">
                                                {billing.studentName}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-light">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {formatYearMonth(billing.yearMonth)}分
                                            </span>
                                            <span className="font-medium text-ink">
                                                {formatCurrency(billing.totalAmount)}
                                            </span>
                                            <span className="text-ink-faint">
                                                ({billing.lessonCount}回)
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`text-xs px-2 py-1 rounded-full ${billing.isConfirmed
                                        ? 'bg-sage-subtle text-sage-dark'
                                        : 'bg-ochre-subtle text-ochre-dark'
                                        }`}>
                                        {billing.isConfirmed ? '確定' : '未確定'}
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
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
            {payments.length === 0 && upcomingBillings.length === 0 && (
                <Card padding="lg" className="text-center">
                    <CreditCard size={48} className="text-ink-faint mx-auto mb-4" />
                    <h3 className="text-lg font-display text-ink mb-2">振込報告はまだありません</h3>
                    <p className="text-sm text-ink-light">
                        保護者が振込完了を報告するとここに表示されます
                    </p>
                </Card>
            )}

            {/* Monthly Billing History Section */}
            <div className="space-y-4 pt-4 border-t border-paper-dark">
                <h2 className="text-lg font-display text-ink flex items-center gap-2">
                    <FileText size={20} className="text-ink-light" />
                    請求書出力
                </h2>

                {/* Month Navigation */}
                <Card padding="md">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Link
                            href={`/teacher/payments?date=${format(prevMonth, 'yyyy-MM')}`}
                            className="p-1 rounded-full hover:bg-paper-dark text-ink-light transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </Link>

                        {/* Month Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMonthPicker(!showMonthPicker)}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-paper-dark text-ink-light transition-colors"
                            >
                                <CalendarDays size={16} />
                                <span className="text-sm font-medium">
                                    {format(selectedMonth, 'yyyy年M月', { locale: ja })}
                                </span>
                            </button>

                            {showMonthPicker && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMonthPicker(false)}
                                    />
                                    {/* Dropdown */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-paper border border-paper-dark rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-[160px]">
                                        {monthOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleMonthSelect(option.value)}
                                                className={`w-full px-4 py-2 text-sm text-left hover:bg-paper-dark transition-colors ${
                                                    option.value === selectedYearMonth
                                                        ? 'bg-ochre-subtle text-ochre-dark font-medium'
                                                        : 'text-ink'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <Link
                            href={`/teacher/payments?date=${format(nextMonth, 'yyyy-MM')}`}
                            className="p-1 rounded-full hover:bg-paper-dark text-ink-light transition-colors"
                        >
                            <ChevronRight size={20} />
                        </Link>
                    </div>

                    {/* Student Billing List */}
                    {studentBillings.length > 0 ? (
                        <div className="space-y-3">
                            {studentBillings.map((billing) => (
                                <div
                                    key={billing.studentId}
                                    className="p-3 rounded-lg border border-paper-dark bg-paper-light"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-ink-light" />
                                            <span className="font-medium text-ink">
                                                {billing.studentName}
                                            </span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            billing.billingInfo.isConfirmed
                                                ? 'bg-sage-subtle text-sage-dark'
                                                : 'bg-ochre-subtle text-ochre-dark'
                                        }`}>
                                            {billing.billingInfo.isConfirmed ? '確定' : '未確定'}
                                        </span>
                                    </div>

                                    {/* Billing breakdown */}
                                    <div className="text-sm space-y-2 mb-2">
                                        {/* 翌月分（先払い） */}
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-ink">① 翌月分（先払い）</p>
                                            {billing.lessons.length > 0 ? (
                                                <div className="pl-2 space-y-1">
                                                    {billing.lessons.map((lesson) => (
                                                        <div key={lesson.id} className="flex justify-between items-start text-xs">
                                                            <div className="flex flex-col">
                                                                <span className="text-ink-light">
                                                                    {format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                                                                    {lesson.is_makeup && (
                                                                        <span className="ml-1 px-1 py-0.5 rounded bg-sage-subtle text-sage-dark text-[10px]">
                                                                            振替
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className="text-ink-faint">
                                                                    {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                                                                    {lesson.transport_fee > 0 && (
                                                                        <span className="ml-1">
                                                                            （交通費 {formatCurrency(lesson.transport_fee)}）
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <span className="text-ink">
                                                                {formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="pl-2 text-xs text-ink-faint">レッスンなし</p>
                                            )}
                                            <div className="flex justify-between text-xs font-medium text-ink pl-2 pt-1 border-t border-dashed border-paper-dark">
                                                <span>小計（{billing.billingInfo.lessonCount}回）</span>
                                                <span>{formatCurrency(billing.billingInfo.lessonFeeTotal + billing.billingInfo.transportFeeTotal)}</span>
                                            </div>
                                        </div>

                                        {/* 前月の調整 */}
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-ink">② 前月の調整（追加・返金）</p>
                                            {billing.billingInfo.adjustments.details && billing.billingInfo.adjustments.details.length > 0 ? (
                                                <div className="pl-2 space-y-1">
                                                    {billing.billingInfo.adjustments.details.map((detail, index) => (
                                                        <div key={index} className="flex justify-between items-start text-xs">
                                                            <div className="flex flex-col">
                                                                <span className={`font-medium ${detail.type === 'refund' ? 'text-sage' : 'text-ochre'}`}>
                                                                    {detail.reason}
                                                                </span>
                                                                <span className="text-ink-faint">
                                                                    {format(new Date(detail.date), 'M/d（E）', { locale: ja })}
                                                                </span>
                                                            </div>
                                                            <span className={detail.type === 'refund' ? 'text-sage' : 'text-ochre'}>
                                                                {detail.type === 'refund' ? '-' : '+'}{formatCurrency(detail.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="pl-2 text-xs text-ink-faint">調整なし</p>
                                            )}
                                            <div className="flex justify-between text-xs font-medium text-ink pl-2 pt-1 border-t border-dashed border-paper-dark">
                                                <span>小計</span>
                                                <span className={billing.billingInfo.adjustments.total < 0 ? 'text-sage' : billing.billingInfo.adjustments.total > 0 ? 'text-ochre' : 'text-ink'}>
                                                    {billing.billingInfo.adjustments.total > 0 ? '+' : ''}{formatCurrency(billing.billingInfo.adjustments.total)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* その他（違約金など） */}
                                        {billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-ink">③ その他</p>
                                                <div className="pl-2 space-y-1">
                                                    {billing.billingInfo.otherCharges.items.map((item) => (
                                                        <div key={item.id} className="flex justify-between items-start text-xs group">
                                                            <div className="flex flex-col">
                                                                <span className="text-ink-light">{item.description}</span>
                                                                {item.chargeDate && (
                                                                    <span className="text-ink-faint">
                                                                        {format(new Date(item.chargeDate), 'M/d（E）', { locale: ja })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-ink">{formatCurrency(item.amount)}</span>
                                                                <button
                                                                    onClick={() => handleDeleteCharge(item.id)}
                                                                    disabled={deletingChargeId === item.id}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-ink-faint hover:text-accent transition-all"
                                                                >
                                                                    {deletingChargeId === item.id ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <Trash2 size={12} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between text-xs font-medium text-ink pl-2 pt-1 border-t border-dashed border-paper-dark">
                                                    <span>小計</span>
                                                    <span>{formatCurrency(billing.billingInfo.otherCharges.total)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t-2 border-paper-dark">
                                        <span className="text-sm font-bold text-ink">
                                            請求総額 (①+②{billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0 ? '+③' : ''})
                                        </span>
                                        <span className="text-lg font-display text-ink">
                                            {formatCurrency(billing.billingInfo.totalAmount)}
                                        </span>
                                    </div>

                                    {/* PDF出力ボタン */}
                                    <div className="mt-3 pt-3 border-t border-paper-dark">
                                        <Button
                                            variant="secondary"
                                            onClick={() => setSelectedBillingForPDF(billing)}
                                            className="w-full"
                                        >
                                            <FileDown size={16} />
                                            請求書を出力
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-ink-faint py-4">
                            {format(selectedMonth, 'yyyy年M月', { locale: ja })}の請求データはありません
                        </p>
                    )}
                </Card>

                {/* その他請求を追加 */}
                <Card padding="md">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-ink flex items-center gap-2">
                            <Plus size={16} />
                            その他の請求を追加
                        </h3>
                        {showAddChargeForm && (
                            <button
                                onClick={() => setShowAddChargeForm(false)}
                                className="p-1 text-ink-faint hover:text-ink transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {!showAddChargeForm ? (
                        <Button
                            variant="secondary"
                            onClick={() => setShowAddChargeForm(true)}
                            className="w-full"
                        >
                            <Plus size={16} />
                            違約金・その他を追加
                        </Button>
                    ) : (
                        <div className="space-y-3">
                            {/* 生徒選択 */}
                            <div>
                                <label className="block text-xs text-ink-light mb-1">生徒</label>
                                <select
                                    value={chargeStudentId}
                                    onChange={(e) => setChargeStudentId(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-paper-dark rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-ochre"
                                >
                                    <option value="">選択してください</option>
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 対象日 */}
                            <div>
                                <label className="block text-xs text-ink-light mb-1">対象日（いつ分の請求か）</label>
                                <input
                                    type="date"
                                    value={chargeDate}
                                    onChange={(e) => setChargeDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-paper-dark rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-ochre"
                                />
                            </div>

                            {/* 説明 */}
                            <div>
                                <label className="block text-xs text-ink-light mb-1">説明</label>
                                <input
                                    type="text"
                                    value={chargeDescription}
                                    onChange={(e) => setChargeDescription(e.target.value)}
                                    placeholder="例：無断キャンセル違約金"
                                    className="w-full px-3 py-2 text-sm border border-paper-dark rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-ochre"
                                />
                            </div>

                            {/* 金額 */}
                            <div>
                                <label className="block text-xs text-ink-light mb-1">金額</label>
                                <input
                                    type="number"
                                    value={chargeAmount}
                                    onChange={(e) => setChargeAmount(e.target.value)}
                                    placeholder="例：3000"
                                    className="w-full px-3 py-2 text-sm border border-paper-dark rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-ochre"
                                />
                            </div>

                            {/* 追加ボタン */}
                            <Button
                                variant="primary"
                                onClick={handleAddCharge}
                                disabled={addingCharge || !chargeStudentId || !chargeDate || !chargeDescription || !chargeAmount}
                                className="w-full"
                            >
                                {addingCharge ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Plus size={16} />
                                )}
                                追加する
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* PDF Modal */}
            {selectedBillingForPDF && (
                <InvoicePDF
                    billing={selectedBillingForPDF}
                    selectedYearMonth={selectedYearMonth}
                    onClose={() => setSelectedBillingForPDF(null)}
                />
            )}
        </div>
    )
}
