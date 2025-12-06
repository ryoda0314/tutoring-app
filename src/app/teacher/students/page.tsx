import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMakeupTime } from '@/lib/makeup'
import type { Student } from '@/types/database'
import {
    Users,
    Plus,
    GraduationCap,
    CalendarDays,
    Clock,
    ChevronRight,
} from 'lucide-react'

interface StudentWithDetails extends Student {
    next_lesson: { date: string } | null
    makeup_total: number
}

export default async function TeacherStudentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch students with next lesson and makeup credits
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', user.id)
        .order('name')

    // For each student, get next planned lesson and makeup totals
    const studentsWithDetails: StudentWithDetails[] = await Promise.all(
        (students || []).map(async (student) => {
            // Get next lesson
            const { data: nextLessonData } = await supabase
                .from('lessons')
                .select('date')
                .eq('student_id', student.id)
                .eq('status', 'planned')
                .gte('date', format(new Date(), 'yyyy-MM-dd'))
                .order('date')
                .limit(1)

            // Get active makeup credits total
            const { data: makeupData } = await supabase
                .from('makeup_credits')
                .select('total_minutes')
                .eq('student_id', student.id)
                .gt('total_minutes', 0)
                .gt('expires_at', new Date().toISOString())

            const makeupTotal = makeupData?.reduce((sum, m) => sum + (m.total_minutes || 0), 0) || 0

            return {
                ...student,
                next_lesson: nextLessonData?.[0] || null,
                makeup_total: makeupTotal,
            }
        })
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-display text-ink">生徒一覧</h1>
                <Link href="/teacher/students/new">
                    <Button variant="primary">
                        <Plus size={18} />
                        生徒を追加
                    </Button>
                </Link>
            </div>

            {/* Students list */}
            {studentsWithDetails.length === 0 ? (
                <Card padding="lg" className="text-center">
                    <Users size={48} className="mx-auto mb-4 text-ink-faint" />
                    <h2 className="font-display text-lg text-ink mb-2">生徒がまだいません</h2>
                    <p className="text-ink-light mb-4">生徒を追加してレッスン管理を始めましょう</p>
                    <Link href="/teacher/students/new">
                        <Button variant="primary">
                            <Plus size={16} />
                            最初の生徒を追加
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentsWithDetails.map((student, index) => (
                        <Link key={student.id} href={`/teacher/students/${student.id}`}>
                            <Card
                                padding="md"
                                className="h-full cursor-pointer"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-sage-subtle flex items-center justify-center flex-shrink-0">
                                        <GraduationCap size={24} className="text-sage" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-display text-lg text-ink truncate">
                                                {student.name}
                                            </h3>
                                            <ChevronRight size={18} className="text-ink-faint flex-shrink-0" />
                                        </div>

                                        <p className="text-sm text-ink-light mb-3">
                                            {student.grade}
                                            {student.school && ` · ${student.school}`}
                                        </p>

                                        {/* Subjects */}
                                        {student.subjects && student.subjects.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {student.subjects.map((subject: string) => (
                                                    <span
                                                        key={subject}
                                                        className="px-2 py-0.5 text-xs bg-paper-dark rounded-full text-ink-light"
                                                    >
                                                        {subject}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 text-xs text-ink-faint">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays size={12} />
                                                {student.next_lesson
                                                    ? `次回 ${format(new Date(student.next_lesson.date), 'M/d', { locale: ja })}`
                                                    : '予定なし'
                                                }
                                            </span>
                                            {student.makeup_total > 0 && (
                                                <span className="flex items-center gap-1 text-ochre">
                                                    <Clock size={12} />
                                                    振替 {formatMakeupTime(student.makeup_total)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
