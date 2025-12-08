'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import type { Student } from '@/types/database'
import { Save, Loader2, Check } from 'lucide-react'

interface StudentEditFormProps {
    student: Student
}

const gradeOptions = [
    { value: '小学1年生', label: '小学1年生' },
    { value: '小学2年生', label: '小学2年生' },
    { value: '小学3年生', label: '小学3年生' },
    { value: '小学4年生', label: '小学4年生' },
    { value: '小学5年生', label: '小学5年生' },
    { value: '小学6年生', label: '小学6年生' },
    { value: '中学1年生', label: '中学1年生' },
    { value: '中学2年生', label: '中学2年生' },
    { value: '中学3年生', label: '中学3年生' },
    { value: '高校1年生', label: '高校1年生' },
    { value: '高校2年生', label: '高校2年生' },
    { value: '高校3年生', label: '高校3年生' },
    { value: '浪人生', label: '浪人生' },
    { value: '大学生', label: '大学生' },
    { value: '社会人', label: '社会人' },
]

const subjectOptions = [
    '国語', '数学', '英語', '理科', '社会',
    '物理', '化学', '生物', '地学',
    '日本史', '世界史', '地理', '政治経済', '倫理',
    '小論文', '面接対策', 'その他'
]

export function StudentEditForm({ student }: StudentEditFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [name, setName] = useState(student.name)
    const [grade, setGrade] = useState(student.grade || '')
    const [school, setSchool] = useState(student.school || '')
    const [subjects, setSubjects] = useState<string[]>(student.subjects || [])
    const [transportationFee, setTransportationFee] = useState(student.transportation_fee || 0)
    const [contact, setContact] = useState(student.contact || '')
    const [note, setNote] = useState(student.note || '')

    const toggleSubject = (subject: string) => {
        setSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        )
    }

    const handleSave = async () => {
        if (!name.trim()) {
            setError('名前を入力してください')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { error: updateError } = await supabase
                .from('students')
                .update({
                    name: name.trim(),
                    grade,
                    school: school || null,
                    subjects,
                    transportation_fee: transportationFee,
                    contact: contact || null,
                    note: note || null,
                })
                .eq('id', student.id)

            if (updateError) throw updateError

            setSaved(true)
            router.refresh()
            setTimeout(() => {
                router.push(`/teacher/students/${student.id}`)
            }, 500)
        } catch (err) {
            console.error('Save error:', err)
            setError('保存に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Name */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="text-base">基本情報</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                    <Input
                        label="名前"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="山田 太郎"
                        required
                    />

                    <Select
                        label="学年"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        options={gradeOptions}
                    />

                    <Input
                        label="学校名"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="○○中学校"
                    />
                </CardContent>
            </Card>

            {/* Subjects */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="text-base">科目</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex flex-wrap gap-2">
                        {subjectOptions.map(subject => (
                            <button
                                key={subject}
                                type="button"
                                onClick={() => toggleSubject(subject)}
                                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${subjects.includes(subject)
                                        ? 'bg-sage text-paper'
                                        : 'bg-paper-dark text-ink-light hover:bg-paper-dark/80'
                                    }`}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Transportation fee */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="text-base">交通費</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={transportationFee}
                            onChange={(e) => setTransportationFee(parseInt(e.target.value) || 0)}
                            className="w-32"
                        />
                        <span className="text-ink-light">円</span>
                    </div>
                </CardContent>
            </Card>

            {/* Contact & Note */}
            <Card padding="md">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="text-base">その他</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                    <Input
                        label="連絡先"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="電話番号やメールアドレス"
                    />

                    <Textarea
                        label="メモ"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="補足情報、注意点など"
                    />
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <div className="p-3 bg-accent-subtle rounded-lg">
                    <p className="text-sm text-accent">{error}</p>
                </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-4">
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1"
                >
                    {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : saved ? (
                        <Check size={16} />
                    ) : (
                        <Save size={16} />
                    )}
                    {saved ? '保存しました' : '保存する'}
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => router.push(`/teacher/students/${student.id}`)}
                >
                    キャンセル
                </Button>
            </div>
        </div>
    )
}
