'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { GraduationCap, ChevronRight, Check } from 'lucide-react'

interface StudentRegistrationFormProps {
    teacherId: string
}

const gradeOptions = [
    '小学1年', '小学2年', '小学3年', '小学4年', '小学5年', '小学6年',
    '中学1年', '中学2年', '中学3年',
    '高校1年', '高校2年', '高校3年',
    '大学生', '社会人', 'その他'
]

export function StudentRegistrationForm({ teacherId }: StudentRegistrationFormProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form data
    const [studentName, setStudentName] = useState('')
    const [grade, setGrade] = useState('')
    const [school, setSchool] = useState('')
    const [subjects, setSubjects] = useState('')
    const [contact, setContact] = useState('')
    const [note, setNote] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('ログインが必要です')
            setLoading(false)
            return
        }

        // Create student
        const { data: student, error: studentError } = await (supabase
            .from('students') as any)
            .insert({
                teacher_id: teacherId,
                name: studentName.trim(),
                grade: grade,
                school: school.trim() || null,
                subjects: subjects ? subjects.split(/[,、]/).map(s => s.trim()).filter(Boolean) : [],
                contact: contact.trim() || null,
                note: note.trim() || null,
            })
            .select()
            .single()

        if (studentError) {
            console.error('Student creation error:', studentError)
            setError('生徒情報の登録に失敗しました')
            setLoading(false)
            return
        }

        // Update parent profile with student_id
        const { error: profileError } = await (supabase
            .from('profiles') as any)
            .update({ student_id: student.id })
            .eq('id', user.id)

        if (profileError) {
            console.error('Profile update error:', profileError)
            setError('プロフィールの更新に失敗しました')
            setLoading(false)
            return
        }

        setStep(3) // Success step
        setTimeout(() => {
            router.push('/parent/home')
            router.refresh()
        }, 2000)
    }

    if (step === 3) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-8 text-center"
            >
                <div className="w-20 h-20 mx-auto mb-6 bg-sage-subtle rounded-full flex items-center justify-center">
                    <Check size={40} className="text-sage" />
                </div>
                <h2 className="text-xl font-display text-ink mb-2">登録完了！</h2>
                <p className="text-ink-light">ホーム画面へ移動中...</p>
            </motion.div>
        )
    }

    return (
        <div className="card p-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-center mb-6">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-ink text-paper-light' : 'bg-paper-dark text-ink-faint'
                    }`}>
                    1
                </div>
                <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-ink' : 'bg-paper-dark'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-ink text-paper-light' : 'bg-paper-dark text-ink-faint'
                    }`}>
                    2
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap size={20} className="text-ochre" />
                            <h3 className="font-display text-lg text-ink">生徒情報</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-light mb-2">
                                お子様のお名前 <span className="text-accent">*</span>
                            </label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="input"
                                placeholder="山田 太郎"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-light mb-2">
                                学年 <span className="text-accent">*</span>
                            </label>
                            <select
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="input"
                                required
                            >
                                <option value="">選択してください</option>
                                {gradeOptions.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-light mb-2">
                                学校名（任意）
                            </label>
                            <input
                                type="text"
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                className="input"
                                placeholder="○○中学校"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            disabled={!studentName.trim() || !grade}
                            className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            次へ
                            <ChevronRight size={18} />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap size={20} className="text-ochre" />
                            <h3 className="font-display text-lg text-ink">追加情報</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-light mb-2">
                                受講科目（複数可、カンマ区切り）
                            </label>
                            <input
                                type="text"
                                value={subjects}
                                onChange={(e) => setSubjects(e.target.value)}
                                className="input"
                                placeholder="数学、英語、理科"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-light mb-2">
                                連絡先（任意）
                            </label>
                            <input
                                type="text"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                className="input"
                                placeholder="電話番号やLINE IDなど"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-light mb-2">
                                先生へのメモ（任意）
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="input min-h-[100px]"
                                placeholder="学習の目標や気になる点など"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-accent p-3 bg-accent-subtle rounded-lg">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="btn btn-secondary flex-1 py-3"
                            >
                                戻る
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary flex-1 py-3"
                            >
                                {loading ? '登録中...' : '登録する'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </form>
        </div>
    )
}
