import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { formatMakeupTime, formatExpirationStatus, daysUntilExpiration } from '@/lib/makeup'
import type { MakeupCredit } from '@/types/database'
import {
    Clock,
    AlertTriangle,
    GraduationCap,
    Info,
    CalendarPlus,
} from 'lucide-react'

export default async function ParentMakeupPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get parent's student_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', user.id)
        .single() as { data: { student_id: string | null } | null }

    if (!profile?.student_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <GraduationCap size={48} className="text-ink-faint mb-4" />
                <h2 className="text-xl font-display text-ink mb-2">生徒情報が登録されていません</h2>
                <p className="text-ink-light">先生に連絡してアカウントの設定を完了してください</p>
            </div>
        )
    }

    // Fetch makeup credits
    const { data: makeupCredits } = await (supabase
        .from('makeup_credits') as any)
        .select('*')
        .eq('student_id', profile.student_id)
        .gt('total_minutes', 0)
        .order('expires_at')

    // Separate active and expired soon credits
    const activeCredits = (makeupCredits?.filter(
        (c: MakeupCredit) => new Date(c.expires_at) > new Date()
    ) || []) as MakeupCredit[]

    const totalMinutes = activeCredits.reduce((sum: number, c: MakeupCredit) => sum + c.total_minutes, 0)
    const nearestExpiration = activeCredits[0]?.expires_at
    const isUrgent = nearestExpiration && daysUntilExpiration(nearestExpiration) <= 7

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">振替確認</h1>

            {/* Total remaining */}
            <Card padding="lg" className={isUrgent ? 'bg-accent-subtle/20 border-accent-subtle' : 'bg-sage-subtle/20 border-sage-subtle'}>
                <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-accent/20' : 'bg-sage/20'
                        }`}>
                        <Clock size={28} className={isUrgent ? 'text-accent' : 'text-sage'} />
                    </div>
                    <div>
                        <p className="text-sm text-ink-faint mb-1">残り振替時間</p>
                        <p className="text-3xl font-display text-ink">
                            {formatMakeupTime(totalMinutes)}
                        </p>
                        {nearestExpiration && (
                            <p className={`text-sm mt-1 ${isUrgent ? 'text-accent' : 'text-ink-light'}`}>
                                最短期限: {formatExpirationStatus(nearestExpiration)}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Request button */}
            {totalMinutes >= 60 && (
                <Link href="/parent/makeup/request">
                    <button className="btn btn-primary w-full py-3 flex items-center justify-center gap-2">
                        <CalendarPlus size={20} />
                        振替レッスンを申請する
                    </button>
                </Link>
            )}

            {/* Urgent warning */}
            {isUrgent && (
                <div className="flex items-start gap-3 p-4 bg-accent-subtle rounded-lg">
                    <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-accent">期限が近づいています</p>
                        <p className="text-sm text-ink-light mt-1">
                            振替時間は期限を過ぎると失効します。お早めに振替レッスンをご予約ください。
                        </p>
                    </div>
                </div>
            )}

            {/* Credit list */}
            {activeCredits.length > 0 ? (
                <div className="space-y-3">
                    {activeCredits.map((credit) => {
                        const urgent = daysUntilExpiration(credit.expires_at) <= 7
                        return (
                            <Card
                                key={credit.id}
                                padding="md"
                                className={urgent ? 'border-accent-subtle' : ''}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-ink">
                                            {formatMakeupTime(credit.total_minutes)}
                                        </p>
                                        <p className="text-sm text-ink-light">振替時間</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-medium ${urgent ? 'text-accent' : 'text-ink-faint'}`}>
                                            {formatExpirationStatus(credit.expires_at)}
                                        </p>
                                        {/* Progress bar */}
                                        <div className="w-24 h-1.5 bg-paper-dark rounded-full mt-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${urgent ? 'bg-accent' : 'bg-ochre'}`}
                                                style={{
                                                    width: `${Math.max(10, Math.min(100, daysUntilExpiration(credit.expires_at) / 30 * 100))}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <Card padding="lg" className="text-center">
                    <Clock size={48} className="mx-auto mb-4 text-ink-faint" />
                    <h2 className="font-display text-lg text-ink mb-2">振替時間はありません</h2>
                    <p className="text-ink-light">
                        キャンセルが発生した場合、こちらに振替時間が表示されます
                    </p>
                </Card>
            )}

            {/* Rules info */}
            <Card padding="md" className="bg-paper-dark/30">
                <div className="flex items-start gap-3">
                    <Info size={18} className="text-ink-faint flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-display text-sm text-ink mb-2">振替について</h3>
                        <ul className="space-y-1 text-xs text-ink-light">
                            <li>• キャンセルされたレッスンの時間が振替として付与されます</li>
                            <li>• 振替の有効期限は元のレッスン日から<span className="text-ochre font-medium">1ヶ月間</span>です</li>
                            <li>• 期限を過ぎた振替時間は失効し、返金対象外となります</li>
                            <li>• 振替レッスンのご予約は「日程予約」ページからお願いします</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    )
}
