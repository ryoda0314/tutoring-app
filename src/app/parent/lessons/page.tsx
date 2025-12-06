import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LessonStatusBadge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/pricing'
import {
    BookOpen,
    Calendar,
    Clock,
    ChevronRight,
    GraduationCap,
} from 'lucide-react'

export default async function ParentLessonsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get parent's student_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single()

    if (!profile?.student_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <GraduationCap size={48} className="text-ink-faint mb-4" />
                <h2 className="text-xl font-display text-ink mb-2">生徒情報が登録されていません</h2>
                <p className="text-ink-light">先生に連絡してアカウントの設定を完了してください</p>
            </div>
        )
    }

    // Fetch lessons
    const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', profile.student_id)
        .order('date', { ascending: false })

    const upcomingLessons = lessons?.filter(l => l.status === 'planned') || []
    const pastLessons = lessons?.filter(l => l.status !== 'planned') || []

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">レッスン履歴</h1>

            {/* Upcoming lessons */}
            {upcomingLessons.length > 0 && (
                <Card padding="none">
                    <CardHeader className="p-4 border-b border-paper-dark">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar size={18} className="text-sage" />
                            今後のレッスン
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {upcomingLessons.map(lesson => (
                                <div
                                    key={lesson.id}
                                    className="p-3 rounded-lg bg-sage-subtle/30 border border-sage-subtle timeline-marker"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-ink">
                                            {format(new Date(lesson.date), 'M月d日（E）', { locale: ja })}
                                        </span>
                                        <LessonStatusBadge status={lesson.status} />
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-ink-light">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                                        </span>
                                        <span>{lesson.hours}時間</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Past lessons */}
            <Card padding="none">
                <CardHeader className="p-4 border-b border-paper-dark">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen size={18} className="text-ink-light" />
                        過去のレッスン
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {pastLessons.length > 0 ? (
                        <div className="space-y-3">
                            {pastLessons.map(lesson => (
                                <div
                                    key={lesson.id}
                                    className="p-3 rounded-lg hover:bg-paper transition-colors timeline-marker"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-ink">
                                            {format(new Date(lesson.date), 'M月d日（E）', { locale: ja })}
                                        </span>
                                        <LessonStatusBadge status={lesson.status} />
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-ink-light mb-2">
                                        <span>{lesson.hours}時間</span>
                                        <span>•</span>
                                        <span>{formatCurrency((lesson.amount || 0) + (lesson.transport_fee || 0))}</span>
                                    </div>

                                    {/* Homework */}
                                    {lesson.homework && (
                                        <div className="p-2 bg-ochre-subtle/30 rounded mt-2">
                                            <p className="text-xs text-ochre font-medium mb-1">📝 宿題</p>
                                            <p className="text-sm text-ink">{lesson.homework}</p>
                                        </div>
                                    )}

                                    {/* Memo (teacher's note) */}
                                    {lesson.memo && (
                                        <div className="p-2 bg-paper-dark/50 rounded mt-2">
                                            <p className="text-xs text-ink-faint mb-1">先生からのメモ</p>
                                            <p className="text-sm text-ink-light">{lesson.memo}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-ink-faint text-sm py-8 text-center">
                            まだレッスン履歴がありません
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
