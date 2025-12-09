import { cookies } from 'next/headers'

/**
 * Get the current date, potentially overridden by a debug cookie
 * This is for Server Components
 */
export async function getCurrentDate(): Promise<Date> {
    const cookieStore = cookies()
    const debugDate = cookieStore.get('debug_date')

    if (debugDate && debugDate.value) {
        // Parse "YYYY-MM-DD"
        const [year, month, day] = debugDate.value.split('-').map(Number)
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // Return date object for that day (defaulting to start of day local time roughly)
            // Note: new Date(y, m-1, d) creates a date in local timezone of the server.
            // Ideally we want 00:00:00 of that day.
            return new Date(year, month - 1, day)
        }
    }

    return new Date()
}
