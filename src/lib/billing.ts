// Billing utilities for tutoring app
// Handles monthly payment calculation for parent billing

import { format, startOfMonth, endOfMonth, addMonths, getDate } from 'date-fns'

export interface Lesson {
    id: string
    student_id: string
    date: string
    start_time: string
    end_time: string
    hours: number
    amount: number
    transport_fee: number
    status: 'planned' | 'done' | 'cancelled'
    is_makeup: boolean
    memo?: string
    homework?: string
    created_at: string
    cancellation_reason?: string | null
}

export interface BillingInfo {
    targetMonth: Date
    totalAmount: number
    lessonFeeTotal: number
    transportFeeTotal: number
    lessonCount: number
    isConfirmed: boolean
    confirmationDate: Date
    lessons: Lesson[]
    adjustments: {
        addedLessonsFee: number
        cancellationRefund: number
        total: number
        details: AdjustmentDetail[]
    }
}

export interface AdjustmentDetail {
    date: string
    type: 'added' | 'refund'
    reason: string
    amount: number
}

/**
 * Get the start and end dates for a billing month
 * @param targetMonth - The target month as a Date
 * @returns Object with start and end dates as YYYY-MM-DD strings
 */
export function getBillingMonthRange(targetMonth: Date): { start: string; end: string } {
    const start = startOfMonth(targetMonth)
    const end = endOfMonth(targetMonth)
    return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
    }
}

/**
 * Check if billing for a month is confirmed
 * Billing is confirmed on the 20th of the previous month
 * @param targetMonth - The billing month
 * @param currentDate - Current date for comparison
 * @returns true if billing is confirmed
 */
export function isBillingConfirmed(targetMonth: Date, currentDate: Date = new Date()): boolean {
    // Confirmation happens on the 20th of the month before the target month
    const confirmationMonth = addMonths(targetMonth, -1)
    const confirmationDay = 20

    // If we're past the confirmation date, billing is confirmed
    const currentMonthStart = startOfMonth(currentDate)
    const confirmationMonthStart = startOfMonth(confirmationMonth)

    if (currentMonthStart > confirmationMonthStart) {
        return true
    }

    if (
        currentMonthStart.getTime() === confirmationMonthStart.getTime() &&
        getDate(currentDate) >= confirmationDay
    ) {
        return true
    }

    return false
}

/**
 * Get the confirmation date for a billing month
 * @param targetMonth - The billing month
 * @returns The date when billing is confirmed
 */
export function getConfirmationDate(targetMonth: Date): Date {
    const confirmationMonth = addMonths(targetMonth, -1)
    return new Date(confirmationMonth.getFullYear(), confirmationMonth.getMonth(), 20)
}

// ... (existing code)

/**
 * Calculate billing total from lessons
 * Only includes planned lessons that are not makeup lessons
 * @param lessons - Array of lessons
 * @returns BillingInfo object
 */
export function calculateBillingInfo(
    lessons: Lesson[],
    targetMonth: Date,
    currentDate: Date = new Date(),
    prevMonthLessons: Lesson[] = []
): BillingInfo {
    const confirmationDate = getConfirmationDate(targetMonth)

    // Filter: planned status (including makeup lessons for transport fee)
    // AND created before the confirmation date (otherwise billed next month)
    const billableLessons = lessons.filter((lesson) => {
        if (!lesson.created_at) return lesson.status === 'planned'
        const createdAt = new Date(lesson.created_at)
        return lesson.status === 'planned' && createdAt <= confirmationDate
    })

    const lessonFeeTotal = billableLessons.reduce(
        (sum, lesson) => sum + (lesson.amount || 0),
        0
    )

    const transportFeeTotal = billableLessons.reduce(
        (sum, lesson) => sum + (lesson.transport_fee || 0),
        0
    )

    // Calculate Adjustments from Previous Month
    let addedLessonsFee = 0
    let cancellationRefund = 0
    const adjustmentDetails: AdjustmentDetail[] = []

    prevMonthLessons.forEach((lesson) => {
        if (!lesson.created_at) return

        // Calculate the billing confirmation date for this lesson's month
        // (The date when it SHOULD have been billed)
        // e.g., Lesson in April -> Billed on March 20th
        const lessonDate = new Date(lesson.date)
        const billingDate = getConfirmationDate(lessonDate)
        const createdAt = new Date(lesson.created_at)

        const isCreatedAfterBilling = createdAt > billingDate

        if (lesson.status !== 'cancelled') {
            // 1. Added Lessons (created after billing date)
            // Includes both 'done' and 'planned' lessons that were added late
            if (isCreatedAfterBilling) {
                // Charge full amount
                const amount = (lesson.amount || 0) + (lesson.transport_fee || 0)
                addedLessonsFee += amount
                adjustmentDetails.push({
                    date: lesson.date,
                    type: 'added',
                    reason: '追加レッスン',
                    amount: amount
                })
            }
        } else if (lesson.status === 'cancelled') {
            // 2. Cancellations (created before billing date, so they were billed)
            if (!isCreatedAfterBilling) {
                const isTeacherReason = lesson.cancellation_reason?.includes('[Teacher Reason]')
                let refundAmount = 0
                let reason = ''

                if (isTeacherReason) {
                    // Teacher Reason: Refund Lesson Fee + Transport Fee
                    refundAmount = (lesson.amount || 0) + (lesson.transport_fee || 0)
                    reason = 'キャンセル返金（先生都合）'
                } else {
                    // Student Reason: Refund Transport Fee Only
                    refundAmount = (lesson.transport_fee || 0)
                    reason = 'キャンセル返金（生徒都合・交通費のみ）'
                }

                if (refundAmount > 0) {
                    cancellationRefund += refundAmount
                    adjustmentDetails.push({
                        date: lesson.date,
                        type: 'refund',
                        reason: reason,
                        amount: refundAmount
                    })
                }
            }
        }
    })

    const adjustmentsTotal = addedLessonsFee - cancellationRefund

    return {
        targetMonth,
        totalAmount: lessonFeeTotal + transportFeeTotal + adjustmentsTotal,
        lessonFeeTotal,
        transportFeeTotal,
        lessonCount: billableLessons.length,
        isConfirmed: isBillingConfirmed(targetMonth, currentDate),
        confirmationDate: getConfirmationDate(targetMonth),
        lessons: billableLessons,
        adjustments: {
            addedLessonsFee,
            cancellationRefund,
            total: adjustmentsTotal,
            details: adjustmentDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        }
    }
}

/**
 * Get the next month's billing info
 * @param lessons - Lessons for next month
 * @param currentDate - Current date
 * @returns BillingInfo for next month
 */
export function getNextMonthBillingInfo(
    lessons: Lesson[],
    currentDate: Date = new Date()
): BillingInfo {
    const nextMonth = addMonths(startOfMonth(currentDate), 1)
    return calculateBillingInfo(lessons, nextMonth, currentDate)
}
