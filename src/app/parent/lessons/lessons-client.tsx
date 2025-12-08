'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { LessonStatusBadge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/pricing'
import type { Lesson, LessonStatus } from '@/types/database'
import {
    BookOpen,
    Calendar,
    Clock,
    X,
    AlertTriangle,
    Loader2,
    CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LessonsClientProps {
    upcomingLessons: Lesson[]
    pastLessons: Lesson[]
}

export function LessonsClient({ upcomingLessons: initialUpcoming, pastLessons }: LessonsClientProps) {
    const router = useRouter()
    const [upcomingLessons, setUpcomingLessons] = useState(initialUpcoming)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
    const [cancelReason, setCancelReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleOpenCancelModal = (lesson: Lesson) => {
        setSelectedLesson(lesson)
        setCancelReason('')
        setError(null)
        setShowCancelModal(true)
    }

    const handleCancelRequest = async () => {
        if (!selectedLesson) return

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { error: updateError } = await (supabase
                .from('lessons') as any)
                .update({
                    cancellation_requested_at: new Date().toISOString(),
                    cancellation_reason: cancelReason || null,
                })
                .eq('id', selectedLesson.id)

            if (updateError) throw updateError

            // Update local state
            setUpcomingLessons(prev =>
                prev.map(l =>
                    l.id === selectedLesson.id
                        ? { ...l, cancellation_requested_at: new Date().toISOString(), cancellation_reason: cancelReason }
                        : l
                )
            )

            setShowCancelModal(false)
            router.refresh()
        } catch (err) {
            console.error('Cancellation request error:', err)
            setError('キャンセル申請に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const getCancellationStatus = (lesson: Lesson) => {
        if (lesson.cancellation_processed_at) {
            return lesson.status === 'cancelled' ? 'approved' : 'rejected'
        }
        if (lesson.cancellation_requested_at) {
            return 'pending'
        }
        return null
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">レッスン履歴</h1>

            {/* Upcoming lessons */}
            {upcomingLessons.length > 0 && (
                <Card padding="none">
                    <CardHeader className="p-4 border-b border-paper-dark">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar size={18} className="text-sage" />
                            今後のレッスン
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {upcomingLessons.map(lesson => {
                                const cancellationStatus = getCancellationStatus(lesson)

                                return (
                                    <div
                                        key={lesson.id}
                                        className={`p-3 rounded-lg border timeline-marker ${cancellationStatus === 'pending'
                                            ? 'bg-accent-subtle/30 border-accent-subtle'
                                            : 'bg-sage-subtle/30 border-sage-subtle'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-ink">
                                                {format(new Date(lesson.date), 'M月d日（E）', { locale: ja })}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {cancellationStatus === 'pending' && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-paper font-medium">
                                                        キャンセル申請中
                                                    </span>
                                                )}
                                                <LessonStatusBadge status={(lesson.status || 'planned') as LessonStatus} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-ink-light">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                            </span>
                                            <span>{lesson.hours}時間</span>
                                        </div>

                                        {/* Cancellation reason if pending */}
                                        {cancellationStatus === 'pending' && lesson.cancellation_reason && (
                                            <p className="text-xs text-accent mt-2">
                                                理由: {lesson.cancellation_reason}
                                            </p>
                                        )}

                                        {/* Cancel button if not already requested */}
                                        {!cancellationStatus && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => handleOpenCancelModal(lesson)}
                                                    className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
                                                >
                                                    <X size={12} />
                                                    キャンセルを申請する
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Past lessons */}
            <Card padding="none">
                <CardHeader className="p-4 border-b border-paper-dark">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen size={18} className="text-ink-light" />
                        過去のレッスン
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {pastLessons.length > 0 ? (
                        <div className="space-y-3">
                            {pastLessons.map(lesson => (
                                <div
                                    key={lesson.id}
                                    className="p-3 rounded-lg hover:bg-paper transition-colors timeline-marker"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-ink">
                                            {format(new Date(lesson.date), 'M月d日（E）', { locale: ja })}
                                        </span>
                                        <LessonStatusBadge status={(lesson.status || 'planned') as LessonStatus} />
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-ink-light mb-2">
                                        <span>{lesson.hours}時間</span>
                                        <span>•</span>
                                        <span>{formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}</span>
                                    </div>

                                    {/* Homework */}
                                    {lesson.homework && (
                                        <div className="p-2 bg-ochre-subtle/30 rounded mt-2">
                                            <p className="text-xs text-ochre font-medium mb-1">📝 宿題</p>
                                            <p className="text-sm text-ink">{lesson.homework}</p>
                                        </div>
                                    )}

                                    {/* Memo */}
                                    {lesson.memo && (
                                        <div className="p-2 bg-paper-dark/50 rounded mt-2">
                                            <p className="text-xs text-ink-faint mb-1">先生からのメモ</p>
                                            <p className="text-sm text-ink-light">{lesson.memo}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-ink-faint text-sm py-8 text-center">
                            まだレッスン履歴がありません
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Cancel Modal */}
            <AnimatePresence>
                {showCancelModal && selectedLesson && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-ink/20 z-40"
                            onClick={() => setShowCancelModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-x-4 top-[20vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50"
                        >
                            <Card padding="lg">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle size={20} className="text-accent" />
                                    </div>
                                    <div>
                                        <h3 className="font-display text-lg text-ink">キャンセル申請</h3>
                                        <p className="text-sm text-ink-light mt-1">
                                            {format(new Date(selectedLesson.date), 'M月d日（E）', { locale: ja })}
                                            {' '}
                                            {selectedLesson.start_time.slice(0, 5)} - {selectedLesson.end_time.slice(0, 5)}
                                        </p>
                                    </div>
                                </div>

                                <Textarea
                                    label="キャンセル理由（任意）"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="体調不良、予定変更など"
                                    className="mb-4"
                                />

                                {selectedLesson.is_makeup ? (
                                    <div className="p-3 bg-accent-subtle/30 rounded-lg mb-4 border border-accent flex gap-3 text-left">
                                        <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-accent mb-1">振替レッスンのキャンセルについて</p>
                                            <p className="text-xs text-ink-light leading-relaxed">
                                                このレッスンは振替授業です。キャンセルすると<strong className="text-accent">振替権利は消滅し、再度の振替はできません。</strong><br />
                                                それでもキャンセル申請を続けますか？
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-ink-faint mb-4">
                                        ※ キャンセルは先生の承認後に確定します。振替クレジットが付与される場合があります。
                                    </p>
                                )}

                                {error && (
                                    <p className="text-sm text-accent mb-4">{error}</p>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowCancelModal(false)}
                                        className="flex-1"
                                    >
                                        戻る
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleCancelRequest}
                                        disabled={loading}
                                        className="flex-1 !bg-accent hover:!bg-accent/90"
                                    >
                                        {loading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <X size={16} />
                                        )}
                                        キャンセルを申請
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
