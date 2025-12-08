import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherLayoutClient } from './teacher-layout-client'

export default async function TeacherLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single() as { data: { role: string; name: string } | null }

    if (!profile || profile.role !== 'teacher') {
        redirect('/parent/home')
    }

    return (
        <TeacherLayoutClient userName={profile.name}>
            {children}
        </TeacherLayoutClient>
    )
}
