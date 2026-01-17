import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StudentEditForm } from './student-edit-form'
import type { Student } from '@/types/database'
import { ArrowLeft } from 'lucide-react'

export default async function TeacherStudentEditPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch student
    const { data: student } = await (supabase
        .from('students') as any)
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user.id)
        .single() as { data: Student | null }

    if (!student) {
        notFound()
    }

    return (
        <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/teacher/students/${id}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-display text-ink">生徒情報を編集</h1>
                    <p className="text-ink-light">{student.name}</p>
                </div>
            </div>

            <StudentEditForm student={student} />
        </div>
    )
}
