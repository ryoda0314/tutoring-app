'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Spinner } from '@/components/ui/loading'
import type { Student } from '@/types/database'
import {
    Settings,
    GraduationCap,
    Save,
    Check,
    AlertCircle,
} from 'lucide-react'

const gradeOptions = [
    { value: '小学1年', label: '小学1年' },
    { value: '小学2年', label: '小学2年' },
    { value: '小学3年', label: '小学3年' },
    { value: '小学4年', label: '小学4年' },
    { value: '小学5年', label: '小学5年' },
    { value: '小学6年', label: '小学6年' },
    { value: '中学1年', label: '中学1年' },
    { value: '中学2年', label: '中学2年' },
    { value: '中学3年', label: '中学3年' },
    { value: '高校1年', label: '高校1年' },
    { value: '高校2年', label: '高校2年' },
    { value: '高校3年', label: '高校3年' },
    { value: 'その他', label: 'その他' },
]

export default function ParentSettingsPage() {
    const router = useRouter()
    const [student, setStudent] = useState<Student | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [grade, setGrade] = useState('')
    const [school, setSchool] = useState('')
    const [subjects, setSubjects] = useState('')
    const [note, setNote] = useState('')

    useEffect(() => {
        const fetchStudent = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            // Get profile to find student_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('student_id')
                .eq('id', user.id)
                .single() as { data: { student_id: string | null } | null }

            if (!profile?.student_id) {
                setLoading(false)
                return
            }

            // Fetch student data
            const { data: studentData } = await (supabase
                .from('students') as any)
                .select('*')
                .eq('id', profile.student_id)
                .single() as { data: Student | null }

            if (studentData) {
                setStudent(studentData)
                setName(studentData.name || '')
                setGrade(studentData.grade || '')
                setSchool(studentData.school || '')
                setSubjects(studentData.subjects?.join('、') || '')
                setNote(studentData.note || '')
            }

            setLoading(false)
        }
        fetchStudent()
    }, [])

    const handleSave = async () => {
        if (!student) return
        if (!name.trim() || !grade) {
            setError('名前と学年は必須です')
            return
        }

        setSaving(true)
        setError(null)

        const supabase = createClient()

        const subjectsArray = subjects
            .split(/[,、]/)
            .map(s => s.trim())
            .filter(s => s.length > 0)

        const { error: updateError } = await (supabase
            .from('students') as any)
            .update({
                name: name.trim(),
                grade,
                school: school.trim() || null,
                subjects: subjectsArray,
                note: note.trim() || null,
            })
            .eq('id', student.id)

        if (updateError) {
            setError('保存に失敗しました')
        } else {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }

        setSaving(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!student) {
        return (
            <Card padding="lg" className="text-center">
                <AlertCircle size={48} className="mx-auto mb-4 text-ink-faint" />
                <h2 className="font-display text-lg text-ink mb-2">生徒情報がありません</h2>
                <p className="text-ink-light">まだ生徒登録が完了していません</p>
            </Card>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Settings className="text-sage" size={24} />
                <h1 className="text-2xl font-display text-ink">設定</h1>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                {/* Student Info */}
                <Card>
                    <CardHeader>
                        <h2 className="text-lg font-display text-ink flex items-center gap-2">
                            <GraduationCap size={18} className="text-sage" />
                            生徒情報
                        </h2>
                        <p className="text-sm text-ink-faint">お子様の情報を編集できます</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="名前 *"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="山田太郎"
                                required
                            />
                            <Select
                                label="学年 *"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                options={gradeOptions}
                                required
                            />
                        </div>

                        <Input
                            label="学校名"
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                            placeholder="○○中学校"
                        />

                        <Input
                            label="科目（カンマ区切り）"
                            value={subjects}
                            onChange={(e) => setSubjects(e.target.value)}
                            placeholder="数学、英語、理科"
                        />

                        <Textarea
                            label="メモ"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="先生への連絡事項など"
                        />

                        {error && (
                            <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} className="text-accent" />
                                <p className="text-sm text-accent">{error}</p>
                            </div>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={saving}
                            className="w-full"
                        >
                            {saved ? (
                                <>
                                    <Check size={16} />
                                    保存しました
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    変更を保存
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-sage-subtle/30">
                    <CardContent>
                        <h3 className="font-medium text-ink mb-3 text-sm">現在の登録情報</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-ink-faint">名前:</span> <span className="text-ink">{name}</span></p>
                            <p><span className="text-ink-faint">学年:</span> <span className="text-ink">{grade}</span></p>
                            {school && <p><span className="text-ink-faint">学校:</span> <span className="text-ink">{school}</span></p>}
                            {subjects && <p><span className="text-ink-faint">科目:</span> <span className="text-ink">{subjects}</span></p>}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
