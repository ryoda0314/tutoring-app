'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    Users,
    Calendar,
    CalendarClock,
    MessageSquare,
    Clock,
    LogOut,
    Menu,
    X,
    UserPlus,
} from 'lucide-react'
import { useState } from 'react'

const teacherNavItems = [
    { href: '/teacher/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/teacher/students', label: '生徒一覧', icon: Users },
    { href: '/teacher/invite', label: '保護者招待', icon: UserPlus },
    { href: '/teacher/schedule-requests', label: '日程リクエスト', icon: CalendarClock },
    { href: '/teacher/calendar', label: 'カレンダー', icon: Calendar },
    { href: '/teacher/messages', label: 'メッセージ', icon: MessageSquare },
    { href: '/teacher/makeup', label: '振替管理', icon: Clock },
]

interface TeacherLayoutProps {
    children: React.ReactNode
    userName?: string
}

export function TeacherLayout({ children, userName }: TeacherLayoutProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-paper-light border-r border-paper-dark">
                {/* Logo/Header */}
                <div className="p-6 border-b border-paper-dark">
                    <Link href="/teacher/dashboard" className="block">
                        <h1 className="font-display text-xl text-ink">
                            家庭教師管理
                        </h1>
                        <p className="text-xs text-ink-faint mt-1">
                            先生用ダッシュボード
                        </p>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {teacherNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg
                  text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                                        ? 'bg-ink text-paper-light'
                                        : 'text-ink-light hover:bg-paper hover:text-ink'
                                    }
                `}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-paper-dark">
                    {userName && (
                        <p className="text-sm text-ink-light mb-3 px-2 truncate">
                            {userName}先生
                        </p>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-ink-faint hover:bg-paper hover:text-accent transition-colors"
                    >
                        <LogOut size={18} />
                        ログアウト
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-paper-light border-b border-paper-dark z-40 flex items-center justify-between px-4">
                <Link href="/teacher/dashboard" className="font-display text-lg text-ink">
                    家庭教師管理
                </Link>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-paper"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="lg:hidden fixed inset-0 bg-ink/20 z-30"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: mobileMenuOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-paper-light border-r border-paper-dark z-30 overflow-y-auto"
            >
                <nav className="p-4 space-y-1">
                    {teacherNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                                        ? 'bg-ink text-paper-light'
                                        : 'text-ink-light hover:bg-paper hover:text-ink'
                                    }
                `}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-paper-dark">
                    {userName && (
                        <p className="text-sm text-ink-light mb-3 px-2 truncate">
                            {userName}先生
                        </p>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-ink-faint hover:bg-paper hover:text-accent transition-colors"
                    >
                        <LogOut size={18} />
                        ログアウト
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-0">
                <div className="lg:hidden h-16" /> {/* Spacer for mobile header */}
                <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
