import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentMessagesClient } from './messages-client'
import { GraduationCap } from 'lucide-react'

export default async function ParentMessagesPage() {
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

    return <ParentMessagesClient studentId={profile.student_id} />
}
