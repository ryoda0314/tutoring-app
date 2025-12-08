'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { formatMakeupTime } from '@/lib/makeup'
import {
    Clock,
    CalendarDays,
    MapPin,
    Check,
    AlertCircle,
} from 'lucide-react'

interface MakeupCredit {
    id: string
    total_minutes: number
    expires_at: string
}

interface MakeupRequestFormProps {
    studentId: string
    makeupCredits: MakeupCredit[]
}

const locationOptions = [
    { value: '日暮里', label: '日暮里' },
    { value: '蓮沼', label: '蓮沼' },
    { value: 'オンライン', label: 'オンライン' },
]

const durationOptions = [
    { value: 60, label: '1時間' },
    { value: 90, label: '1.5時間' },
    { value: 120, label: '2時間' },
]

export function MakeupRequestForm({ studentId, makeupCredits }: MakeupRequestFormProps) {
    const router = useRouter()
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [duration, setDuration] = useState(60)
    const [location, setLocation] = useState('日暮里')
    const [memo, setMemo] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const totalMakeupMinutes = makeupCredits.reduce((sum, c) => sum + c.total_minutes, 0)

    const calculateEndTime = (start: string, durationMin: number) => {
        if (!start) return ''
        const [hours, minutes] = start.split(':').map(Number)
        const endMinutes = hours * 60 + minutes + durationMin
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (duration > totalMakeupMinutes) {
            setError('振替時間が不足しています')
            setLoading(false)
            return
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('ログインが必要です')
            setLoading(false)
            return
        }

        const endTime = calculateEndTime(startTime, duration)

        // Create schedule request with makeup flag
        const { error: requestError } = await supabase
            .from('schedule_requests')
            .insert({
                student_id: studentId,
                requested_by: user.id,
                date: date,
                start_time: startTime,
                end_time: endTime,
                location: location,
                memo: `【振替申請】${memo}`.trim(),
                status: 'requested',
            })

        if (requestError) {
            console.error('Request error:', requestError)
            setError('申請に失敗しました')
            setLoading(false)
            return
        }

        setSuccess(true)
        setTimeout(() => {
            router.push('/parent/schedule')
            router.refresh()
        }, 2000)
    }

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-8 text-center"
            >
                <div className="w-20 h-20 mx-auto mb-6 bg-sage-subtle rounded-full flex items-center justify-center">
                    <Check size={40} className="text-sage" />
                </div>
                <h2 className="text-xl font-display text-ink mb-2">申請完了！</h2>
                <p className="text-ink-light">先生の確認をお待ちください</p>
            </motion.div>
        )
    }

    const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    return (
        <div className="space-y-6">
            {/* Remaining credits */}
            <Card padding="md" className="bg-ochre-subtle/30 border-ochre-subtle">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-ochre/20 flex items-center justify-center">
                        <Clock size={24} className="text-ochre" />
                    </div>
                    <div>
                        <p className="text-sm text-ochre">使用可能な振替時間</p>
                        <p className="text-2xl font-display text-ink">
                            {formatMakeupTime(totalMakeupMinutes)}
                        </p>
                    </div>
                </div>
            </Card>

            {totalMakeupMinutes < 60 ? (
                <Card padding="lg" className="text-center">
                    <AlertCircle size={40} className="mx-auto mb-4 text-ink-faint" />
                    <p className="text-ink-light">
                        振替時間が不足しています（最低1時間必要）
                    </p>
                </Card>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <Card padding="md">
                        <div className="space-y-5">
                            {/* Date */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-ink-light mb-2">
                                    <CalendarDays size={16} />
                                    希望日
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={minDate}
                                    className="input"
                                    required
                                />
                            </div>

                            {/* Time */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-ink-light mb-2">
                                    <Clock size={16} />
                                    開始時間
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-ink-light mb-2">
                                    レッスン時間
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {durationOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            disabled={opt.value > totalMakeupMinutes}
                                            onClick={() => setDuration(opt.value)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${duration === opt.value
                                                    ? 'bg-ink text-paper-light'
                                                    : 'bg-paper-dark text-ink-light hover:bg-paper-dark/70'
                                                } ${opt.value > totalMakeupMinutes ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-ink-faint mt-2">
                                    申請後、{formatMakeupTime(duration)}が差し引かれます
                                </p>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-ink-light mb-2">
                                    <MapPin size={16} />
                                    場所
                                </label>
                                <select
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="input"
                                >
                                    {locationOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Memo */}
                            <div>
                                <label className="block text-sm font-medium text-ink-light mb-2">
                                    メモ（任意）
                                </label>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    className="input min-h-[80px]"
                                    placeholder="ご希望があれば..."
                                />
                            </div>
                        </div>
                    </Card>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-accent-subtle rounded-lg">
                            <AlertCircle size={16} className="text-accent" />
                            <p className="text-sm text-accent">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !date || !startTime}
                        className="btn btn-primary w-full py-3 disabled:opacity-50"
                    >
                        {loading ? '申請中...' : '振替レッスンを申請'}
                    </button>
                </form>
            )}
        </div>
    )
}
