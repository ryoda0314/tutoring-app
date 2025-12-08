// Pricing and business logic helpers for the tutoring app

// Constants
export const HOURLY_RATE = 3500 // JPY per hour

export const TRANSPORT_FEES: Record<string, number> = {
    '日暮里': 900,
    '蓮沼': 1500,
    'オンライン': 0,
}

/**
 * Calculate lesson amount based on hours
 * @param hours - Number of hours (e.g., 2 or 3)
 * @param hourlyRate - Hourly rate in JPY (from teacher settings)
 * @returns Lesson fee in JPY
 */
export function calculateLessonAmount(hours: number, hourlyRate: number = HOURLY_RATE): number {
    return Math.round(hours * hourlyRate)
}

/**
 * Calculate total lesson fee including transport
 * @param hours - Number of hours
 * @param transportFee - Transport fee in JPY
 * @returns Total fee in JPY
 */
export function calculateTotalLessonFee(hours: number, transportFee: number): number {
    return calculateLessonAmount(hours) + transportFee
}

/**
 * Get transport fee for a location
 * @param location - Location name (e.g., "日暮里", "蓮沼")
 * @returns Transport fee in JPY, or 0 if unknown
 */
export function getTransportFee(location: string | null): number {
    if (!location) return 0
    return TRANSPORT_FEES[location] ?? 0
}

/**
 * Format currency to JPY
 * @param amount - Amount in JPY
 * @returns Formatted string (e.g., "¥3,500")
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
    }).format(amount)
}

/**
 * Calculate hours from start and end time
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns Duration in hours
 */
export function calculateHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    return (endMinutes - startMinutes) / 60
}
