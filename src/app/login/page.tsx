'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { BookOpen, Users } from 'lucide-react'

type LoginMode = 'teacher' | 'parent'

export default function LoginPage() {
    const [mode, setMode] = useState<LoginMode>('parent')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                setError('メールアドレスまたはパスワードが正しくありません')
                return
            }

            if (data.user) {
                // Fetch profile to determine redirect
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single()

                if (profileError || !profile) {
                    setError('プロフィールが見つかりません。管理者にお問い合わせください。')
                    await supabase.auth.signOut()
                    return
                }

                // Redirect based on role
                if (profile.role === 'teacher') {
                    router.push('/teacher/dashboard')
                } else {
                    router.push('/parent/home')
                }
                router.refresh()
            }
        } catch {
            setError('ログイン中にエラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl font-display text-ink mb-2">
                            家庭教師管理
                        </h1>
                        <p className="text-ink-light">
                            レッスン・日程・連絡を簡単に
                        </p>
                    </motion.div>
                </div>

                {/* Login Card */}
                <div className="card p-6 sm:p-8">
                    {/* Mode Tabs */}
                    <div className="flex mb-6 bg-paper rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setMode('parent')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${mode === 'parent'
                                    ? 'bg-paper-light shadow-sm text-ink'
                                    : 'text-ink-faint hover:text-ink-light'
                                }`}
                        >
                            <Users size={18} />
                            保護者ログイン
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('teacher')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${mode === 'teacher'
                                    ? 'bg-paper-light shadow-sm text-ink'
                                    : 'text-ink-faint hover:text-ink-light'
                                }`}
                        >
                            <BookOpen size={18} />
                            先生ログイン
                        </button>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-ink-light mb-2"
                            >
                                メールアドレス
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="example@email.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-ink-light mb-2"
                            >
                                パスワード
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 bg-accent-subtle rounded-lg"
                            >
                                <p className="text-sm text-accent">{error}</p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    ログイン中...
                                </span>
                            ) : (
                                'ログイン'
                            )}
                        </button>
                    </form>

                    {/* Help text */}
                    <p className="text-center text-sm text-ink-faint mt-6">
                        アカウントをお持ちでない方は
                        <br />
                        先生にお問い合わせください
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-ink-faint mt-6">
                    © 2024 家庭教師管理アプリ
                </p>
            </motion.div>
        </div>
    )
}
