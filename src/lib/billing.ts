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

/**
 * Calculate billing total from lessons
 * Only includes planned lessons that are not makeup lessons
 * @param lessons - Array of lessons
 * @returns BillingInfo object
 */
export function calculateBillingInfo(
    lessons: Lesson[],
    targetMonth: Date,
    currentDate: Date = new Date()
): BillingInfo {
    // Filter: planned status AND not makeup
    const billableLessons = lessons.filter(
        (lesson) => lesson.status === 'planned' && !lesson.is_makeup
    )

    const lessonFeeTotal = billableLessons.reduce(
        (sum, lesson) => sum + (lesson.amount || 0),
        0
    )

    const transportFeeTotal = billableLessons.reduce(
        (sum, lesson) => sum + (lesson.transport_fee || 0),
        0
    )

    return {
        targetMonth,
        totalAmount: lessonFeeTotal + transportFeeTotal,
        lessonFeeTotal,
        transportFeeTotal,
        lessonCount: billableLessons.length,
        isConfirmed: isBillingConfirmed(targetMonth, currentDate),
        confirmationDate: getConfirmationDate(targetMonth),
        lessons: billableLessons,
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
