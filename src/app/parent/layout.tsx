import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentLayoutClient } from './parent-layout-client'

export default async function ParentLayout({
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
        .select('role, name, student_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'parent') {
        redirect('/teacher/dashboard')
    }

    // Fetch student name if linked
    let studentName: string | undefined
    if (profile.student_id) {
        const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('id', profile.student_id)
            .single()
        studentName = student?.name
    }

    return (
        <ParentLayoutClient userName={profile.name} studentName={studentName}>
            {children}
        </ParentLayoutClient>
    )
}
