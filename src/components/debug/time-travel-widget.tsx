'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, RefreshCw, X } from 'lucide-react'

export function TimeTravelWidget() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [date, setDate] = useState('')
    const [originalDate, setOriginalDate] = useState('')

    useEffect(() => {
        // Read cookie on mount
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`
            const parts = value.split(`; ${name}=`)
            if (parts.length === 2) return parts.pop()?.split(';').shift()
            return undefined
        }

        const debugDate = getCookie('debug_date')
        const today = format(new Date(), 'yyyy-MM-dd')

        setOriginalDate(today)
        setDate(debugDate || today)
    }, [])

    const handleSetDate = () => {
        document.cookie = `debug_date=${date}; path=/; max-age=31536000` // 1 year
        router.refresh()
    }

    const handleReset = () => {
        const today = format(new Date(), 'yyyy-MM-dd')
        setDate(today)
        document.cookie = `debug_date=; path=/; max-age=0` // Delete cookie
        router.refresh()
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 bg-ink text-paper rounded-full shadow-lg hover:bg-ink/90 z-50 transition-all opacity-50 hover:opacity-100"
                title="Debug: Time Travel"
            >
                <Calendar size={24} />
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 bg-paper border border-paper-dark rounded-lg shadow-xl p-4 z-50 w-72 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-ink flex items-center gap-2">
                    <Calendar size={16} />
                    Time Travel
                </h3>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-ink-light hover:text-ink"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-ink-light">Current System Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSetDate}
                        className="flex-1 bg-ink text-paper text-sm py-2 rounded hover:bg-ink/90 transition-colors"
                    >
                        Apply
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-3 border border-paper-dark rounded hover:bg-paper-light text-ink-light"
                        title="Reset to Today"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {date !== originalDate && (
                    <p className="text-xs text-accent bg-accent-subtle/20 p-2 rounded">
                        ⚠️ Date overridden. System thinks it is {date}.
                    </p>
                )}
            </div>
        </div>
    )
}
