import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatMakeupTime, formatExpirationStatus, daysUntilExpiration } from '@/lib/makeup'
import {
    Clock,
    User,
    AlertTriangle,
    ChevronRight,
} from 'lucide-react'
import type { MakeupCredit } from '@/types/database'

interface MakeupCreditWithRelations extends MakeupCredit {
    student: { id: string; name: string }
    origin_lesson: { date: string } | null
}

export default async function TeacherMakeupPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch all students with their makeup credits
    const { data: students } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('teacher_id', user.id)
        .order('name') as { data: { id: string; name: string; grade: string }[] | null }

    // Fetch all active makeup credits
    const { data: allCredits } = await supabase
        .from('makeup_credits')
        .select(`
      *,
      student:students!inner(id, name, teacher_id),
      origin_lesson:lessons(date)
    `)
        .eq('student.teacher_id', user.id)
        .gt('total_minutes', 0)
        .order('expires_at') as { data: MakeupCreditWithRelations[] | null }

    // Group credits by student
    const creditsByStudent = (allCredits || []).reduce((acc, credit) => {
        const studentId = credit.student_id
        if (!acc[studentId]) {
            acc[studentId] = {
                student: credit.student,
                credits: [],
                totalMinutes: 0,
                nearestExpiration: null as string | null,
            }
        }
        acc[studentId].credits.push(credit)
        acc[studentId].totalMinutes += credit.total_minutes
        if (!acc[studentId].nearestExpiration || new Date(credit.expires_at) < new Date(acc[studentId].nearestExpiration!)) {
            acc[studentId].nearestExpiration = credit.expires_at
        }
        return acc
    }, {} as Record<string, { student: { id: string; name: string }; credits: MakeupCreditWithRelations[]; totalMinutes: number; nearestExpiration: string | null }>)


    const studentsWithCredits = Object.values(creditsByStudent)

    // Separate expired warning credits (expiring in 7 days)
    const urgentCredits = studentsWithCredits.filter(
        s => s.nearestExpiration && daysUntilExpiration(s.nearestExpiration) <= 7
    )

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">振替管理</h1>

            {/* Urgent warning */}
            {urgentCredits.length > 0 && (
                <Card padding="md" className="bg-accent-subtle/30 border-accent-subtle">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-accent mb-1">
                                期限が近い振替があります
                            </p>
                            <ul className="space-y-1">
                                {urgentCredits.map(s => (
                                    <li key={s.student.id} className="text-sm text-ink-light">
                                        {s.student.name}: {formatMakeupTime(s.totalMinutes)} - {formatExpirationStatus(s.nearestExpiration!)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card padding="md">
                    <div className="text-center">
                        <p className="text-2xl font-display text-ink">
                            {studentsWithCredits.length}
                        </p>
                        <p className="text-sm text-ink-light">振替がある生徒</p>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="text-center">
                        <p className="text-2xl font-display text-ink">
                            {formatMakeupTime(studentsWithCredits.reduce((sum, s) => sum + s.totalMinutes, 0))}
                        </p>
                        <p className="text-sm text-ink-light">合計振替時間</p>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="text-center">
                        <p className="text-2xl font-display text-accent">
                            {urgentCredits.length}
                        </p>
                        <p className="text-sm text-ink-light">要注意</p>
                    </div>
                </Card>
            </div>

            {/* Students with credits */}
            {studentsWithCredits.length === 0 ? (
                <Card padding="lg" className="text-center">
                    <Clock size={48} className="mx-auto mb-4 text-ink-faint" />
                    <h2 className="font-display text-lg text-ink mb-2">振替時間はありません</h2>
                    <p className="text-ink-light">キャンセルされたレッスンの振替時間がここに表示されます</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {studentsWithCredits.map(({ student, credits, totalMinutes, nearestExpiration }) => (
                        <Link key={student.id} href={`/teacher/students/${student.id}`}>
                            <Card padding="md" className="cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-ochre-subtle flex items-center justify-center">
                                            <User size={20} className="text-ochre" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-ink">{student.name}</h3>
                                            <p className="text-sm text-ink-light">
                                                残り {formatMakeupTime(totalMinutes)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {nearestExpiration && (
                                            <span className={`text-sm ${daysUntilExpiration(nearestExpiration) <= 7 ? 'text-accent' : 'text-ink-faint'
                                                }`}>
                                                {formatExpirationStatus(nearestExpiration)}
                                            </span>
                                        )}
                                        <ChevronRight size={18} className="text-ink-faint" />
                                    </div>
                                </div>

                                {/* Credit breakdown */}
                                {credits && credits.length > 1 && (
                                    <div className="mt-3 pt-3 border-t border-paper-dark space-y-1">
                                        {credits.map((credit: { id: string; total_minutes: number; expires_at: string; origin_lesson?: { date: string } | null }) => (
                                            <div key={credit.id} className="flex items-center justify-between text-xs text-ink-faint">
                                                <span>
                                                    {credit.origin_lesson
                                                        ? `${format(new Date(credit.origin_lesson.date), 'M/d', { locale: ja })}キャンセル分`
                                                        : '振替時間'
                                                    }
                                                </span>
                                                <span>
                                                    {formatMakeupTime(credit.total_minutes)} - {formatExpirationStatus(credit.expires_at)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Rules info */}
            <Card padding="md" className="bg-paper-dark/30">
                <h3 className="font-display text-sm text-ink mb-2">振替ルール</h3>
                <ul className="space-y-1 text-xs text-ink-light">
                    <li>• キャンセルされたレッスンの時間が振替として加算されます</li>
                    <li>• 振替の有効期限は元のレッスン日から1ヶ月間です</li>
                    <li>• 期限を過ぎると振替時間は失効します</li>
                    <li>• 振替レッスンを予約すると残り時間から差し引かれます</li>
                </ul>
            </Card>
        </div>
    )
}
