'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Select } from '@/components/ui/input'
import { MessageTypeBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/loading'
import type { Message, MessageType } from '@/types/database'
import {
    Send,
    Pin,
    MessageSquare,
    User,
} from 'lucide-react'

interface ParentMessagesClientProps {
    studentId: string
}

const messageTypeOptions = [
    { value: '連絡事項', label: '連絡事項' },
    { value: '日程相談', label: '日程相談' },
    { value: '宿題', label: '宿題の質問' },
    { value: '欠席連絡', label: '欠席連絡' },
]

export function ParentMessagesClient({ studentId }: ParentMessagesClientProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    const [newMessage, setNewMessage] = useState('')
    const [messageType, setMessageType] = useState<MessageType>('連絡事項')

    // Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false }) // Newest first
            setMessages(data || [])
            setLoading(false)
        }
        fetchMessages()

        // Real-time subscription
        const supabase = createClient()
        const channel = supabase
            .channel('messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `student_id=eq.${studentId}`,
                },
                (payload) => {
                    // Prepend new message since we are showing newest first
                    // Use functional update and check for duplicates
                    setMessages((prev) => {
                        const newMessage = payload.new as Message
                        if (prev.some(m => m.id === newMessage.id)) {
                            return prev
                        }
                        return [newMessage, ...prev]
                    })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `student_id=eq.${studentId}`,
                },
                (payload) => {
                    setMessages((prev) => prev.map(m =>
                        m.id === payload.new.id ? payload.new as Message : m
                    ))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [studentId])

    const handleSend = async () => {
        if (!newMessage.trim()) return

        setSending(true)
        const supabase = createClient()
        const messageBody = newMessage.trim()

        // Clear input immediately for better UX
        setNewMessage('')

        const { data, error } = await (supabase.from('messages') as any)
            .insert({
                student_id: studentId,
                sender_type: 'parent',
                body: messageBody,
                message_type: messageType,
            })
            .select() // Fetch the inserted data immediately
            .single()

        if (data) {
            setMessages((prev) => {
                if (prev.some(m => m.id === data.id)) return prev
                return [data, ...prev]
            })
        } else if (error) {
            // Restore input on error (optional, but good UX)
            setNewMessage(messageBody)
            console.error('Error sending message:', error)
        }

        setSending(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-display text-ink">メッセージ</h1>

            {/* Input Area (Top) */}
            <Card padding="sm" className="bg-paper-light">
                <div className="flex items-start gap-2">
                    <Select
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value as MessageType)}
                        options={messageTypeOptions}
                        className="w-32 text-xs"
                    />
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="先生へのメッセージを入力..."
                        className="flex-1 min-h-[40px] max-h-[80px] text-sm py-2"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    />
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSend}
                        isLoading={sending}
                        disabled={!newMessage.trim()}
                    >
                        <Send size={14} />
                    </Button>
                </div>
            </Card>

            {/* Messages List (Table Layout) */}
            <Card padding="none" className="overflow-hidden">
                <div className="max-h-[70vh] overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="p-8 text-center text-ink-faint text-sm">
                            メッセージがありません
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-paper-dark/50 sticky top-0">
                                <tr className="text-left text-xs text-ink-faint">
                                    <th className="p-2 w-24">日時</th>
                                    <th className="p-2 w-20">送信者</th>
                                    <th className="p-2 w-24">種別</th>
                                    <th className="p-2">内容</th>
                                    <th className="p-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map((message) => (
                                    <motion.tr
                                        key={message.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`
                                            border-b border-paper-dark/50 
                                            hover:bg-paper-dark/30 transition-colors
                                            ${message.is_pinned ? 'bg-ochre-subtle/30' : ''}
                                            ${message.sender_type === 'teacher' && !message.is_pinned ? 'bg-sage-subtle/10' : ''}
                                        `}
                                    >
                                        <td className="p-2 text-xs text-ink-faint whitespace-nowrap align-top">
                                            {format(new Date(message.created_at || new Date()), 'M/d H:mm', { locale: ja })}
                                        </td>
                                        <td className="p-2 whitespace-nowrap align-top">
                                            <span className={`text-xs px-1.5 py-0.5 rounded inline-block ${message.sender_type === 'teacher'
                                                ? 'bg-sage text-paper-light'
                                                : 'bg-ink-faint/20 text-ink'
                                                }`}>
                                                {message.sender_type === 'teacher' ? '先生' : '自分'}
                                            </span>
                                        </td>
                                        <td className="p-2 align-top">
                                            <MessageTypeBadge type={(message.message_type || '連絡事項') as MessageType} />
                                        </td>
                                        <td className="p-2 text-ink align-top">
                                            <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                                        </td>
                                        <td className="p-2 align-top text-center">
                                            {message.is_pinned && (
                                                <Pin size={14} className="text-ochre inline-block" />
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    )
}
