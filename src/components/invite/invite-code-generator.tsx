'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Copy, Check, Link, RefreshCw } from 'lucide-react'

interface InviteCodeGeneratorProps {
    studentId: string
    studentName: string
}

export function InviteCodeGenerator({ studentId, studentName }: InviteCodeGeneratorProps) {
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const generateCode = () => {
        // Generate 6-character alphanumeric code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    const handleGenerateInvite = async () => {
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('ログインが必要です')
            setLoading(false)
            return
        }

        const code = generateCode()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

        const { error: insertError } = await supabase
            .from('student_invites')
            .insert({
                student_id: studentId,
                invite_code: code,
                created_by: user.id,
                expires_at: expiresAt.toISOString(),
            })

        if (insertError) {
            console.error('Invite error:', insertError)
            setError('招待コードの生成に失敗しました')
        } else {
            setInviteCode(code)
        }

        setLoading(false)
    }

    const handleCopy = async () => {
        if (!inviteCode) return

        try {
            await navigator.clipboard.writeText(inviteCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea')
            textArea.value = inviteCode
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
                <Link size={18} className="text-sage" />
                <h3 className="font-display text-ink">保護者を招待</h3>
            </div>

            {!inviteCode ? (
                <div>
                    <p className="text-sm text-ink-light mb-4">
                        {studentName}さんの保護者を招待するコードを生成します。
                        保護者はこのコードを使って登録できます。
                    </p>

                    {error && (
                        <p className="text-sm text-accent mb-3">{error}</p>
                    )}

                    <button
                        onClick={handleGenerateInvite}
                        disabled={loading}
                        className="btn btn-primary w-full py-2"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <RefreshCw size={16} className="animate-spin" />
                                生成中...
                            </span>
                        ) : (
                            '招待コードを生成'
                        )}
                    </button>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <p className="text-sm text-ink-light mb-3">
                        以下のコードを保護者に共有してください（7日間有効）
                    </p>

                    <div className="flex items-center gap-2 p-3 bg-sage-subtle rounded-lg">
                        <span className="flex-1 font-mono text-2xl text-center tracking-widest text-sage font-bold">
                            {inviteCode}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-sage/10 rounded transition-colors"
                            title="コピー"
                        >
                            {copied ? (
                                <Check size={20} className="text-sage" />
                            ) : (
                                <Copy size={20} className="text-ink-faint" />
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-ink-faint mt-3 text-center">
                        保護者は登録時にこのコードを入力します
                    </p>

                    <button
                        onClick={() => setInviteCode(null)}
                        className="btn btn-secondary w-full mt-4 py-2"
                    >
                        新しいコードを生成
                    </button>
                </motion.div>
            )}
        </div>
    )
}
