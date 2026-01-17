'use client'

import { TeacherLayout as TeacherLayoutComponent } from '@/components/layout/teacher-layout'

interface TeacherLayoutClientProps {
    children: React.ReactNode
    userName?: string
}

export function TeacherLayoutClient({ children, userName }: TeacherLayoutClientProps) {
    return (
        <TeacherLayoutComponent userName={userName}>
            {children}
        </TeacherLayoutComponent>
    )
}
