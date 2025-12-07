import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MakeupRequestForm } from '@/components/makeup/makeup-request-form'
import { Card } from '@/components/ui/card'
import { formatMakeupTime, formatExpirationStatus, daysUntilExpiration } from '@/lib/makeup'
import Link from 'next/link'
import {
    ArrowLeft,
    Clock,
    AlertTriangle,
    Info,
} from 'lucide-react'

export default async function ParentMakeupRequestPage() {
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
        redirect('/parent/setup')
    }

    // Fetch makeup credits
    const { data: makeupCredits } = await supabase
        .from('makeup_credits')
        .select('*')
        .eq('student_id', profile.student_id)
        .gt('total_minutes', 0)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at')

    const activeCredits = makeupCredits || []
    const hasUrgentCredits = activeCredits.some(c => daysUntilExpiration(c.expires_at) <= 7)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/parent/makeup">
                    <button className="btn btn-secondary p-2">
                        <ArrowLeft size={18} />
                    </button>
                </Link>
                <div>
                    <h1 className="text-2xl font-display text-ink">振替申請</h1>
                    <p className="text-ink-light text-sm">振替時間を使ってレッスンを予約</p>
                </div>
            </div>

            {/* Urgent warning */}
            {hasUrgentCredits && (
                <Card padding="md" className="bg-accent-subtle/30 border-accent-subtle">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-accent">期限が近い振替があります</p>
                            <p className="text-sm text-ink-light mt-1">
                                期限切れの振替時間は失効します。お早めにご予約ください。
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Makeup request form */}
            <MakeupRequestForm
                studentId={profile.student_id}
                makeupCredits={activeCredits}
            />

            {/* Info */}
            <Card padding="md" className="bg-paper-dark/30">
                <div className="flex items-start gap-3">
                    <Info size={18} className="text-ink-faint flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-display text-sm text-ink mb-2">振替申請について</h3>
                        <ul className="space-y-1 text-xs text-ink-light">
                            <li>• 申請後、先生の承認が必要です</li>
                            <li>• 承認されると振替時間が差し引かれます</li>
                            <li>• 期限切れの振替時間は使用できません</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    )
}
