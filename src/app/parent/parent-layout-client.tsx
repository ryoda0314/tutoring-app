'use client'

import { ParentLayout as ParentLayoutComponent } from '@/components/layout/parent-layout'

interface ParentLayoutClientProps {
    children: React.ReactNode
    userName?: string
    studentName?: string
}

export function ParentLayoutClient({ children, userName, studentName }: ParentLayoutClientProps) {
    return (
        <ParentLayoutComponent userName={userName} studentName={studentName}>
            {children}
        </ParentLayoutComponent>
    )
}
