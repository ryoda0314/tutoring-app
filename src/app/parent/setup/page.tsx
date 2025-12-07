import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentSetupFlow } from '@/components/invite/parent-setup-flow'
import { GraduationCap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function ParentSetupPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Check if already linked to a student
    const { data: profile } = await supabase
        .from('profiles')
        .select('student_id, name')
        .eq('id', user.id)
        .single()

    // If already linked, redirect to home
    if (profile?.student_id) {
        redirect('/parent/home')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-paper">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-ochre-subtle rounded-full flex items-center justify-center">
                        <GraduationCap size={32} className="text-ochre" />
                    </div>
                    <h1 className="text-2xl font-display text-ink mb-2">
                        ようこそ、{profile?.name}さん
                    </h1>
                    <p className="text-ink-light">
                        お子様の情報を登録してください
                    </p>
                </div>

                <ParentSetupFlow />

                <div className="mt-6 text-center">
                    <p className="text-sm text-ink-faint mb-2">
                        招待コードをお持ちでない場合は
                    </p>
                    <p className="text-sm text-ink-light">
                        先生にお問い合わせください
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <Link
                        href="/login"
                        className="text-sm text-ink-faint hover:text-ink flex items-center justify-center gap-1"
                    >
                        別のアカウントでログイン
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    )
}
