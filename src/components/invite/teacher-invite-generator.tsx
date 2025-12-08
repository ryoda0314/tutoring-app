'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Copy, Check, UserPlus, RefreshCw, MessageSquare } from 'lucide-react'

export function TeacherInviteGenerator() {
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [copiedMessage, setCopiedMessage] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getMessageTemplate = (code: string) => {
        return `【Tutorin招待】

こんにちは！レッスン管理アプリ「Tutorin」への招待です。

▼ 登録手順
1. 下記のURLからアカウントを作成してください
https://tutorin-blush.vercel.app/login

2. 新規登録後、以下の招待コードを入力してください

招待コード: ${code}

※このコードは7日間有効です

ご不明な点がありましたらお気軽にご連絡ください。`
    }

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    const handleGenerate = async () => {
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
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { error: insertError } = await (supabase
            .from('student_invites') as any)
            .insert({
                student_id: null, // 新しいフローでは生徒IDなし
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

    const handleCopyMessage = async () => {
        if (!inviteCode) return
        const message = getMessageTemplate(inviteCode)

        try {
            await navigator.clipboard.writeText(message)
            setCopiedMessage(true)
            setTimeout(() => setCopiedMessage(false), 2000)
        } catch {
            const textArea = document.createElement('textarea')
            textArea.value = message
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
            setCopiedMessage(true)
            setTimeout(() => setCopiedMessage(false), 2000)
        }
    }

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-sage-subtle flex items-center justify-center">
                    <UserPlus size={20} className="text-sage" />
                </div>
                <div>
                    <h3 className="font-display text-lg text-ink">保護者を招待</h3>
                    <p className="text-sm text-ink-light">新しい生徒の保護者を招待します</p>
                </div>
            </div>

            {!inviteCode ? (
                <div>
                    <p className="text-sm text-ink-light mb-4">
                        招待コードを生成して保護者に共有してください。
                        保護者はこのコードを使って登録し、生徒情報を入力します。
                    </p>

                    {error && (
                        <p className="text-sm text-accent mb-3">{error}</p>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="btn btn-primary w-full py-3"
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

                    <div className="flex items-center gap-2 p-4 bg-sage-subtle rounded-lg">
                        <span className="flex-1 font-mono text-3xl text-center tracking-[0.3em] text-sage font-bold">
                            {inviteCode}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="p-3 hover:bg-sage/20 rounded-lg transition-colors"
                            title="コピー"
                        >
                            {copied ? (
                                <Check size={24} className="text-sage" />
                            ) : (
                                <Copy size={24} className="text-ink-faint" />
                            )}
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-paper rounded-lg">
                        <p className="text-xs text-ink-faint text-center">
                            保護者はこのコードでアカウント登録後、<br />
                            生徒情報を入力してあなたと連携します
                        </p>
                    </div>

                    <button
                        onClick={() => setInviteCode(null)}
                        className="btn btn-secondary w-full mt-4 py-2"
                    >
                        新しいコードを生成
                    </button>

                    {/* Copy message template button */}
                    <button
                        onClick={handleCopyMessage}
                        className="btn btn-primary w-full mt-3 py-3 flex items-center justify-center gap-2"
                    >
                        {copiedMessage ? (
                            <>
                                <Check size={18} />
                                コピーしました！
                            </>
                        ) : (
                            <>
                                <MessageSquare size={18} />
                                保護者への案内メッセージをコピー
                            </>
                        )}
                    </button>
                </motion.div>
            )}
        </div>
    )
}
