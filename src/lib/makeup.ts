// Makeup credit (振替) management helpers

import { addMonths } from 'date-fns'

// Constants
export const MINUTES_PER_LESSON_HOUR = 60

/**
 * Calculate expiration date for makeup credit
 * @param originalLessonDate - Date of the cancelled lesson
 * @returns Expiration date (1 month after)
 */
export function calculateExpirationDate(originalLessonDate: Date): Date {
    return addMonths(originalLessonDate, 1)
}

/**
 * Convert minutes to hours for display
 * @param minutes - Total minutes
 * @returns Hours (e.g., 2.0, 1.5)
 */
export function minutesToHours(minutes: number): number {
    return minutes / MINUTES_PER_LESSON_HOUR
}

/**
 * Convert hours to minutes for storage
 * @param hours - Hours
 * @returns Minutes
 */
export function hoursToMinutes(hours: number): number {
    return Math.round(hours * MINUTES_PER_LESSON_HOUR)
}

/**
 * Format makeup time for display
 * @param minutes - Total minutes
 * @returns Formatted string (e.g., "2時間", "1時間30分")
 */
export function formatMakeupTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
        return `${hours}時間`
    }

    if (hours === 0) {
        return `${remainingMinutes}分`
    }

    return `${hours}時間${remainingMinutes}分`
}

/**
 * Check if makeup credit is expired
 * @param expiresAt - Expiration date
 * @returns true if expired
 */
export function isMakeupCreditExpired(expiresAt: Date | string): boolean {
    const expiration = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    return expiration < new Date()
}

/**
 * Calculate remaining days until expiration
 * @param expiresAt - Expiration date
 * @returns Days remaining (negative if expired)
 */
export function daysUntilExpiration(expiresAt: Date | string): number {
    const expiration = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    const now = new Date()
    const diffTime = expiration.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format expiration status for display
 * @param expiresAt - Expiration date
 * @returns Status string (e.g., "あと5日", "期限切れ")
 */
export function formatExpirationStatus(expiresAt: Date | string): string {
    const days = daysUntilExpiration(expiresAt)

    if (days < 0) {
        return '期限切れ'
    }

    if (days === 0) {
        return '本日期限'
    }

    if (days === 1) {
        return '明日期限'
    }

    if (days <= 7) {
        return `あと${days}日`
    }

    const expiration = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    return `${expiration.getMonth() + 1}月${expiration.getDate()}日まで`
}
