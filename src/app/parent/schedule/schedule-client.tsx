'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScheduleStatusBadge } from '@/components/ui/badge'
import { NaturalScheduleInput } from '@/components/schedule/natural-input'
import { Spinner } from '@/components/ui/loading'
import type { ScheduleRequest, Lesson } from '@/types/database'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar,
    X,
} from 'lucide-react'

interface ParentScheduleProps {
    studentId: string
}

export function ParentScheduleClient({ studentId }: ParentScheduleProps) {
    const router = useRouter()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [showRequestForm, setShowRequestForm] = useState(false)

    const [requests, setRequests] = useState<ScheduleRequest[]>([])
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const supabase = createClient()

            const monthStart = startOfMonth(currentMonth)
            const monthEnd = endOfMonth(currentMonth)

            // Fetch schedule requests for this month
            const { data: requestsData } = await supabase
                .from('schedule_requests')
                .select('*')
                .eq('student_id', studentId)
                .gte('date', format(monthStart, 'yyyy-MM-dd'))
                .lte('date', format(monthEnd, 'yyyy-MM-dd'))
                .order('date')

            // Fetch lessons for this month
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('*')
                .eq('student_id', studentId)
                .gte('date', format(monthStart, 'yyyy-MM-dd'))
                .lte('date', format(monthEnd, 'yyyy-MM-dd'))
                .order('date')

            setRequests(requestsData || [])
            setLessons(lessonsData || [])
            setLoading(false)
        }

        fetchData()
    }, [currentMonth, studentId])

    // Get days in current month
    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    })

    // Get first day of month to calculate offset
    const firstDayOfMonth = startOfMonth(currentMonth).getDay()

    // Get lessons and requests for a specific date
    const getEventsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayLessons = lessons.filter(l => l.date === dateStr && l.status !== 'cancelled')

        // Filter out requests that have a corresponding confirmed lesson
        const dayRequests = requests.filter(r => {
            if (r.date !== dateStr) return false

            // If request is confirmed, check if there's a matching lesson
            if (r.status === 'confirmed') {
                const hasMatchingLesson = dayLessons.some(l =>
                    l.start_time.slice(0, 5) === r.start_time.slice(0, 5) &&
                    l.end_time.slice(0, 5) === r.end_time.slice(0, 5)
                )
                // Hide confirmed requests if lesson exists
                return !hasMatchingLesson
            }

            return true // Show pending/rejected requests
        })

        return { lessons: dayLessons, requests: dayRequests }
    }

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    const handleSuccess = () => {
        setShowRequestForm(false)
        router.refresh()
    }

    // Calendar day component
    const CalendarDay = ({ date }: { date: Date }) => {
        const { lessons: dayLessons, requests: dayRequests } = getEventsForDate(date)
        const isToday = isSameDay(date, new Date())
        const isSelected = selectedDate && isSameDay(date, selectedDate)
        const hasEvents = dayLessons.length > 0 || dayRequests.length > 0

        return (
            <button
                onClick={() => setSelectedDate(date)}
                className={`
          relative p-2 h-16 sm:h-20 rounded-lg text-left transition-all
          ${isToday ? 'ring-2 ring-ochre' : ''}
          ${isSelected ? 'bg-ink text-paper-light' : 'hover:bg-paper-dark/50'}
        `}
            >
                <span className={`text-sm font-medium ${isSelected ? 'text-paper-light' : ''}`}>
                    {format(date, 'd')}
                </span>

                {hasEvents && (
                    <div className="absolute bottom-1 left-1 right-1 flex gap-0.5">
                        {dayLessons.filter(l => l.status !== 'cancelled').map((_, i) => (
                            <div
                                key={`lesson-${i}`}
                                className={`h-1.5 flex-1 rounded-full ${isSelected ? 'bg-paper-light/70' : 'bg-sage'}`}
                            />
                        ))}
                        {dayRequests.map((r, i) => (
                            <div
                                key={`request-${i}`}
                                className={`h-1.5 flex-1 rounded-full ${isSelected ? 'bg-paper-light/50' :
                                    r.status === 'confirmed' ? 'bg-sage' :
                                        r.status === 'rejected' ? 'bg-accent' :
                                            'bg-ochre'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </button>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with new request button */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-display text-ink">日程予約</h1>
                <Button
                    variant="primary"
                    onClick={() => setShowRequestForm(true)}
                >
                    <Plus size={18} />
                    新規リクエスト
                </Button>
            </div>

            {/* Request form modal */}
            <AnimatePresence>
                {showRequestForm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-ink/20 z-40"
                            onClick={() => setShowRequestForm(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-x-4 top-[10vh] bottom-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 overflow-auto"
                        >
                            <Card padding="lg" className="max-h-full overflow-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-display text-xl">日程をリクエスト</h2>
                                    <button
                                        onClick={() => setShowRequestForm(false)}
                                        className="p-2 rounded-lg hover:bg-paper-dark transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <NaturalScheduleInput
                                    studentId={studentId}
                                    onSuccess={handleSuccess}
                                />
                            </Card>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Calendar */}
            <Card padding="none">
                {/* Month navigation */}
                <div className="flex items-center justify-between p-4 border-b border-paper-dark">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded-lg hover:bg-paper-dark transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="font-display text-lg">
                        {format(currentMonth, 'yyyy年M月', { locale: ja })}
                    </h2>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded-lg hover:bg-paper-dark transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-paper-dark">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                        <div
                            key={day}
                            className={`p-2 text-center text-sm font-medium ${i === 0 ? 'text-accent' : i === 6 ? 'text-ink-light' : 'text-ink-light'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1">
                            {/* Empty cells for offset */}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-16 sm:h-20" />
                            ))}

                            {/* Days */}
                            {monthDays.map(date => (
                                <CalendarDay key={date.toISOString()} date={date} />
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Selected date detail */}
            <AnimatePresence>
                {selectedDate && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar size={18} className="text-ochre" />
                                    {format(selectedDate, 'M月d日（E）', { locale: ja })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    const { lessons: dayLessons, requests: dayRequests } = getEventsForDate(selectedDate)
                                    const hasEvents = dayLessons.length > 0 || dayRequests.length > 0

                                    if (!hasEvents) {
                                        return (
                                            <p className="text-ink-faint text-sm py-4 text-center">
                                                この日の予定はありません
                                            </p>
                                        )
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {dayLessons.map(lesson => (
                                                <div
                                                    key={lesson.id}
                                                    className="p-3 rounded-lg bg-sage-subtle/30 border border-sage-subtle"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-ink">
                                                            確定レッスン
                                                        </span>
                                                        <span className="text-xs text-sage font-medium">
                                                            {lesson.hours}時間
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-ink-light">
                                                        {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                                    </p>
                                                </div>
                                            ))}

                                            {dayRequests.map(request => (
                                                <div
                                                    key={request.id}
                                                    className={`p-3 rounded-lg ${request.status === 'confirmed'
                                                        ? 'bg-sage-subtle/30 border border-sage-subtle'
                                                        : request.status === 'rejected'
                                                            ? 'bg-accent-subtle/30 border border-accent-subtle'
                                                            : 'bg-ochre-subtle/30 border border-ochre-subtle'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-ink">
                                                            日程リクエスト
                                                        </span>
                                                        <ScheduleStatusBadge status={request.status} />
                                                    </div>
                                                    <p className="text-sm text-ink-light">
                                                        {request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}
                                                        {request.location && ` @ ${request.location}`}
                                                    </p>
                                                    {request.memo && (
                                                        <p className="text-xs text-ink-faint mt-1">{request.memo}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })()}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-ink-faint">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-sage" />
                    <span>確定</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-ochre" />
                    <span>申請中</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span>却下</span>
                </div>
            </div>
        </div>
    )
}
