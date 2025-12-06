'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Select } from '@/components/ui/input'
import type { LessonStatus } from '@/types/database'
import { Save, BookOpen, FileText, AlertCircle, Check } from 'lucide-react'

interface LessonEditFormProps {
    lessonId: string
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

    const hasChanges =
        status !== initialStatus ||
        memo !== initialMemo ||
        homework !== initialHomework

    const handleSave = async () => {
        setLoading(true)
        setError(null)
        setSaved(false)

        const supabase = createClient()

        try {
            const { error: updateError } = await supabase
                .from('lessons')
                .update({
                    status,
                    memo: memo || null,
                    homework: homework || null,
                })
                .eq('id', lessonId)

            if (updateError) throw updateError

            setSaved(true)
            router.refresh()

            // Hide saved message after 2 seconds
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
                        onChange={(e) => setStatus(e.target.value as LessonStatus)}
                        options={statusOptions}
                    />
                </CardContent>
            </Card>

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
        </div>
    )
}
