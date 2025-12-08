'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { KeyRound, Check, AlertCircle } from 'lucide-react'

export function InviteCodeInput() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('ログインが必要です')
            setLoading(false)
            return
        }

        // Find the invite
        const { data: invite, error: findError } = await supabase
            .from('student_invites')
            .select('*, student:students(id, name)')
            .eq('invite_code', code.toUpperCase().trim())
            .is('used_by', null)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (findError || !invite) {
            setError('無効または期限切れの招待コードです')
            setLoading(false)
            return
        }

        // Update the invite as used
        const { error: updateInviteError } = await supabase
            .from('student_invites')
            .update({
                used_by: user.id,
                used_at: new Date().toISOString(),
            })
            .eq('id', invite.id)

        if (updateInviteError) {
            setError('招待コードの使用に失敗しました')
            setLoading(false)
            return
        }

        // Update parent profile with student_id
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ student_id: invite.student_id })
            .eq('id', user.id)

        if (updateProfileError) {
            setError('プロフィールの更新に失敗しました')
            setLoading(false)
            return
        }

        setSuccess(true)
        setTimeout(() => {
            router.push('/parent/home')
            router.refresh()
        }, 1500)

        setLoading(false)
    }

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-6 text-center"
            >
                <div className="w-16 h-16 mx-auto mb-4 bg-sage-subtle rounded-full flex items-center justify-center">
                    <Check size={32} className="text-sage" />
                </div>
                <h3 className="font-display text-lg text-ink mb-2">登録完了！</h3>
                <p className="text-ink-light">ホーム画面へ移動中...</p>
            </motion.div>
        )
    }

    return (
        <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
                <KeyRound size={20} className="text-ochre" />
                <h3 className="font-display text-lg text-ink">招待コードを入力</h3>
            </div>

            <p className="text-sm text-ink-light mb-4">
                先生から受け取った招待コードを入力して、お子様の情報と連携してください。
            </p>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="例: ABC123"
                    className="input text-center font-mono text-xl tracking-widest uppercase mb-4"
                    maxLength={6}
                    required
                />

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 p-3 bg-accent-subtle rounded-lg mb-4"
                    >
                        <AlertCircle size={16} className="text-accent" />
                        <p className="text-sm text-accent">{error}</p>
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading || code.length < 6}
                    className="btn btn-primary w-full py-3 disabled:opacity-50"
                >
                    {loading ? '確認中...' : '連携する'}
                </button>
            </form>
        </div>
    )
}
