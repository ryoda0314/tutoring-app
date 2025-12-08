import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LessonStatusBadge } from '@/components/ui/badge'
import { formatMakeupTime, formatExpirationStatus } from '@/lib/makeup'
import { formatCurrency } from '@/lib/pricing'
import {
    ArrowLeft,
    GraduationCap,
    CalendarDays,
    Clock,
    MessageSquare,
    BookOpen,
    ChevronRight,
} from 'lucide-react'
import { StudentLocationsManager } from '@/components/student/locations-manager'

export default async function TeacherStudentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch student
    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

    if (!student) {
        notFound()
    }

    // Fetch lessons
    const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: false })
        .limit(10)

    // Fetch makeup credits
    const { data: makeupCredits } = await supabase
        .from('makeup_credits')
        .select('*')
        .eq('student_id', id)
        .gt('total_minutes', 0)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at')

    const totalMakeupMinutes = makeupCredits?.reduce(
        (sum, m) => sum + (m.total_minutes || 0),
        0
    ) || 0

    // Fetch pending schedule requests
    const { data: pendingRequests } = await supabase
        .from('schedule_requests')
        .select('*')
        .eq('student_id', id)
        .in('status', ['requested', 'reproposed'])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/teacher/students">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-display text-ink">{student.name}</h1>
                    <p className="text-ink-light">
                        {student.grade}
                        {student.school && ` · ${student.school}`}
                    </p>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="md">
                    <div className="text-center">
                        <CalendarDays size={24} className="mx-auto mb-2 text-sage" />
                        <p className="text-lg font-display text-ink">
                            {lessons?.filter(l => l.status === 'done').length || 0}
                        </p>
                        <p className="text-xs text-ink-light">完了レッスン</p>
                    </div>
                </Card>

                <Card padding="md">
                    <div className="text-center">
                        <Clock size={24} className="mx-auto mb-2 text-ochre" />
                        <p className="text-lg font-display text-ink">
                            {formatMakeupTime(totalMakeupMinutes)}
                        </p>
                        <p className="text-xs text-ink-light">振替残り</p>
                    </div>
                </Card>

                <Link href="/teacher/schedule-requests">
                    <Card padding="md" className="cursor-pointer">
                        <div className="text-center">
                            <CalendarDays size={24} className="mx-auto mb-2 text-ink-light" />
                            <p className="text-lg font-display text-ink">
                                {pendingRequests?.length || 0}
                            </p>
                            <p className="text-xs text-ink-light">申請中</p>
                        </div>
                    </Card>
                </Link>

                <Link href={`/teacher/messages?student=${id}`}>
                    <Card padding="md" className="cursor-pointer">
                        <div className="text-center">
                            <MessageSquare size={24} className="mx-auto mb-2 text-ink-light" />
                            <p className="text-xs text-ink-light mt-2">メッセージ</p>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Info and subjects */}
            <Card padding="md">
                <CardHeader className="p-0 mb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <GraduationCap size={18} className="text-sage" />
                        基本情報
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                    {student.subjects && student.subjects.length > 0 && (
                        <div>
                            <p className="text-xs text-ink-faint mb-1.5">科目</p>
                            <div className="flex flex-wrap gap-1.5">
                                {student.subjects.map((subject: string) => (
                                    <span
                                        key={subject}
                                        className="px-2.5 py-1 text-sm bg-sage-subtle text-sage rounded-full"
                                    >
                                        {subject}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-xs text-ink-faint mb-1">交通費</p>
                        <p className="text-sm text-ink font-medium">
                            {formatCurrency(student.transportation_fee || 0)}
                        </p>
                    </div>

                    {student.contact && (
                        <div>
                            <p className="text-xs text-ink-faint mb-1">連絡先</p>
                            <p className="text-sm text-ink">{student.contact}</p>
                        </div>
                    )}

                    {student.note && (
                        <div>
                            <p className="text-xs text-ink-faint mb-1">メモ</p>
                            <p className="text-sm text-ink whitespace-pre-wrap">{student.note}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Locations and transportation fees */}
            <StudentLocationsManager studentId={id} />

            {/* Makeup credits */}
            {makeupCredits && makeupCredits.length > 0 && (
                <Card padding="md">
                    <CardHeader className="p-0 mb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock size={18} className="text-ochre" />
                            振替時間
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2">
                        {makeupCredits.map(credit => (
                            <div
                                key={credit.id}
                                className="flex items-center justify-between p-2 bg-ochre-subtle/30 rounded-lg"
                            >
                                <span className="text-sm text-ink">
                                    {formatMakeupTime(credit.total_minutes)}
                                </span>
                                <span className="text-xs text-ochre">
                                    {formatExpirationStatus(credit.expires_at)}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Recent lessons */}
            <Card padding="none">
                <CardHeader className="p-4 border-b border-paper-dark">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BookOpen size={18} className="text-sage" />
                            レッスン履歴
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {lessons && lessons.length > 0 ? (
                        <div className="space-y-3">
                            {lessons.map(lesson => (
                                <Link
                                    key={lesson.id}
                                    href={`/teacher/lessons/${lesson.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-paper transition-colors timeline-marker"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-ink">
                                            {format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                                        </p>
                                        <p className="text-xs text-ink-light">
                                            {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                            {' · '}
                                            {formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LessonStatusBadge status={lesson.status} />
                                        <ChevronRight size={16} className="text-ink-faint" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-ink-faint text-sm py-4 text-center">
                            レッスン履歴がありません
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
