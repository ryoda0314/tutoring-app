import { Suspense } from 'react'
import { TeacherMessagesClient } from './messages-client'
import { PageLoading } from '@/components/ui/loading'

export default function TeacherMessagesPage() {
    return (
        <Suspense fallback={<PageLoading />}>
            <TeacherMessagesClient />
        </Suspense>
    )
}
