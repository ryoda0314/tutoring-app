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
import type { Lesson, ScheduleRequest, MakeupCredit, LessonStatus, ScheduleRequestStatus, Student, StudentLocation } from '@/types/database'
import { HOURLY_RATE, calculateHours } from '@/lib/pricing'
import { Input, Select } from '@/components/ui/input'
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    MapPin,
    User,
    Check,
    X,
    Plus,
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
    const [hourlyRate, setHourlyRate] = useState<number>(HOURLY_RATE)

    // New: State for students and lesson creation
    const [students, setStudents] = useState<Student[]>([])
    const [studentLocations, setStudentLocations] = useState<Record<string, StudentLocation[]>>({})
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [createForm, setCreateForm] = useState({
        studentId: '',
        startTime: '14:00',
        endTime: '16:00',
        location: '',
    })

    // Fetch data for current month
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const supabase = createClient()

            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            const monthStart = startOfMonth(currentMonth)
            const monthEnd = endOfMonth(currentMonth)

            // Fetch lessons
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select(`
          *,
          student:students!inner(id, name, teacher_id)
        `)
                .eq('student.teacher_id', user.id)
                .gte('date', format(monthStart, 'yyyy-MM-dd'))
                .lte('date', format(monthEnd, 'yyyy-MM-dd'))
                .neq('status', 'cancelled')
                .order('date')
                .order('start_time') as { data: any[] | null }

            // Fetch pending schedule requests
            const { data: requestsData } = await supabase
                .from('schedule_requests')
                .select(`
          *,
          student:students!inner(id, name, teacher_id)
        `)
                .eq('student.teacher_id', user.id)
                .gte('date', format(monthStart, 'yyyy-MM-dd'))
                .lte('date', format(monthEnd, 'yyyy-MM-dd'))
                .in('status', ['requested', 'reproposed'])
                .order('date')
                .order('start_time') as { data: any[] | null }

            setLessons(lessonsData as LessonWithStudent[] || [])
            setRequests(requestsData as ScheduleRequestWithStudent[] || [])
            setLoading(false)
        }

        fetchData()
        // Fetch teacher settings for hourly rate
        const fetchSettings = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: settings } = await (supabase
                .from('teacher_settings') as any)
                .select('lesson_price')
                .eq('teacher_id', user.id)
                .single()
            if (settings?.lesson_price) {
                setHourlyRate(settings.lesson_price)
            }
        }
        fetchSettings()
    }, [currentMonth])

    // Fetch students for lesson creation
    useEffect(() => {
        const fetchStudents = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch all students for this teacher
            const { data: studentsData } = await supabase
                .from('students')
                .select('*')
                .eq('teacher_id', user.id)
                .order('name')

            setStudents(studentsData as Student[] || [])

            // Fetch locations for each student
            if (studentsData) {
                const locationsMap: Record<string, StudentLocation[]> = {}
                const typedStudents = studentsData as Student[]
                for (const student of typedStudents) {
                    const { data: locs } = await (supabase
                        .from('student_locations') as any)
                        .select('*')
                        .eq('student_id', student.id)
                    locationsMap[student.id] = (locs as StudentLocation[]) || []
                }
                setStudentLocations(locationsMap)
            }
        }
        fetchStudents()
    }, [])

    // Handle creating a new lesson
    const handleCreateLesson = async () => {
        if (!selectedDate || !createForm.studentId) return

        setCreateLoading(true)
        const supabase = createClient()

        try {
            const hours = calculateHours(createForm.startTime, createForm.endTime)
            if (hours <= 0) {
                setCreateLoading(false)
                return
            }

            // Get transport fee from location
            let transportFee = 0
            if (createForm.location) {
                const locations = studentLocations[createForm.studentId] || []
                const loc = locations.find((l: StudentLocation) => l.name === createForm.location)
                if (loc) {
                    transportFee = loc.transportation_fee || 0
                }
            }

            const { error } = await (supabase
                .from('lessons') as any)
                .insert({
                    student_id: createForm.studentId,
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    start_time: createForm.startTime,
                    end_time: createForm.endTime,
                    hours,
                    amount: Math.round(hours * hourlyRate),
                    transport_fee: transportFee,
                    status: 'planned',
                    is_makeup: false,
                })

            if (error) throw error

            // Reset form and close modal
            setShowCreateModal(false)
            setCreateForm({
                studentId: '',
                startTime: '14:00',
                endTime: '16:00',
                location: '',
            })

            // Trigger refetch
            setCurrentMonth(new Date(currentMonth))
        } catch (err) {
            console.error('Error creating lesson:', err)
        } finally {
            setCreateLoading(false)
        }
    }

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

        // Filter out requests that overlap with existing lessons (same date and similar time)
        const dayRequests = requests.filter(r => {
            if (r.date !== dateStr) return false

            // Check if there's a lesson at the same time slot
            const hasMatchingLesson = dayLessons.some(l =>
                l.start_time.slice(0, 5) === r.start_time.slice(0, 5) &&
                l.end_time.slice(0, 5) === r.end_time.slice(0, 5)
            )

            // Only show request if no matching lesson exists
            return !hasMatchingLesson
        })

        return { lessons: dayLessons, requests: dayRequests }
    }

    // Quick approve from calendar
    const handleQuickApprove = async (request: ScheduleRequestWithStudent) => {
        const supabase = createClient()

        // Calculate hours and minutes
        const [startH, startM] = request.start_time.split(':').map(Number)
        const [endH, endM] = request.end_time.split(':').map(Number)
        const totalMinutes = endH * 60 + endM - startH * 60 - startM
        const hours = totalMinutes / 60

        // Check if this is a makeup request (memo contains 【振替申請】)
        const isMakeupRequest = request.memo?.includes('【振替申請】')

        // If makeup request, deduct from makeup credits
        if (isMakeupRequest) {
            // Get available makeup credits (oldest first)
            const { data: credits } = await (supabase
                .from('makeup_credits') as any)
                .select('*')
                .eq('student_id', request.student_id)
                .gt('total_minutes', 0)
                .gt('expires_at', new Date().toISOString())
                .order('expires_at', { ascending: true }) as { data: MakeupCredit[] | null }

            if (credits && credits.length > 0) {
                let remainingToDeduct = totalMinutes

                for (const credit of credits) {
                    if (remainingToDeduct <= 0) break

                    const deductAmount = Math.min(credit.total_minutes, remainingToDeduct)
                    const newTotal = credit.total_minutes - deductAmount

                    await (supabase
                        .from('makeup_credits') as any)
                        .update({ total_minutes: newTotal })
                        .eq('id', credit.id)

                    remainingToDeduct -= deductAmount
                }
            }
        }

        // Calculate transport fee
        let transportFee = 0
        if (request.location) {
            // Try to find matching location from student_locations
            const { data: locationData } = await (supabase
                .from('student_locations') as any)
                .select('transportation_fee')
                .eq('student_id', request.student_id)
                .eq('name', request.location)
                .single()

            if (locationData && locationData.transportation_fee !== null) {
                transportFee = locationData.transportation_fee
            } else {
                // Fallback to hardcoded values (legacy support)
                transportFee = request.location === '日暮里' ? 900 : request.location === '蓮沼' ? 1500 : 0
            }
        }

        // Create lesson (for makeup: amount = 0)
        await (supabase
            .from('lessons') as any)
            .insert({
                student_id: request.student_id,
                date: request.date,
                start_time: request.start_time,
                end_time: request.end_time,
                hours,
                amount: isMakeupRequest ? 0 : Math.round(hours * hourlyRate),
                transport_fee: transportFee,
                status: 'planned',
                is_makeup: isMakeupRequest || false,
            })

        // Update request
        await (supabase
            .from('schedule_requests') as any)
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

                                return (
                                    <div className="space-y-4">
                                        {!hasEvents && (
                                            <p className="text-ink-faint text-sm py-4 text-center">
                                                この日の予定はありません
                                            </p>
                                        )}

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
                                                    <LessonStatusBadge status={(lesson.status || 'planned') as LessonStatus} />
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
                                                    <ScheduleStatusBadge status={(request.status || 'requested') as ScheduleRequestStatus} />
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

                                        {/* Add lesson button */}
                                        <Button
                                            variant="secondary"
                                            className="w-full"
                                            onClick={() => setShowCreateModal(true)}
                                        >
                                            <Plus size={16} />
                                            予定を追加
                                        </Button>
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

            {/* Create Lesson Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-paper rounded-xl shadow-xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-lg font-display mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-ochre" />
                                授業を追加
                            </h2>

                            <div className="space-y-4">
                                {/* Date display */}
                                <div className="p-3 bg-paper-dark/30 rounded-lg text-center">
                                    <span className="font-medium">
                                        {selectedDate && format(selectedDate, 'yyyy年M月d日（E）', { locale: ja })}
                                    </span>
                                </div>

                                {/* Student select */}
                                <Select
                                    label="生徒"
                                    value={createForm.studentId}
                                    onChange={(e) => {
                                        setCreateForm(prev => ({
                                            ...prev,
                                            studentId: e.target.value,
                                            location: '', // Reset location when student changes
                                        }))
                                    }}
                                    options={[
                                        { value: '', label: '選択してください' },
                                        ...students.map(s => ({ value: s.id, label: s.name }))
                                    ]}
                                />

                                {/* Time inputs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="開始時間"
                                        type="time"
                                        value={createForm.startTime}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                                    />
                                    <Input
                                        label="終了時間"
                                        type="time"
                                        value={createForm.endTime}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                                    />
                                </div>

                                {/* Location select */}
                                {createForm.studentId && studentLocations[createForm.studentId]?.length > 0 && (
                                    <Select
                                        label="場所"
                                        value={createForm.location}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                                        options={[
                                            { value: '', label: '選択してください' },
                                            ...studentLocations[createForm.studentId].map(loc => ({
                                                value: loc.name,
                                                label: loc.transportation_fee
                                                    ? `${loc.name}（交通費: ¥${loc.transportation_fee.toLocaleString()}）`
                                                    : loc.name
                                            }))
                                        ]}
                                    />
                                )}

                                {/* Preview */}
                                {createForm.studentId && (
                                    <div className="p-3 bg-sage-subtle/30 rounded-lg text-sm">
                                        <p className="text-ink-light">
                                            授業時間: {calculateHours(createForm.startTime, createForm.endTime)} 時間
                                        </p>
                                        <p className="text-ink-light">
                                            授業料: ¥{Math.round(calculateHours(createForm.startTime, createForm.endTime) * hourlyRate).toLocaleString()}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        variant="primary"
                                        className="flex-1"
                                        onClick={handleCreateLesson}
                                        isLoading={createLoading}
                                        disabled={!createForm.studentId || createLoading}
                                    >
                                        <Check size={16} />
                                        作成
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
