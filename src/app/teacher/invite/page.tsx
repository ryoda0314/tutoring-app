import { TeacherInviteGenerator } from '@/components/invite/teacher-invite-generator'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { UserPlus, Check, Clock, Users } from 'lucide-react'
import type { StudentInvite } from '@/types/database'

export default async function TeacherInvitePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch recent invites
    const { data: recentInvites } = await supabase
        .from('student_invites')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10) as { data: StudentInvite[] | null }

    const activeInvites = recentInvites?.filter(
        i => !i.used_by && new Date(i.expires_at) > new Date()
    ) || []

    const usedInvites = recentInvites?.filter(i => i.used_by) || []

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-display text-ink">保護者招待</h1>
                <p className="text-ink-light">新しい生徒の保護者を招待してつながりましょう</p>
            </div>

            {/* Generator */}
            <TeacherInviteGenerator />

            {/* Active invites */}
            {activeInvites.length > 0 && (
                <Card padding="md">
                    <h3 className="font-display text-ink mb-3 flex items-center gap-2">
                        <Clock size={18} className="text-ochre" />
                        有効な招待コード
                    </h3>
                    <div className="space-y-2">
                        {activeInvites.map(invite => (
                            <div
                                key={invite.id}
                                className="flex items-center justify-between p-3 bg-ochre-subtle/30 rounded-lg"
                            >
                                <span className="font-mono text-lg tracking-widest text-ink">
                                    {invite.invite_code}
                                </span>
                                <span className="text-xs text-ink-faint">
                                    {format(new Date(invite.expires_at), 'M/d HH:mm', { locale: ja })}まで
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Used invites */}
            {usedInvites.length > 0 && (
                <Card padding="md">
                    <h3 className="font-display text-ink mb-3 flex items-center gap-2">
                        <Check size={18} className="text-sage" />
                        使用済み招待
                    </h3>
                    <div className="space-y-2">
                        {usedInvites.map(invite => (
                            <div
                                key={invite.id}
                                className="flex items-center justify-between p-3 bg-sage-subtle/30 rounded-lg"
                            >
                                <span className="font-mono text-ink-faint line-through">
                                    {invite.invite_code}
                                </span>
                                <span className="text-xs text-sage">
                                    {format(new Date(invite.used_at!), 'M/d HH:mm', { locale: ja })}に使用
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Info */}
            <Card padding="md" className="bg-paper-dark/30">
                <div className="flex items-start gap-3">
                    <Users size={18} className="text-ink-faint flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-display text-sm text-ink mb-2">招待の流れ</h3>
                        <ol className="space-y-1 text-xs text-ink-light list-decimal list-inside">
                            <li>招待コードを生成して保護者に共有</li>
                            <li>保護者がアプリに登録してコードを入力</li>
                            <li>保護者が生徒情報を入力</li>
                            <li>自動的に先生と連携完了！</li>
                        </ol>
                    </div>
                </div>
            </Card>
        </div>
    )
}
