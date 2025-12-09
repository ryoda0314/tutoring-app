'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { ScheduleStatusBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/loading'
import { calculateLessonAmount, getTransportFee, calculateHours, HOURLY_RATE } from '@/lib/pricing'
import type { ScheduleRequest, ScheduleRequestStatus, MakeupCredit } from '@/types/database'
import {
    Check,
    X,
    Clock,
    MessageSquare,
    Calendar,
    MapPin,
    User,
    AlertCircle,
    RefreshCcw,
} from 'lucide-react'

interface ScheduleRequestWithStudent extends ScheduleRequest {
    student: { id: string; name: string }
}

type FilterStatus = 'all' | ScheduleRequestStatus

export function ScheduleRequestsClient() {
    const router = useRouter()
    const [requests, setRequests] = useState<ScheduleRequestWithStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<FilterStatus>('requested')
    const [selectedRequest, setSelectedRequest] = useState<ScheduleRequestWithStudent | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // For repropose modal
    const [showReproposeModal, setShowReproposeModal] = useState(false)
    const [proposeDate, setProposeDate] = useState('')
    const [proposeStartTime, setProposeStartTime] = useState('')
    const [proposeEndTime, setProposeEndTime] = useState('')
    const [proposeLocation, setProposeLocation] = useState('')
    const [proposeMemo, setProposeMemo] = useState('')

    // Hourly rate from teacher settings
    const [hourlyRate, setHourlyRate] = useState<number>(HOURLY_RATE)

    // Fetch requests
    const fetchRequests = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setLoading(false)
            return
        }

        let query = supabase
            .from('schedule_requests')
            .select(`
        *,
        student:students!inner(id, name, teacher_id)
      `)
            .eq('student.teacher_id', user.id)
            .order('created_at', { ascending: false })

        if (filter !== 'all') {
            query = query.eq('status', filter)
        }

        const { data, error } = await query as { data: any[] | null; error: any }

        if (error) {
            console.error('Fetch error:', error)
            setError('リクエストの取得に失敗しました')
        } else {
            setRequests(data as ScheduleRequestWithStudent[] || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchRequests()
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
    }, [filter])

    // Approve request - create lesson
    const handleApprove = async (request: ScheduleRequestWithStudent) => {
        setActionLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            // Calculate lesson details
            const hours = calculateHours(request.start_time.slice(0, 5), request.end_time.slice(0, 5))
            const totalMinutes = hours * 60

            // Check if this is a makeup request
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

            const amount = isMakeupRequest ? 0 : calculateLessonAmount(hours, hourlyRate)
            // Calculate transport fee
            let transportFee = getTransportFee(request.location) // Default fallback

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
                }
            }

            // Create lesson
            const { error: lessonError } = await (supabase
                .from('lessons') as any)
                .insert({
                    student_id: request.student_id,
                    date: request.date,
                    start_time: request.start_time,
                    end_time: request.end_time,
                    hours,
                    amount,
                    transport_fee: transportFee,
                    status: 'planned',
                    is_makeup: isMakeupRequest || false,
                })

            if (lessonError) throw lessonError

            // Update request status
            const { error: updateError } = await (supabase
                .from('schedule_requests') as any)
                .update({ status: 'confirmed' })
                .eq('id', request.id)

            if (updateError) throw updateError

            // Refresh
            fetchRequests()
            setSelectedRequest(null)
            router.refresh()
        } catch (err) {
            console.error('Approve error:', err)
            setError('承認処理に失敗しました')
        } finally {
            setActionLoading(false)
        }
    }

    // Reject request
    const handleReject = async (request: ScheduleRequestWithStudent) => {
        setActionLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            const { error: updateError } = await (supabase
                .from('schedule_requests') as any)
                .update({ status: 'rejected' })
                .eq('id', request.id)

            if (updateError) throw updateError

            fetchRequests()
            setSelectedRequest(null)
            router.refresh()
        } catch (err) {
            console.error('Reject error:', err)
            setError('却下処理に失敗しました')
        } finally {
            setActionLoading(false)
        }
    }

    // Repropose new time
    const handleOpenRepropose = (request: ScheduleRequestWithStudent) => {
        setSelectedRequest(request)
        setProposeDate(request.date)
        setProposeStartTime(request.start_time.slice(0, 5))
        setProposeEndTime(request.end_time.slice(0, 5))
        setProposeLocation(request.location || '')
        setProposeMemo('')
        setShowReproposeModal(true)
    }

    const handleRepropose = async () => {
        if (!selectedRequest || !proposeDate || !proposeStartTime || !proposeEndTime) return

        setActionLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            // Update the existing request
            const { error: updateError } = await (supabase
                .from('schedule_requests') as any)
                .update({
                    date: proposeDate,
                    start_time: proposeStartTime + ':00',
                    end_time: proposeEndTime + ':00',
                    location: proposeLocation || null,
                    memo: proposeMemo || selectedRequest.memo,
                    status: 'reproposed',
                    requested_by: 'teacher',
                })
                .eq('id', selectedRequest.id)

            if (updateError) throw updateError

            setShowReproposeModal(false)
            fetchRequests()
            setSelectedRequest(null)
            router.refresh()
        } catch (err) {
            console.error('Repropose error:', err)
            setError('日程提案に失敗しました')
        } finally {
            setActionLoading(false)
        }
    }

    // Filter tabs
    const filterOptions: { value: FilterStatus; label: string; count?: number }[] = [
        { value: 'requested', label: '新規申請' },
        { value: 'reproposed', label: '再提案' },
        { value: 'confirmed', label: '確定' },
        { value: 'rejected', label: '却下' },
        { value: 'all', label: 'すべて' },
    ]

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">日程リクエスト</h1>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {filterOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setFilter(opt.value)}
                        className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${filter === opt.value
                                ? 'bg-ink text-paper-light'
                                : 'bg-paper-light text-ink-light hover:bg-paper-dark'
                            }
            `}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Error display */}
            {error && (
                <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} className="text-accent" />
                    <p className="text-sm text-accent">{error}</p>
                </div>
            )}

            {/* Request list */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Spinner />
                </div>
            ) : requests.length === 0 ? (
                <Card padding="lg" className="text-center">
                    <Calendar size={48} className="mx-auto mb-4 text-ink-faint" />
                    <p className="text-ink-light">
                        {filter === 'all' ? 'リクエストがありません' : `「${filterOptions.find(o => o.value === filter)?.label}」のリクエストはありません`}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.map((request, index) => (
                        <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card
                                padding="md"
                                className={`
                  ${request.status === 'requested' ? 'border-ochre' : ''}
                  ${selectedRequest?.id === request.id ? 'ring-2 ring-ochre' : ''}
                `}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User size={16} className="text-ink-light" />
                                            <span className="font-medium text-ink">
                                                {request.student?.name || '?'}
                                            </span>
                                        </div>
                                        <ScheduleStatusBadge status={(request.status || 'requested') as ScheduleRequestStatus} />
                                    </div>
                                    <span className="text-xs text-ink-faint">
                                        {request.requested_by === 'parent' ? '保護者より' : '先生より'}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar size={14} className="text-ink-light" />
                                        <span>{format(new Date(request.date), 'M/d（E）', { locale: ja })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock size={14} className="text-ink-light" />
                                        <span>{request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}</span>
                                    </div>
                                    {request.location && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin size={14} className="text-ink-light" />
                                            <span>{request.location}</span>
                                        </div>
                                    )}
                                    {request.memo && (
                                        <p className="text-xs text-ink-faint mt-2 p-2 bg-paper rounded">
                                            {request.memo}
                                        </p>
                                    )}
                                </div>

                                {/* Actions for pending requests */}
                                {request.status === 'requested' && (
                                    <div className="flex gap-2 pt-3 border-t border-paper-dark">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => handleApprove(request)}
                                            disabled={actionLoading}
                                            className="flex-1"
                                        >
                                            <Check size={14} />
                                            承認
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleOpenRepropose(request)}
                                            disabled={actionLoading}
                                            className="flex-1"
                                        >
                                            <RefreshCcw size={14} />
                                            再提案
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleReject(request)}
                                            disabled={actionLoading}
                                            className="text-accent hover:bg-accent-subtle"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                )}

                                {/* Actions for reproposed requests (teacher's own) */}
                                {request.status === 'reproposed' && request.requested_by === 'teacher' && (
                                    <p className="text-xs text-ink-faint pt-3 border-t border-paper-dark">
                                        保護者の返答待ち
                                    </p>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Repropose Modal */}
            <AnimatePresence>
                {showReproposeModal && selectedRequest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-ink/20 z-40"
                            onClick={() => setShowReproposeModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-x-4 top-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50"
                        >
                            <Card padding="lg">
                                <h2 className="font-display text-xl mb-4">日程を再提案</h2>
                                <p className="text-sm text-ink-light mb-6">
                                    {selectedRequest.student?.name}さんへの新しい日程を提案します
                                </p>

                                <div className="space-y-4">
                                    <Input
                                        type="date"
                                        label="日付"
                                        value={proposeDate}
                                        onChange={(e) => setProposeDate(e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            type="time"
                                            label="開始時刻"
                                            value={proposeStartTime}
                                            onChange={(e) => setProposeStartTime(e.target.value)}
                                        />
                                        <Input
                                            type="time"
                                            label="終了時刻"
                                            value={proposeEndTime}
                                            onChange={(e) => setProposeEndTime(e.target.value)}
                                        />
                                    </div>
                                    <Input
                                        label="場所"
                                        value={proposeLocation}
                                        onChange={(e) => setProposeLocation(e.target.value)}
                                        placeholder="日暮里、蓮沼、オンライン など"
                                    />
                                    <Textarea
                                        label="メモ（任意）"
                                        value={proposeMemo}
                                        onChange={(e) => setProposeMemo(e.target.value)}
                                        placeholder="保護者への連絡事項"
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowReproposeModal(false)}
                                        className="flex-1"
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleRepropose}
                                        isLoading={actionLoading}
                                        className="flex-1"
                                    >
                                        提案を送信
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
