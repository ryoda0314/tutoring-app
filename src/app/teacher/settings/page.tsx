import { Suspense } from 'react'
import { TeacherSettingsClient } from './settings-client'
import { PageLoading } from '@/components/ui/loading'

export default function TeacherSettingsPage() {
    return (
        <Suspense fallback={<PageLoading />}>
            <TeacherSettingsClient />
        </Suspense>
    )
}
