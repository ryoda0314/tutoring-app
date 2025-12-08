'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const gradeOptions = [
    { value: '', label: '学年を選択' },
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

export default function NewStudentPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [grade, setGrade] = useState('')
    const [school, setSchool] = useState('')
    const [subjects, setSubjects] = useState('')
    const [contact, setContact] = useState('')
    const [note, setNote] = useState('')
    const [transportationFee, setTransportationFee] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim() || !grade) {
            setError('名前と学年は必須です')
            return
        }

        setLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('認証エラー')

            const subjectsArray = subjects
                .split(/[,、]/)
                .map(s => s.trim())
                .filter(s => s.length > 0)

            const { error: insertError } = await (supabase
                .from('students') as any)
                .insert({
                    teacher_id: user.id,
                    name: name.trim(),
                    grade,
                    school: school.trim() || null,
                    subjects: subjectsArray,
                    contact: contact.trim() || null,
                    note: note.trim() || null,
                    transportation_fee: parseInt(transportationFee) || 0,
                })

            if (insertError) throw insertError

            router.push('/teacher/students')
            router.refresh()
        } catch (err) {
            console.error('Error creating student:', err)
            setError('生徒の登録に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/teacher/students">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-display text-ink">生徒を追加</h1>
            </div>

            <Card padding="lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic info */}
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

                    <Input
                        label="連絡先（LINE ID、メールなど）"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="LINE ID: yamada_taro"
                    />

                    <Input
                        type="number"
                        label="交通費（円）"
                        value={transportationFee}
                        onChange={(e) => setTransportationFee(e.target.value)}
                        placeholder="500"
                        min="0"
                    />

                    <Textarea
                        label="メモ"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="生徒に関するメモや注意点など"
                    />

                    {error && (
                        <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} className="text-accent" />
                            <p className="text-sm text-accent">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Link href="/teacher/students" className="flex-1">
                            <Button type="button" variant="secondary" className="w-full">
                                キャンセル
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            className="flex-1"
                        >
                            <Save size={16} />
                            登録する
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
