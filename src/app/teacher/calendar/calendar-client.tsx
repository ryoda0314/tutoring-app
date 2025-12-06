'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScheduleStatusBadge, LessonStatusBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/loading'
import type { Lesson, ScheduleRequest } from '@/types/database'
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    MapPin,
    User,
    Check,
    X,
} from 'lucide-react'

interface LessonWithStudent extends Lesson {
    student: { id: string; name: string }
}

interface ScheduleRequestWithStudent extends ScheduleRequest {
    student: { id: string; name: string }
}

export function TeacherCalendarClient() {
    const router = useRouter()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
    const [lessons, setLessons] = useState<LessonWithStudent[]>([])
    const [requests, setRequests] = useState<ScheduleRequestWithStudent[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch data for current month
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const supabase = createClient()

            const monthStart = startOfMonth(currentMonth)
            const monthEnd = endOfMonth(currentMonth)

            // Fetch lessons
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select(`
          *,
          student:students(id, name)
        `)
                .gte('date', format(monthStart, 'yyyy-MM-dd'))
                .lte('date', format(monthEnd, 'yyyy-MM-dd'))
                .neq('status', 'cancelled')
                .order('date')
                .order('start_time')

            // Fetch pending schedule requests
            const { data: requestsData } = await supabase
                .from('schedule_requests')
                .select(`
          *,
          student:students(id, name)
        `)
                .gte('date', format(monthStart, 'yyyy-MM-dd'))
                .lte('date', format(monthEnd, 'yyyy-MM-dd'))
                .in('status', ['requested', 'reproposed'])
                .order('date')
                .order('start_time')

            setLessons(lessonsData as LessonWithStudent[] || [])
            setRequests(requestsData as ScheduleRequestWithStudent[] || [])
            setLoading(false)
        }

        fetchData()
    }, [currentMonth])

    // Get days in current month
    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    })

    const firstDayOfMonth = startOfMonth(currentMonth).getDay()

    // Get events for a specific date
    const getEventsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayLessons = lessons.filter(l => l.date === dateStr)
        const dayRequests = requests.filter(r => r.date === dateStr)
        return { lessons: dayLessons, requests: dayRequests }
    }

    // Quick approve from calendar
    const handleQuickApprove = async (request: ScheduleRequestWithStudent) => {
        const supabase = createClient()

        // Calculate hours
        const [startH, startM] = request.start_time.split(':').map(Number)
        const [endH, endM] = request.end_time.split(':').map(Number)
        const hours = (endH * 60 + endM - startH * 60 - startM) / 60

        // Create lesson
        await supabase
            .from('lessons')
            .insert({
                student_id: request.student_id,
                date: request.date,
                start_time: request.start_time,
                end_time: request.end_time,
                hours,
                amount: Math.round(hours * 3500),
                transport_fee: request.location === '日暮里' ? 900 : request.location === '蓮沼' ? 1500 : 0,
                status: 'planned',
            })

        // Update request
        await supabase
            .from('schedule_requests')
            .update({ status: 'confirmed' })
            .eq('id', request.id)

        router.refresh()
        // Refetch
        setCurrentMonth(new Date(currentMonth)) // Trigger refetch
    }

    // Calendar day component
    const CalendarDay = ({ date }: { date: Date }) => {
        const { lessons: dayLessons, requests: dayRequests } = getEventsForDate(date)
        const isToday = isSameDay(date, new Date())
        const isSelected = selectedDate && isSameDay(date, selectedDate)
        const hasEvents = dayLessons.length > 0 || dayRequests.length > 0
        const isWeekend = date.getDay() === 0 || date.getDay() === 6

        return (
            <button
                onClick={() => setSelectedDate(date)}
                className={`
          relative p-1 sm:p-2 h-20 sm:h-24 rounded-lg text-left transition-all
          ${isToday ? 'ring-2 ring-ochre' : ''}
          ${isSelected ? 'bg-ink text-paper-light' : 'hover:bg-paper-dark/50'}
          ${isWeekend && !isSelected ? 'bg-paper-dark/20' : ''}
        `}
            >
                <span className={`text-sm font-medium ${isSelected ? 'text-paper-light' :
                        date.getDay() === 0 ? 'text-accent' :
                            date.getDay() === 6 ? 'text-ink-light' : ''
                    }`}>
                    {format(date, 'd')}
                </span>

                {/* Event indicators */}
                {hasEvents && (
                    <div className="mt-1 space-y-0.5">
                        {dayLessons.slice(0, 2).map((lesson) => (
                            <div
                                key={lesson.id}
                                className={`text-xs truncate px-1 py-0.5 rounded ${isSelected ? 'bg-paper-light/20' : 'bg-sage-subtle text-sage'
                                    }`}
                            >
                                {lesson.start_time.slice(0, 5)} {lesson.student?.name?.slice(0, 3)}
                            </div>
                        ))}
                        {dayRequests.slice(0, 1).map((request) => (
                            <div
                                key={request.id}
                                className={`text-xs truncate px-1 py-0.5 rounded ${isSelected ? 'bg-paper-light/30' : 'bg-ochre-subtle text-ochre'
                                    }`}
                            >
                                {request.start_time.slice(0, 5)} 申請
                            </div>
                        ))}
                        {(dayLessons.length + dayRequests.length) > 3 && (
                            <p className={`text-xs ${isSelected ? 'text-paper-light/70' : 'text-ink-faint'}`}>
                                +{dayLessons.length + dayRequests.length - 3}
                            </p>
                        )}
                    </div>
                )}
            </button>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">カレンダー</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card padding="none" className="lg:col-span-2">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between p-4 border-b border-paper-dark">
                        <button
                            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                            className="p-2 rounded-lg hover:bg-paper-dark transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="font-display text-lg">
                            {format(currentMonth, 'yyyy年M月', { locale: ja })}
                        </h2>
                        <button
                            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
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
                                    <div key={`empty-${i}`} className="h-20 sm:h-24" />
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
                <Card padding="none" className="h-fit">
                    <CardHeader className="p-4 border-b border-paper-dark">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar size={18} className="text-ochre" />
                            {selectedDate ? format(selectedDate, 'M月d日（E）', { locale: ja }) : '日付を選択'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {selectedDate ? (
                            (() => {
                                const { lessons: dayLessons, requests: dayRequests } = getEventsForDate(selectedDate)
                                const hasEvents = dayLessons.length > 0 || dayRequests.length > 0

                                if (!hasEvents) {
                                    return (
                                        <p className="text-ink-faint text-sm py-8 text-center">
                                            この日の予定はありません
                                        </p>
                                    )
                                }

                                return (
                                    <div className="space-y-4">
                                        {/* Lessons */}
                                        {dayLessons.map(lesson => (
                                            <Link
                                                key={lesson.id}
                                                href={`/teacher/lessons/${lesson.id}`}
                                                className="block p-3 rounded-lg bg-sage-subtle/30 border border-sage-subtle hover:bg-sage-subtle/50 transition-colors timeline-marker"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-ink flex items-center gap-1.5">
                                                        <User size={14} />
                                                        {lesson.student?.name}
                                                    </span>
                                                    <LessonStatusBadge status={lesson.status} />
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-ink-light">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}

                                        {/* Pending requests */}
                                        {dayRequests.map(request => (
                                            <div
                                                key={request.id}
                                                className="p-3 rounded-lg bg-ochre-subtle/30 border border-ochre-subtle"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-ink flex items-center gap-1.5">
                                                        <User size={14} />
                                                        {request.student?.name}
                                                    </span>
                                                    <ScheduleStatusBadge status={request.status} />
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-ink-light mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}
                                                    </span>
                                                    {request.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {request.location}
                                                        </span>
                                                    )}
                                                </div>

                                                {request.status === 'requested' && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            onClick={() => handleQuickApprove(request)}
                                                            className="flex-1"
                                                        >
                                                            <Check size={14} />
                                                            承認
                                                        </Button>
                                                        <Link href="/teacher/schedule-requests" className="flex-1">
                                                            <Button size="sm" variant="secondary" className="w-full">
                                                                詳細
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()
                        ) : (
                            <p className="text-ink-faint text-sm py-8 text-center">
                                カレンダーから日付を選択してください
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-ink-faint">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-sage-subtle border border-sage" />
                    <span>確定レッスン</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-ochre-subtle border border-ochre" />
                    <span>申請中</span>
                </div>
            </div>
        </div>
    )
}
