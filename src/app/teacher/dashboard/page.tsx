import { createClient } from '@/lib/supabase/server'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScheduleStatusBadge, LessonStatusBadge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/pricing'
import { formatMakeupTime } from '@/lib/makeup'
import {
    CalendarDays,
    CalendarClock,
    Wallet,
    Clock,
    ChevronRight,
    Users,
    AlertCircle,
} from 'lucide-react'

export default async function TeacherDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const today = new Date()
    const sevenDaysLater = addDays(today, 7)
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    // Fetch upcoming lessons (next 7 days)
    const { data: upcomingLessons } = await supabase
        .from('lessons')
        .select(`
      *,
      student:students(name)
    `)
        .gte('date', format(today, 'yyyy-MM-dd'))
        .lte('date', format(sevenDaysLater, 'yyyy-MM-dd'))
        .in('status', ['planned', 'done'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5)

    // Fetch pending schedule requests
    const { data: pendingRequests, error: reqError } = await supabase
        .from('schedule_requests')
        .select(`
      *,
      student:students(name)
    `)
        .eq('status', 'requested')
        .order('created_at', { ascending: false })
        .limit(5)

    // Get count of all pending requests
    const { count: pendingCount } = await supabase
        .from('schedule_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'requested')

    // Calculate this month's income (planned + cancelled = confirmed, excluding done/makeup)
    // Cancelled lessons still count as revenue (no refunds)
    const { data: monthLessons } = await supabase
        .from('lessons')
        .select('amount, transport_fee, is_makeup, status')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .in('status', ['planned', 'cancelled'])  // Confirmed lessons (done not counted to avoid duplication)

    // Only count non-makeup lessons for revenue
    // Cancelled lessons: count amount but NOT transport_fee (didn't travel)
    const monthlyIncome = monthLessons?.reduce(
        (sum, lesson) => {
            if (lesson.is_makeup) return sum  // Makeup lessons don't add revenue
            const transportFee = lesson.status === 'cancelled' ? 0 : (lesson.transport_fee || 0)
            return sum + (lesson.amount || 0) + transportFee
        },
        0
    ) ?? 0

    // Get students count
    const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

    // Get makeup credits summary
    const { data: makeupCredits } = await supabase
        .from('makeup_credits')
        .select(`
      total_minutes,
      expires_at,
      student:students(name)
    `)
        .gt('total_minutes', 0)
        .gt('expires_at', new Date().toISOString())

    const totalMakeupMinutes = makeupCredits?.reduce(
        (sum, credit) => sum + (credit.total_minutes || 0),
        0
    ) ?? 0

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-display text-ink mb-2">ダッシュボード</h1>
                <p className="text-ink-light">
                    {format(today, 'yyyy年M月d日（E）', { locale: ja })}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Students */}
                <Card padding="md" className="animate-fade-slide-up stagger-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-sage-subtle flex items-center justify-center">
                            <Users className="text-sage" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-display text-ink">{studentsCount ?? 0}</p>
                            <p className="text-sm text-ink-light">生徒数</p>
                        </div>
                    </div>
                </Card>

                {/* Pending Requests */}
                <Link href="/teacher/schedule-requests">
                    <Card padding="md" className="animate-fade-slide-up stagger-2 cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${(pendingCount ?? 0) > 0 ? 'bg-ochre-subtle' : 'bg-paper-dark'
                                }`}>
                                <CalendarClock className={(pendingCount ?? 0) > 0 ? 'text-ochre' : 'text-ink-faint'} size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-display text-ink">{pendingCount ?? 0}</p>
                                <p className="text-sm text-ink-light">新規リクエスト</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                {/* Monthly Income */}
                <Card padding="md" className="animate-fade-slide-up stagger-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-sage-subtle flex items-center justify-center">
                            <Wallet className="text-sage" size={24} />
                        </div>
                        <div>
                            <p className="text-xl font-display text-ink">{formatCurrency(monthlyIncome)}</p>
                            <p className="text-sm text-ink-light">{format(today, 'M月')}の予定収入</p>
                        </div>
                    </div>
                </Card>

                {/* Makeup Hours */}
                <Link href="/teacher/makeup">
                    <Card padding="md" className="animate-fade-slide-up stagger-4 cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${totalMakeupMinutes > 0 ? 'bg-ochre-subtle' : 'bg-paper-dark'
                                }`}>
                                <Clock className={totalMakeupMinutes > 0 ? 'text-ochre' : 'text-ink-faint'} size={24} />
                            </div>
                            <div>
                                <p className="text-xl font-display text-ink">
                                    {formatMakeupTime(totalMakeupMinutes)}
                                </p>
                                <p className="text-sm text-ink-light">振替残り</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Lessons */}
                <Card padding="none" className="animate-fade-slide-up stagger-3">
                    <CardHeader className="p-6 pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays size={20} className="text-sage" />
                                今後のレッスン
                            </CardTitle>
                            <Link
                                href="/teacher/calendar"
                                className="text-sm text-ink-light hover:text-ink flex items-center gap-1"
                            >
                                すべて見る
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {upcomingLessons && upcomingLessons.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingLessons.map((lesson) => (
                                    <Link
                                        key={lesson.id}
                                        href={`/teacher/lessons/${lesson.id}`}
                                        className="block p-3 rounded-lg hover:bg-paper transition-colors timeline-marker"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-ink">
                                                {(lesson.student as { name: string })?.name}
                                            </span>
                                            <LessonStatusBadge status={lesson.status} />
                                        </div>
                                        <div className="text-sm text-ink-light">
                                            {format(new Date(lesson.date), 'M/d（E）', { locale: ja })}
                                            {' '}
                                            {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                            {lesson.hours && ` (${lesson.hours}h)`}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-ink-faint">
                                <CalendarDays size={32} className="mx-auto mb-2 opacity-50" />
                                <p>今後7日間のレッスンはありません</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Schedule Requests */}
                <Card padding="none" className="animate-fade-slide-up stagger-4">
                    <CardHeader className="p-6 pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarClock size={20} className="text-ochre" />
                                日程リクエスト
                            </CardTitle>
                            <Link
                                href="/teacher/schedule-requests"
                                className="text-sm text-ink-light hover:text-ink flex items-center gap-1"
                            >
                                すべて見る
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {pendingRequests && pendingRequests.length > 0 ? (
                            <div className="space-y-3">
                                {pendingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="p-3 rounded-lg bg-ochre-subtle/30 border border-ochre-subtle"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-ink">
                                                {(request.student as { name: string })?.name}
                                            </span>
                                            <ScheduleStatusBadge status={request.status} />
                                        </div>
                                        <div className="text-sm text-ink-light mb-2">
                                            {format(new Date(request.date), 'M/d（E）', { locale: ja })}
                                            {' '}
                                            {request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}
                                            {request.location && ` @ ${request.location}`}
                                        </div>
                                        {request.memo && (
                                            <p className="text-xs text-ink-faint truncate">{request.memo}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-ink-faint">
                                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                                <p>新規リクエストはありません</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
