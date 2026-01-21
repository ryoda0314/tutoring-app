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
    teacherName: string
    onClose: () => void
}

export function InvoicePDF({ billing, selectedYearMonth, teacherName, onClose }: InvoicePDFProps) {
    const [year, month] = selectedYearMonth.split('-')
    const issueDate = new Date()

    const generatePrintHTML = () => {
        const lessonsHTML = billing.lessons.length > 0
            ? billing.lessons.map((lesson) => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px 4px; color: #111;">
                        ${format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                        ${lesson.is_makeup ? '<span style="margin-left: 4px; font-size: 12px; color: #16a34a;">（振替）</span>' : ''}
                    </td>
                    <td style="padding: 8px 4px; color: #111;">
                        ${lesson.start_time?.slice(0, 5)} - ${lesson.end_time?.slice(0, 5)}
                    </td>
                    <td style="padding: 8px 4px; text-align: right; color: #111;">
                        ${formatCurrency(lesson.amount || 0)}
                    </td>
                    <td style="padding: 8px 4px; text-align: right; color: #111;">
                        ${formatCurrency(lesson.transport_fee || 0)}
                    </td>
                    <td style="padding: 8px 4px; text-align: right; font-weight: 500; color: #111;">
                        ${formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #999;">レッスンなし</td></tr>'

        const adjustmentsHTML = billing.billingInfo.adjustments.details.length > 0
            ? billing.billingInfo.adjustments.details.map((detail) => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px 4px; color: #111;">
                        ${format(new Date(detail.date), 'M/d（E）', { locale: ja })}
                    </td>
                    <td style="padding: 8px 4px; color: #111;">${detail.reason}</td>
                    <td style="padding: 8px 4px; text-align: right; font-weight: 500; color: ${detail.type === 'refund' ? '#16a34a' : '#111'};">
                        ${detail.type === 'refund' ? '-' : '+'}${formatCurrency(detail.amount)}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #999;">調整なし</td></tr>'

        const otherChargesHTML = billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0
            ? `
                <div>
                    <h3 style="font-size: 14px; font-weight: bold; color: #111; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px;">
                        ③ その他
                    </h3>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #ddd;">
                                <th style="text-align: left; padding: 8px 4px; color: #666; font-weight: normal;">日付</th>
                                <th style="text-align: left; padding: 8px 4px; color: #666; font-weight: normal;">内容</th>
                                <th style="text-align: right; padding: 8px 4px; color: #666; font-weight: normal;">金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${billing.billingInfo.otherCharges.items.map((item) => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 4px; color: #111;">
                                        ${item.chargeDate ? format(new Date(item.chargeDate), 'M/d（E）', { locale: ja }) : '-'}
                                    </td>
                                    <td style="padding: 8px 4px; color: #111;">${item.description}</td>
                                    <td style="padding: 8px 4px; text-align: right; font-weight: 500; color: #111;">
                                        ${formatCurrency(item.amount)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid #ddd;">
                                <td colspan="2" style="padding: 8px 4px; text-align: right; font-weight: 500; color: #111;">
                                    ③小計
                                </td>
                                <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: #111;">
                                    ${formatCurrency(billing.billingInfo.otherCharges.total)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `
            : ''

        const hasOtherCharges = billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>請求書 - ${billing.studentName} - ${year}年${parseInt(month)}月</title>
                <style>
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 24px; font-weight: bold; color: #111; margin-bottom: 8px;">
                        請 求 書
                    </h1>
                    <p style="font-size: 14px; color: #666; margin: 0;">
                        ${year}年${parseInt(month)}月分
                    </p>
                </div>

                <!-- Recipient & Issue Info -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
                    <div>
                        <p style="font-size: 18px; font-weight: 500; color: #111; border-bottom: 2px solid #111; padding-bottom: 4px; display: inline-block; margin: 0;">
                            ${billing.studentName} 様
                        </p>
                    </div>
                    <div style="text-align: right; font-size: 14px; color: #666;">
                        <p style="margin: 0 0 4px 0; font-weight: 500; color: #111;">${teacherName}</p>
                        <p style="margin: 0;">発行日: ${format(issueDate, 'yyyy年M月d日', { locale: ja })}</p>
                    </div>
                </div>

                <!-- Total Amount Box -->
                <div style="background-color: #f5f5f5; border: 2px solid #111; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 18px; font-weight: 500; color: #111;">ご請求金額</span>
                        <span style="font-size: 24px; font-weight: bold; color: #111;">
                            ${formatCurrency(billing.billingInfo.totalAmount)}
                        </span>
                    </div>
                </div>

                <!-- Billing Details -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <!-- Section 1: Lessons -->
                    <div>
                        <h3 style="font-size: 14px; font-weight: bold; color: #111; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px;">
                            ① ${parseInt(month)}月分レッスン料（先払い）
                        </h3>
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <th style="text-align: left; padding: 8px 4px; color: #666; font-weight: normal;">日付</th>
                                    <th style="text-align: left; padding: 8px 4px; color: #666; font-weight: normal;">時間</th>
                                    <th style="text-align: right; padding: 8px 4px; color: #666; font-weight: normal;">レッスン料</th>
                                    <th style="text-align: right; padding: 8px 4px; color: #666; font-weight: normal;">交通費</th>
                                    <th style="text-align: right; padding: 8px 4px; color: #666; font-weight: normal;">小計</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lessonsHTML}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid #ddd;">
                                    <td colspan="4" style="padding: 8px 4px; text-align: right; font-weight: 500; color: #111;">
                                        ①小計（${billing.billingInfo.lessonCount}回）
                                    </td>
                                    <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: #111;">
                                        ${formatCurrency(billing.billingInfo.lessonFeeTotal + billing.billingInfo.transportFeeTotal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- Section 2: Adjustments -->
                    <div>
                        <h3 style="font-size: 14px; font-weight: bold; color: #111; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px;">
                            ② 前月の調整（追加・返金）
                        </h3>
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <th style="text-align: left; padding: 8px 4px; color: #666; font-weight: normal;">日付</th>
                                    <th style="text-align: left; padding: 8px 4px; color: #666; font-weight: normal;">内容</th>
                                    <th style="text-align: right; padding: 8px 4px; color: #666; font-weight: normal;">金額</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${adjustmentsHTML}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid #ddd;">
                                    <td colspan="2" style="padding: 8px 4px; text-align: right; font-weight: 500; color: #111;">
                                        ②小計
                                    </td>
                                    <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: ${billing.billingInfo.adjustments.total < 0 ? '#16a34a' : '#111'};">
                                        ${billing.billingInfo.adjustments.total > 0 ? '+' : ''}${formatCurrency(billing.billingInfo.adjustments.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- Section 3: Other Charges -->
                    ${otherChargesHTML}
                </div>

                <!-- Grand Total -->
                <div style="margin-top: 32px; padding-top: 16px; border-top: 2px solid #111;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 18px; font-weight: bold; color: #111;">
                            合計金額（①+②${hasOtherCharges ? '+③' : ''}）
                        </span>
                        <span style="font-size: 24px; font-weight: bold; color: #111;">
                            ${formatCurrency(billing.billingInfo.totalAmount)}
                        </span>
                    </div>
                </div>

                <!-- Footer -->
                <div style="margin-top: 48px; text-align: center; font-size: 12px; color: #999;">
                    <p style="margin: 0;">上記の通りご請求申し上げます。</p>
                </div>
            </body>
            </html>
        `
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(generatePrintHTML())
            printWindow.document.close()
            // Wait for content to load then print
            printWindow.onload = () => {
                printWindow.print()
            }
            // Fallback for some browsers
            setTimeout(() => {
                printWindow.print()
            }, 500)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
                {/* Modal header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-gray-900">請求書プレビュー</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="primary" onClick={handlePrint}>
                            <FileDown size={16} />
                            PDF保存 / 印刷
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Invoice Preview */}
                <div className="p-8 bg-white">
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>
                            請 求 書
                        </h1>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            {year}年{parseInt(month)}月分
                        </p>
                    </div>

                    {/* Recipient & Issue Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <div>
                            <p style={{
                                fontSize: '18px',
                                fontWeight: '500',
                                color: '#111',
                                borderBottom: '2px solid #111',
                                paddingBottom: '4px',
                                display: 'inline-block'
                            }}>
                                {billing.studentName} 様
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '14px', color: '#666' }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: '500', color: '#111' }}>{teacherName}</p>
                            <p style={{ margin: 0 }}>発行日: {format(issueDate, 'yyyy年M月d日', { locale: ja })}</p>
                        </div>
                    </div>

                    {/* Total Amount Box */}
                    <div style={{
                        backgroundColor: '#f5f5f5',
                        border: '2px solid #111',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '32px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '18px', fontWeight: '500', color: '#111' }}>ご請求金額</span>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>
                                {formatCurrency(billing.billingInfo.totalAmount)}
                            </span>
                        </div>
                    </div>

                    {/* Billing Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Section 1: Lessons */}
                        <div>
                            <h3 style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#111',
                                borderBottom: '1px solid #ddd',
                                paddingBottom: '4px',
                                marginBottom: '12px'
                            }}>
                                ① {parseInt(month)}月分レッスン料（先払い）
                            </h3>
                            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>日付</th>
                                        <th style={{ textAlign: 'left', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>時間</th>
                                        <th style={{ textAlign: 'right', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>レッスン料</th>
                                        <th style={{ textAlign: 'right', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>交通費</th>
                                        <th style={{ textAlign: 'right', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>小計</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billing.lessons.length > 0 ? (
                                        billing.lessons.map((lesson) => (
                                            <tr key={lesson.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px 4px', color: '#111' }}>
                                                    {format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                                                    {lesson.is_makeup && (
                                                        <span style={{ marginLeft: '4px', fontSize: '12px', color: '#16a34a' }}>（振替）</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '8px 4px', color: '#111' }}>
                                                    {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                                                </td>
                                                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#111' }}>
                                                    {formatCurrency(lesson.amount || 0)}
                                                </td>
                                                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#111' }}>
                                                    {formatCurrency(lesson.transport_fee || 0)}
                                                </td>
                                                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '500', color: '#111' }}>
                                                    {formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                                                レッスンなし
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #ddd' }}>
                                        <td colSpan={4} style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '500', color: '#111' }}>
                                            ①小計（{billing.billingInfo.lessonCount}回）
                                        </td>
                                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', color: '#111' }}>
                                            {formatCurrency(billing.billingInfo.lessonFeeTotal + billing.billingInfo.transportFeeTotal)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Section 2: Adjustments */}
                        <div>
                            <h3 style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#111',
                                borderBottom: '1px solid #ddd',
                                paddingBottom: '4px',
                                marginBottom: '12px'
                            }}>
                                ② 前月の調整（追加・返金）
                            </h3>
                            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>日付</th>
                                        <th style={{ textAlign: 'left', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>内容</th>
                                        <th style={{ textAlign: 'right', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billing.billingInfo.adjustments.details.length > 0 ? (
                                        billing.billingInfo.adjustments.details.map((detail, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px 4px', color: '#111' }}>
                                                    {format(new Date(detail.date), 'M/d（E）', { locale: ja })}
                                                </td>
                                                <td style={{ padding: '8px 4px', color: '#111' }}>{detail.reason}</td>
                                                <td style={{
                                                    padding: '8px 4px',
                                                    textAlign: 'right',
                                                    fontWeight: '500',
                                                    color: detail.type === 'refund' ? '#16a34a' : '#111'
                                                }}>
                                                    {detail.type === 'refund' ? '-' : '+'}{formatCurrency(detail.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                                                調整なし
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #ddd' }}>
                                        <td colSpan={2} style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '500', color: '#111' }}>
                                            ②小計
                                        </td>
                                        <td style={{
                                            padding: '8px 4px',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            color: billing.billingInfo.adjustments.total < 0 ? '#16a34a' : '#111'
                                        }}>
                                            {billing.billingInfo.adjustments.total > 0 ? '+' : ''}{formatCurrency(billing.billingInfo.adjustments.total)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Section 3: Other Charges */}
                        {billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0 && (
                            <div>
                                <h3 style={{
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color: '#111',
                                    borderBottom: '1px solid #ddd',
                                    paddingBottom: '4px',
                                    marginBottom: '12px'
                                }}>
                                    ③ その他
                                </h3>
                                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                                            <th style={{ textAlign: 'left', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>日付</th>
                                            <th style={{ textAlign: 'left', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>内容</th>
                                            <th style={{ textAlign: 'right', padding: '8px 4px', color: '#666', fontWeight: 'normal' }}>金額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {billing.billingInfo.otherCharges.items.map((item) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px 4px', color: '#111' }}>
                                                    {item.chargeDate ? format(new Date(item.chargeDate), 'M/d（E）', { locale: ja }) : '-'}
                                                </td>
                                                <td style={{ padding: '8px 4px', color: '#111' }}>{item.description}</td>
                                                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '500', color: '#111' }}>
                                                    {formatCurrency(item.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid #ddd' }}>
                                            <td colSpan={2} style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '500', color: '#111' }}>
                                                ③小計
                                            </td>
                                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', color: '#111' }}>
                                                {formatCurrency(billing.billingInfo.otherCharges.total)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Grand Total */}
                    <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '2px solid #111' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>
                                合計金額（①+②{billing.billingInfo.otherCharges && billing.billingInfo.otherCharges.items.length > 0 ? '+③' : ''}）
                            </span>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>
                                {formatCurrency(billing.billingInfo.totalAmount)}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '48px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                        <p>上記の通りご請求申し上げます。</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
