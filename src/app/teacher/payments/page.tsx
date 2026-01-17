import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PaymentsClient } from './payments-client'

export default async function TeacherPaymentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get all students for this teacher
    const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .eq('teacher_id', user.id)
        .order('name')

    // Get all payments with pending reports (payment_reported_at is set but payment_confirmed_at is null)
    const { data: payments } = await supabase
        .from('monthly_payments')
        .select(`
            *,
            student:students!inner(id, name, teacher_id)
        `)
        .eq('student.teacher_id', user.id)
        .not('payment_reported_at', 'is', null)
        .order('payment_reported_at', { ascending: false })

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">振込管理</h1>
            <PaymentsClient
                students={students || []}
                payments={payments || []}
            />
        </div>
    )
}
