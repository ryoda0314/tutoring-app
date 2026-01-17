'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { BookOpen, Users, LogIn, UserPlus } from 'lucide-react'

type UserRole = 'teacher' | 'parent'
type AuthMode = 'login' | 'signup'

export default function LoginPage() {
    const [authMode, setAuthMode] = useState<AuthMode>('login')
    const [role, setRole] = useState<UserRole>('parent')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
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
                    .single() as { data: { role: string } | null; error: any }

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

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください')
            setLoading(false)
            return
        }

        if (!name.trim()) {
            setError('お名前を入力してください')
            setLoading(false)
            return
        }

        const supabase = createClient()

        try {
            // Sign up the user
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            })

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('このメールアドレスは既に登録されています')
                } else {
                    setError(signUpError.message)
                }
                return
            }

            if (data.user) {
                // Create profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        role: role,
                        name: name.trim(),
                    } as any)

                if (profileError) {
                    console.error('Profile creation error:', profileError)
                    setError('プロフィールの作成に失敗しました')
                    return
                }

                setSuccess('確認メールを送信しました！メールのリンクをクリックしてアカウントを有効化してください。')
                setAuthMode('login')
                setPassword('')
                setEmail('')
                setName('')
            }
        } catch {
            setError('登録中にエラーが発生しました')
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
                        className="flex flex-col items-center"
                    >
                        <img src="/logo.png" alt="Tutorin" className="w-16 h-16 rounded-xl mb-4" />
                        <h1 className="text-3xl font-display text-ink mb-2">
                            Tutorin
                        </h1>
                        <p className="text-ink-light">
                            レッスン・日程・連絡を簡単に
                        </p>
                    </motion.div>
                </div>

                {/* Card */}
                <div className="card p-6 sm:p-8">
                    {/* Auth Mode Tabs (Login/Signup) */}
                    <div className="flex mb-6 border-b border-paper-dark">
                        <button
                            type="button"
                            onClick={() => { setAuthMode('login'); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all border-b-2 -mb-px ${authMode === 'login'
                                ? 'border-ink text-ink'
                                : 'border-transparent text-ink-faint hover:text-ink-light'
                                }`}
                        >
                            <LogIn size={18} />
                            ログイン
                        </button>
                        <button
                            type="button"
                            onClick={() => { setAuthMode('signup'); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all border-b-2 -mb-px ${authMode === 'signup'
                                ? 'border-ink text-ink'
                                : 'border-transparent text-ink-faint hover:text-ink-light'
                                }`}
                        >
                            <UserPlus size={18} />
                            新規登録
                        </button>
                    </div>

                    {/* Role Tabs */}
                    <div className="flex mb-6 bg-paper rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setRole('parent')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${role === 'parent'
                                ? 'bg-paper-light shadow-sm text-ink'
                                : 'text-ink-faint hover:text-ink-light'
                                }`}
                        >
                            <Users size={18} />
                            保護者
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('teacher')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${role === 'teacher'
                                ? 'bg-paper-light shadow-sm text-ink'
                                : 'text-ink-faint hover:text-ink-light'
                                }`}
                        >
                            <BookOpen size={18} />
                            先生
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-5">
                        {/* Name field (signup only) */}
                        {authMode === 'signup' && (
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-ink-light mb-2"
                                >
                                    {role === 'teacher' ? '先生のお名前' : '保護者のお名前'}
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input"
                                    placeholder={role === 'teacher' ? '山田 太郎' : '鈴木 花子'}
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        )}

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
                                {authMode === 'signup' && (
                                    <span className="text-ink-faint text-xs ml-2">（6文字以上）</span>
                                )}
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                                minLength={authMode === 'signup' ? 6 : undefined}
                            />
                        </div>

                        {/* Error message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 bg-accent-subtle rounded-lg"
                            >
                                <p className="text-sm text-accent">{error}</p>
                            </motion.div>
                        )}

                        {/* Success message */}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 bg-sage-subtle rounded-lg"
                            >
                                <p className="text-sm text-sage">{success}</p>
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
                                    {authMode === 'login' ? 'ログイン中...' : '登録中...'}
                                </span>
                            ) : (
                                authMode === 'login' ? 'ログイン' : 'アカウント作成'
                            )}
                        </button>
                    </form>

                    {/* Switch mode link */}
                    <p className="text-center text-sm text-ink-faint mt-6">
                        {authMode === 'login' ? (
                            <>
                                アカウントをお持ちでない方は{' '}
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('signup'); setError(null); }}
                                    className="text-ink hover:text-accent underline"
                                >
                                    新規登録
                                </button>
                            </>
                        ) : (
                            <>
                                既にアカウントをお持ちの方は{' '}
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('login'); setError(null); }}
                                    className="text-ink hover:text-accent underline"
                                >
                                    ログイン
                                </button>
                            </>
                        )}
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-ink-faint mt-6">
                    © 2024 Tutorin
                </p>
            </motion.div>
        </div>
    )
}
