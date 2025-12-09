'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Select } from '@/components/ui/input'
import { addMonths, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { LessonStatus } from '@/types/database'
import { Save, BookOpen, FileText, AlertCircle, Check, AlertTriangle, Ban, X } from 'lucide-react'

interface LessonEditFormProps {
    lessonId: string
    studentId: string
    lessonDate: string
    lessonHours: number
    lessonAmount: number
    isMakeup: boolean
    initialStatus: LessonStatus
    initialMemo: string
    initialHomework: string
    cancellationRequestedAt: string | null
    cancellationReason: string | null
}

const statusOptions = [
    { value: 'planned', label: '予定' },
    { value: 'done', label: '完了' },
    { value: 'cancelled', label: 'キャンセル' },
]

export function LessonEditForm({
    lessonId,
    studentId,
    lessonDate,
    lessonHours,
    lessonAmount,
    isMakeup,
    initialStatus,
    initialMemo,
    initialHomework,
    cancellationRequestedAt,
    cancellationReason,
}: LessonEditFormProps) {
    const router = useRouter()
    const [status, setStatus] = useState(initialStatus)
    const [memo, setMemo] = useState(initialMemo)
    const [homework, setHomework] = useState(initialHomework)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [hasCancellationRequest, setHasCancellationRequest] = useState(!!cancellationRequestedAt)
    const [isTeacherReason, setIsTeacherReason] = useState(
        !!cancellationReason?.includes('[Teacher Reason]')
    )

    const initialIsTeacherReason = !!cancellationReason?.includes('[Teacher Reason]')

    const hasChanges =
        status !== initialStatus ||
        memo !== initialMemo ||
        homework !== initialHomework ||
        isTeacherReason !== initialIsTeacherReason

    const isChangingToCancel = status === 'cancelled' && initialStatus !== 'cancelled'

    const handleSave = async () => {
        // Show confirmation if changing to cancelled
        if (isChangingToCancel && !showCancelConfirm) {
            setShowCancelConfirm(true)
            return
        }

        setLoading(true)
        setError(null)
        setSaved(false)

        const supabase = createClient()

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('ログインが必要です')
                setLoading(false)
                return
            }

            // Verify student belongs to this teacher
            const { count } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('id', studentId)
                .eq('teacher_id', user.id)

            if (count === 0) {
                setError('権限がありません')
                setLoading(false)
                return
            }

            // Construct cancellation reason
            let finalCancellationReason = cancellationReason

            if (status === 'cancelled') {
                const currentReason = cancellationReason || ''
                const hasTag = currentReason.includes('[Teacher Reason]')

                if (isTeacherReason) {
                    if (!hasTag) {
                        finalCancellationReason = `[Teacher Reason] ${currentReason}`.trim()
                    }
                } else {
                    if (hasTag) {
                        finalCancellationReason = currentReason.replace('[Teacher Reason]', '').trim()
                    }
                }
            }

            // Update lesson
            const { error: updateError } = await (supabase
                .from('lessons') as any)
                .update({
                    status,
                    memo: memo || null,
                    homework: homework || null,
                    cancellation_reason: finalCancellationReason || null,
                })
                .eq('id', lessonId)

            if (updateError) throw updateError

            // If cancelling a REGULAR lesson (not makeup), create makeup credit
            // Makeup lessons do NOT get credits when cancelled - they simply expire
            if (isChangingToCancel && !isMakeup) {
                const makeupMinutes = Math.round(lessonHours * 60)
                const expiresAt = addMonths(new Date(lessonDate), 1)

                const { error: makeupError } = await (supabase
                    .from('makeup_credits') as any)
                    .insert({
                        student_id: studentId,
                        total_minutes: makeupMinutes,
                        expires_at: expiresAt.toISOString(),
                        origin_lesson_id: lessonId,
                    })

                if (makeupError) {
                    console.error('Makeup credit error:', makeupError)
                }
            }

            setSaved(true)
            setShowCancelConfirm(false)
            router.refresh()

            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            console.error('Save error:', err)
            setError('保存に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Cancellation Request Alert */}
            {hasCancellationRequest && status === 'planned' && (
                <Card padding="md" className="bg-accent-subtle/30 border-accent animate-pulse-slow">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                            <X size={20} className="text-accent" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-accent mb-1">
                                キャンセル申請があります
                            </p>
                            <p className="text-sm text-ink-light mb-2">
                                {cancellationRequestedAt && format(new Date(cancellationRequestedAt), 'M月d日 HH:mm', { locale: ja })}に申請
                            </p>
                            {cancellationReason && (
                                <p className="text-sm text-ink mb-3 p-2 bg-paper rounded">
                                    理由: {cancellationReason}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        setStatus('cancelled')
                                        setShowCancelConfirm(true)
                                    }}
                                    className="!bg-accent hover:!bg-accent/90"
                                >
                                    <Check size={14} />
                                    承認してキャンセル
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={async () => {
                                        setLoading(true)
                                        const supabase = createClient()
                                        await (supabase
                                            .from('lessons') as any)
                                            .update({
                                                cancellation_requested_at: null,
                                                cancellation_reason: null,
                                                cancellation_processed_at: new Date().toISOString(),
                                            })
                                            .eq('id', lessonId)
                                        setHasCancellationRequest(false)
                                        setLoading(false)
                                        router.refresh()
                                    }}
                                    disabled={loading}
                                >
                                    <X size={14} />
                                    却下
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Status */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="text-base">ステータス</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value as LessonStatus)
                            setShowCancelConfirm(false)
                        }}
                        options={statusOptions}
                    />

                    {status === 'cancelled' && (
                        <div className="mt-4 p-4 bg-paper-light rounded-lg border border-paper-dark space-y-3">
                            <p className="text-sm font-medium text-ink">キャンセル理由の種別</p>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={!isTeacherReason ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setIsTeacherReason(false)}
                                >
                                    生徒都合
                                </Button>
                                <Button
                                    type="button"
                                    variant={isTeacherReason ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setIsTeacherReason(true)}
                                >
                                    先生都合
                                </Button>
                            </div>
                            <p className="text-xs text-ink-faint">
                                ※先生都合の場合、授業料と交通費が次回の請求から差し引かれます。<br />
                                ※生徒都合の場合、交通費のみ差し引かれます（振替クレジット発行）。
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Makeup lesson indicator */}
            {
                isMakeup && (
                    <div className="p-3 bg-ochre-subtle/30 rounded-lg flex items-center gap-2">
                        <Ban size={16} className="text-ochre" />
                        <p className="text-sm text-ochre">
                            振替レッスン（キャンセルすると振替権利は失効します）
                        </p>
                    </div>
                )
            }

            {/* Cancel confirmation */}
            {
                showCancelConfirm && (
                    <Card padding="md" className="bg-accent-subtle/30 border-accent">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-accent mb-2">
                                    レッスンをキャンセルしますか？
                                </p>
                                {isMakeup ? (
                                    <p className="text-sm text-ink-light mb-3">
                                        これは振替レッスンです。<strong className="text-accent">キャンセルすると振替権利は失効し、返金もありません。</strong>
                                    </p>
                                ) : (
                                    <p className="text-sm text-ink-light mb-3">
                                        キャンセルすると、生徒に <strong>{lessonHours}時間分</strong> の振替時間が付与されます。
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSave}
                                        isLoading={loading}
                                    >
                                        キャンセルを確定
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setShowCancelConfirm(false)
                                            setStatus(initialStatus)
                                        }}
                                    >
                                        戻る
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )
            }

            {/* Memo */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileText size={16} className="text-ink-light" />
                        授業メモ
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="授業の内容、進捗、気づいた点など"
                        className="min-h-[100px]"
                    />
                </CardContent>
            </Card>

            {/* Homework */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen size={16} className="text-ochre" />
                        宿題
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Textarea
                        value={homework}
                        onChange={(e) => setHomework(e.target.value)}
                        placeholder="次回までの宿題、課題など（保護者に表示されます）"
                        className="min-h-[80px]"
                    />
                </CardContent>
            </Card>

            {/* Error */}
            {
                error && (
                    <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} className="text-accent" />
                        <p className="text-sm text-accent">{error}</p>
                    </div>
                )
            }

            {/* Save button */}
            {
                !showCancelConfirm && (
                    <div className="flex items-center gap-4">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={loading}
                            disabled={!hasChanges}
                            className="flex-1"
                        >
                            <Save size={16} />
                            保存する
                        </Button>

                        {saved && (
                            <span className="flex items-center gap-1.5 text-sm text-sage">
                                <Check size={16} />
                                保存しました
                            </span>
                        )}
                    </div>
                )
            }
        </div >
    )
}
