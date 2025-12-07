import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScheduleStatusBadge, LessonStatusBadge } from '@/components/ui/badge'
import { formatMakeupTime, formatExpirationStatus } from '@/lib/makeup'
import {
    CalendarDays,
    CalendarClock,
    Clock,
    MessageSquare,
    ChevronRight,
    BookOpen,
} from 'lucide-react'

export default async function ParentHome() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get parent's profile with student_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single()

    // If not linked to a student, redirect to setup
    if (!profile?.student_id) {
        redirect('/parent/setup')
    }

    const studentId = profile.student_id
    const today = new Date()

    // Fetch student info
    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

    // Fetch next lesson
    const { data: nextLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'planned')
        .gte('date', format(today, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)

    const nextLesson = nextLessons?.[0]

    // Fetch pending schedule requests
    const { data: pendingRequests } = await supabase
        .from('schedule_requests')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['requested', 'reproposed'])
        .order('created_at', { ascending: false })
        .limit(3)

    // Fetch recent lessons (last 3)
    const { data: recentLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'done')
        .order('date', { ascending: false })
        .limit(3)

    // Fetch makeup credits
    const { data: makeupCredits } = await supabase
        .from('makeup_credits')
        .select('*')
        .eq('student_id', studentId)
        .gt('total_minutes', 0)
        .gt('expires_at', today.toISOString())
        .order('expires_at', { ascending: true })

    const totalMakeupMinutes = makeupCredits?.reduce(
        (sum, credit) => sum + (credit.total_minutes || 0),
        0
    ) ?? 0

    const nearestExpiration = makeupCredits?.[0]?.expires_at

    // Fetch unread message count (simplified - could be enhanced)
    const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="animate-fade-slide-up">
                <h1 className="text-2xl font-display text-ink mb-2">
                    こんにちは
                </h1>
                <p className="text-ink-light">
                    {format(today, 'yyyy年M月d日（E）', { locale: ja })}
                </p>
            </div>

            {/* Next Lesson Highlight */}
            {nextLesson ? (
                <Card padding="lg" className="bg-sage-subtle/30 border-sage-subtle animate-fade-slide-up stagger-1">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-sage/20 flex items-center justify-center flex-shrink-0">
                            <CalendarDays size={28} className="text-sage" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-sage font-medium mb-1">次回レッスン</p>
                            <p className="text-xl font-display text-ink mb-1">
                                {format(new Date(nextLesson.date), 'M月d日（E）', { locale: ja })}
                            </p>
                            <p className="text-ink-light">
                                {nextLesson.start_time.slice(0, 5)} - {nextLesson.end_time.slice(0, 5)}
                                {nextLesson.hours && ` (${nextLesson.hours}時間)`}
                            </p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card padding="lg" className="animate-fade-slide-up stagger-1">
                    <div className="text-center py-4">
                        <CalendarDays size={32} className="mx-auto mb-2 text-ink-faint" />
                        <p className="text-ink-light">予定されているレッスンはありません</p>
                        <Link
                            href="/parent/schedule"
                            className="inline-block mt-3 text-sm text-ochre hover:text-ochre font-medium"
                        >
                            日程をリクエストする →
                        </Link>
                    </div>
                </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                {/* Pending Requests */}
                <Link href="/parent/schedule">
                    <Card padding="md" className="animate-fade-slide-up stagger-2 cursor-pointer h-full">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${pendingRequests && pendingRequests.length > 0 ? 'bg-ochre-subtle' : 'bg-paper-dark'
                                }`}>
                                <CalendarClock size={24} className={
                                    pendingRequests && pendingRequests.length > 0 ? 'text-ochre' : 'text-ink-faint'
                                } />
                            </div>
                            <p className="text-lg font-display text-ink">{pendingRequests?.length ?? 0}</p>
                            <p className="text-xs text-ink-light">申請中の日程</p>
                        </div>
                    </Card>
                </Link>

                {/* Makeup Credits */}
                <Link href="/parent/makeup">
                    <Card padding="md" className="animate-fade-slide-up stagger-3 cursor-pointer h-full">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${totalMakeupMinutes > 0 ? 'bg-ochre-subtle' : 'bg-paper-dark'
                                }`}>
                                <Clock size={24} className={totalMakeupMinutes > 0 ? 'text-ochre' : 'text-ink-faint'} />
                            </div>
                            <p className="text-lg font-display text-ink">{formatMakeupTime(totalMakeupMinutes)}</p>
                            <p className="text-xs text-ink-light">振替残り時間</p>
                            {nearestExpiration && (
                                <p className="text-xs text-accent mt-1">
                                    {formatExpirationStatus(nearestExpiration)}
                                </p>
                            )}
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Pending Requests Detail */}
            {pendingRequests && pendingRequests.length > 0 && (
                <Card padding="none" className="animate-fade-slide-up stagger-4">
                    <CardHeader className="p-6 pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CalendarClock size={18} className="text-ochre" />
                                申請中の日程
                            </CardTitle>
                            <Link
                                href="/parent/schedule"
                                className="text-sm text-ink-light hover:text-ink flex items-center gap-1"
                            >
                                詳細
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-4">
                        <div className="space-y-3">
                            {pendingRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="p-3 rounded-lg bg-ochre-subtle/30 border border-ochre-subtle"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-ink">
                                            {format(new Date(request.date), 'M/d（E）', { locale: ja })}
                                        </span>
                                        <ScheduleStatusBadge status={request.status} />
                                    </div>
                                    <p className="text-sm text-ink-light">
                                        {request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}
                                        {request.location && ` @ ${request.location}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Lessons */}
            {recentLessons && recentLessons.length > 0 && (
                <Card padding="none" className="animate-fade-slide-up stagger-5">
                    <CardHeader className="p-6 pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BookOpen size={18} className="text-sage" />
                                最近のレッスン
                            </CardTitle>
                            <Link
                                href="/parent/lessons"
                                className="text-sm text-ink-light hover:text-ink flex items-center gap-1"
                            >
                                すべて見る
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-4">
                        <div className="space-y-3">
                            {recentLessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    className="p-3 rounded-lg hover:bg-paper transition-colors timeline-marker"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-ink">
                                            {format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                                        </span>
                                        <LessonStatusBadge status={lesson.status} />
                                    </div>
                                    <p className="text-sm text-ink-light">
                                        {lesson.hours}時間レッスン
                                    </p>
                                    {lesson.homework && (
                                        <p className="text-xs text-ochre mt-1 truncate">
                                            📝 {lesson.homework}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <Link href="/parent/schedule">
                    <Card padding="md" className="animate-fade-slide-up cursor-pointer text-center hover:border-ochre transition-colors">
                        <CalendarClock size={24} className="mx-auto mb-2 text-ochre" />
                        <p className="text-sm font-medium text-ink">日程をリクエスト</p>
                    </Card>
                </Link>
                <Link href="/parent/messages">
                    <Card padding="md" className="animate-fade-slide-up cursor-pointer text-center hover:border-ink-light transition-colors">
                        <MessageSquare size={24} className="mx-auto mb-2 text-ink-light" />
                        <p className="text-sm font-medium text-ink">先生に連絡</p>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
