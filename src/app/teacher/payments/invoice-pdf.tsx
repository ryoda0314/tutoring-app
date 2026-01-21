'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatCurrency } from '@/lib/pricing'
import type { BillingInfo, Lesson } from '@/lib/billing'
import { FileDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StudentBillingInfo {
    studentId: string
    studentName: string
    billingInfo: BillingInfo
    lessons: Lesson[]
}

interface InvoicePDFProps {
    billing: StudentBillingInfo
    selectedYearMonth: string
    onClose: () => void
}

export function InvoicePDF({ billing, selectedYearMonth, onClose }: InvoicePDFProps) {
    const handlePrint = () => {
        window.print()
    }

    const [year, month] = selectedYearMonth.split('-')
    const issueDate = new Date()

    return (
        <>
            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .invoice-container,
                    .invoice-container * {
                        visibility: visible;
                    }
                    .invoice-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20mm;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                }
            `}</style>

            {/* Modal backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
                <div className="bg-paper rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
                    {/* Modal header */}
                    <div className="sticky top-0 bg-paper border-b border-paper-dark p-4 flex items-center justify-between no-print">
                        <h2 className="text-lg font-display text-ink">請求書プレビュー</h2>
                        <div className="flex items-center gap-2">
                            <Button variant="primary" onClick={handlePrint}>
                                <FileDown size={16} />
                                PDF保存 / 印刷
                            </Button>
                            <button
                                onClick={onClose}
                                className="p-2 text-ink-faint hover:text-ink transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Invoice content */}
                    <div className="invoice-container p-8 bg-white">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-ink mb-2">請 求 書</h1>
                            <p className="text-sm text-ink-light">
                                {year}年{parseInt(month)}月分
                            </p>
                        </div>

                        {/* Recipient & Issue Info */}
                        <div className="flex justify-between mb-8">
                            <div>
                                <p className="text-lg font-medium text-ink border-b-2 border-ink pb-1 inline-block">
                                    {billing.studentName} 様
                                </p>
                            </div>
                            <div className="text-right text-sm text-ink-light">
                                <p>発行日: {format(issueDate, 'yyyy年M月d日', { locale: ja })}</p>
                            </div>
                        </div>

                        {/* Total Amount Box */}
                        <div className="bg-paper-light border-2 border-ink rounded-lg p-4 mb-8">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-ink">ご請求金額</span>
                                <span className="text-2xl font-bold text-ink">
                                    {formatCurrency(billing.billingInfo.totalAmount)}
                                </span>
                            </div>
                        </div>

                        {/* Billing Details */}
                        <div className="space-y-6">
                            {/* Section 1: Lessons */}
                            <div>
                                <h3 className="text-sm font-bold text-ink border-b border-paper-dark pb-1 mb-3">
                                    ① {parseInt(month)}月分レッスン料（先払い）
                                </h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-paper-dark">
                                            <th className="text-left py-2 text-ink-light font-normal">日付</th>
                                            <th className="text-left py-2 text-ink-light font-normal">時間</th>
                                            <th className="text-right py-2 text-ink-light font-normal">レッスン料</th>
                                            <th className="text-right py-2 text-ink-light font-normal">交通費</th>
                                            <th className="text-right py-2 text-ink-light font-normal">小計</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {billing.lessons.length > 0 ? (
                                            billing.lessons.map((lesson) => (
                                                <tr key={lesson.id} className="border-b border-paper-dark/50">
                                                    <td className="py-2 text-ink">
                                                        {format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                                                        {lesson.is_makeup && (
                                                            <span className="ml-1 text-xs text-sage">（振替）</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-ink">
                                                        {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                                                    </td>
                                                    <td className="py-2 text-right text-ink">
                                                        {formatCurrency(lesson.amount || 0)}
                                                    </td>
                                                    <td className="py-2 text-right text-ink">
                                                        {formatCurrency(lesson.transport_fee || 0)}
                                                    </td>
                                                    <td className="py-2 text-right font-medium text-ink">
                                                        {formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-4 text-center text-ink-faint">
                                                    レッスンなし
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-paper-dark">
                                            <td colSpan={4} className="py-2 text-right font-medium text-ink">
                                                ①小計（{billing.billingInfo.lessonCount}回）
                                            </td>
                                            <td className="py-2 text-right font-bold text-ink">
                                                {formatCurrency(billing.billingInfo.lessonFeeTotal + billing.billingInfo.transportFeeTotal)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Section 2: Adjustments */}
                            <div>
                                <h3 className="text-sm font-bold text-ink border-b border-paper-dark pb-1 mb-3">
                                    ② 前月の調整（追加・返金）
                                </h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-paper-dark">
                                            <th className="text-left py-2 text-ink-light font-normal">日付</th>
                                            <th className="text-left py-2 text-ink-light font-normal">内容</th>
                                            <th className="text-right py-2 text-ink-light font-normal">金額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {billing.billingInfo.adjustments.details.length > 0 ? (
                                            billing.billingInfo.adjustments.details.map((detail, index) => (
                                                <tr key={index} className="border-b border-paper-dark/50">
                                                    <td className="py-2 text-ink">
                                                        {format(new Date(detail.date), 'M/d（E）', { locale: ja })}
                                                    </td>
                                                    <td className="py-2 text-ink">{detail.reason}</td>
                                                    <td className={`py-2 text-right font-medium ${detail.type === 'refund' ? 'text-sage' : 'text-ink'}`}>
                                                        {detail.type === 'refund' ? '-' : '+'}{formatCurrency(detail.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-4 text-center text-ink-faint">
                                                    調整なし
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-paper-dark">
                                            <td colSpan={2} className="py-2 text-right font-medium text-ink">
                                                ②小計
                                            </td>
                                            <td className={`py-2 text-right font-bold ${billing.billingInfo.adjustments.total < 0 ? 'text-sage' : 'text-ink'}`}>
                                                {billing.billingInfo.adjustments.total > 0 ? '+' : ''}{formatCurrency(billing.billingInfo.adjustments.total)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Section 3: Other Charges */}
                            {billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-ink border-b border-paper-dark pb-1 mb-3">
                                        ③ その他
                                    </h3>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-paper-dark">
                                                <th className="text-left py-2 text-ink-light font-normal">日付</th>
                                                <th className="text-left py-2 text-ink-light font-normal">内容</th>
                                                <th className="text-right py-2 text-ink-light font-normal">金額</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billing.billingInfo.otherCharges.items.map((item) => (
                                                <tr key={item.id} className="border-b border-paper-dark/50">
                                                    <td className="py-2 text-ink">
                                                        {item.chargeDate ? format(new Date(item.chargeDate), 'M/d（E）', { locale: ja }) : '-'}
                                                    </td>
                                                    <td className="py-2 text-ink">{item.description}</td>
                                                    <td className="py-2 text-right font-medium text-ink">
                                                        {formatCurrency(item.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-paper-dark">
                                                <td colSpan={2} className="py-2 text-right font-medium text-ink">
                                                    ③小計
                                                </td>
                                                <td className="py-2 text-right font-bold text-ink">
                                                    {formatCurrency(billing.billingInfo.otherCharges.total)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Grand Total */}
                        <div className="mt-8 pt-4 border-t-2 border-ink">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-ink">
                                    合計金額（①+②{billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0 ? '+③' : ''}）
                                </span>
                                <span className="text-2xl font-bold text-ink">
                                    {formatCurrency(billing.billingInfo.totalAmount)}
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-12 text-center text-xs text-ink-faint">
                            <p>上記の通りご請求申し上げます。</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
