import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LessonStatusBadge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/pricing'
import { LessonEditForm } from './lesson-edit-form'
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    User,
    Wallet,
    BookOpen,
} from 'lucide-react'

export default async function TeacherLessonDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch lesson with student
    const { data: lesson } = await supabase
        .from('lessons')
        .select(`
      *,
      student:students(id, name, grade)
    `)
        .eq('id', id)
        .single()

    if (!lesson) {
        notFound()
    }

    const student = lesson.student as { id: string; name: string; grade: string }
    const totalFee = (lesson.amount || 0) + (lesson.transport_fee || 0)

    return (
        <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/teacher/calendar">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-display text-ink">レッスン詳細</h1>
                    <p className="text-ink-light">
                        {format(new Date(lesson.date), 'yyyy年M月d日（E）', { locale: ja })}
                    </p>
                </div>
                <LessonStatusBadge status={lesson.status} />
            </div>

            {/* Main info */}
            <Card padding="lg" className="timeline-marker">
                <div className="space-y-4">
                    {/* Student */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sage-subtle flex items-center justify-center">
                            <User size={20} className="text-sage" />
                        </div>
                        <div>
                            <Link
                                href={`/teacher/students/${student.id}`}
                                className="font-display text-lg text-ink hover:text-accent transition-colors"
                            >
                                {student.name}
                            </Link>
                            <p className="text-sm text-ink-light">{student.grade}</p>
                        </div>
                    </div>

                    {/* Time and location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-paper rounded-lg">
                            <Clock size={18} className="text-ink-light" />
                            <div>
                                <p className="text-sm text-ink-faint">時間</p>
                                <p className="text-ink">
                                    {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                </p>
                                <p className="text-xs text-ink-light">{lesson.hours}時間</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-paper rounded-lg">
                            <Wallet size={18} className="text-ink-light" />
                            <div>
                                <p className="text-sm text-ink-faint">料金</p>
                                <p className="text-ink font-display">{formatCurrency(totalFee)}</p>
                                <p className="text-xs text-ink-light">
                                    授業 {formatCurrency(lesson.amount || 0)}
                                    {lesson.transport_fee ? ` + 交通費 ${formatCurrency(lesson.transport_fee)}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Editable fields */}
            <LessonEditForm
                lessonId={id}
                studentId={lesson.student_id}
                lessonDate={lesson.date}
                lessonHours={lesson.hours || 1}
                initialStatus={lesson.status}
                initialMemo={lesson.memo || ''}
                initialHomework={lesson.homework || ''}
            />
        </div>
    )
}
