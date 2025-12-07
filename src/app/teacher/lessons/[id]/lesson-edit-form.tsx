'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Select } from '@/components/ui/input'
import { addMonths } from 'date-fns'
import type { LessonStatus } from '@/types/database'
import { Save, BookOpen, FileText, AlertCircle, Check, AlertTriangle } from 'lucide-react'

interface LessonEditFormProps {
    lessonId: string
    studentId: string
    lessonDate: string
    lessonHours: number
    initialStatus: LessonStatus
    initialMemo: string
    initialHomework: string
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
    initialStatus,
    initialMemo,
    initialHomework,
}: LessonEditFormProps) {
    const router = useRouter()
    const [status, setStatus] = useState(initialStatus)
    const [memo, setMemo] = useState(initialMemo)
    const [homework, setHomework] = useState(initialHomework)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    const hasChanges =
        status !== initialStatus ||
        memo !== initialMemo ||
        homework !== initialHomework

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
            // Update lesson
            const { error: updateError } = await supabase
                .from('lessons')
                .update({
                    status,
                    memo: memo || null,
                    homework: homework || null,
                })
                .eq('id', lessonId)

            if (updateError) throw updateError

            // If cancelling, create makeup credit
            if (isChangingToCancel) {
                const makeupMinutes = Math.round(lessonHours * 60)
                const expiresAt = addMonths(new Date(lessonDate), 1)

                const { error: makeupError } = await supabase
                    .from('makeup_credits')
                    .insert({
                        student_id: studentId,
                        total_minutes: makeupMinutes,
                        expires_at: expiresAt.toISOString(),
                        origin_lesson_id: lessonId,
                    })

                if (makeupError) {
                    console.error('Makeup credit error:', makeupError)
                    // Don't throw - lesson is already cancelled
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
                </CardContent>
            </Card>

            {/* Cancel confirmation */}
            {showCancelConfirm && (
                <Card padding="md" className="bg-accent-subtle/30 border-accent">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-accent mb-2">
                                レッスンをキャンセルしますか？
                            </p>
                            <p className="text-sm text-ink-light mb-3">
                                キャンセルすると、生徒に <strong>{lessonHours}時間分</strong> の振替時間が付与されます。
                                この操作は取り消せません。
                            </p>
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
            )}

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
            {error && (
                <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} className="text-accent" />
                    <p className="text-sm text-accent">{error}</p>
                </div>
            )}

            {/* Save button */}
            {!showCancelConfirm && (
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
            )}
        </div>
    )
}
