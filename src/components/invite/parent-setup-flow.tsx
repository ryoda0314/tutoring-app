'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { KeyRound, Check, AlertCircle, ChevronRight } from 'lucide-react'
import { StudentRegistrationForm } from './student-registration-form'

export function ParentSetupFlow() {
    const [step, setStep] = useState<'code' | 'register'>('code')
    const [code, setCode] = useState('')
    const [teacherId, setTeacherId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCodeSubmit = async (e: React.FormEvent) => {
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

        // Find the invite by code
        const { data: invite, error: findError } = await supabase
            .from('student_invites')
            .select('*, teacher:profiles!created_by(id, name)')
            .eq('invite_code', code.toUpperCase().trim())
            .is('used_by', null)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (findError || !invite) {
            setError('無効または期限切れの招待コードです')
            setLoading(false)
            return
        }

        // Mark invite as used
        const { error: updateError } = await supabase
            .from('student_invites')
            .update({
                used_by: user.id,
                used_at: new Date().toISOString(),
            })
            .eq('id', invite.id)

        if (updateError) {
            setError('招待コードの使用に失敗しました')
            setLoading(false)
            return
        }

        setTeacherId(invite.created_by)
        setStep('register')
        setLoading(false)
    }

    if (step === 'register' && teacherId) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto mb-3 bg-sage-subtle rounded-full flex items-center justify-center">
                        <Check size={24} className="text-sage" />
                    </div>
                    <p className="text-sm text-sage font-medium">招待コード確認完了</p>
                </div>
                <StudentRegistrationForm teacherId={teacherId} />
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
                先生から受け取った6桁の招待コードを入力してください
            </p>

            <form onSubmit={handleCodeSubmit}>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="input text-center font-mono text-2xl tracking-widest uppercase mb-4"
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
                    className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? '確認中...' : (
                        <>
                            次へ
                            <ChevronRight size={18} />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
