'use client'

import { useState, useEffect, useRef } from 'react'
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

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: true })
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
                    setMessages((prev) => [...prev, payload.new as Message])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [studentId])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim()) return

        setSending(true)
        const supabase = createClient()

        await supabase.from('messages').insert({
            student_id: studentId,
            sender_type: 'parent',
            body: newMessage.trim(),
            message_type: messageType,
        })

        setNewMessage('')
        setSending(false)
    }

    // Get pinned messages
    const pinnedMessages = messages.filter(m => m.is_pinned)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-display text-ink">先生との連絡</h1>

            {/* Pinned messages */}
            {pinnedMessages.length > 0 && (
                <Card padding="md" className="bg-ochre-subtle/30 border-ochre-subtle">
                    <div className="flex items-center gap-2 mb-3">
                        <Pin size={16} className="text-ochre" />
                        <span className="text-sm font-medium text-ochre">固定メッセージ</span>
                    </div>
                    <div className="space-y-2">
                        {pinnedMessages.map(message => (
                            <div key={message.id} className="p-2 bg-paper-light rounded">
                                <p className="text-sm text-ink">{message.body}</p>
                                <p className="text-xs text-ink-faint mt-1">
                                    {format(new Date(message.created_at), 'M/d H:mm', { locale: ja })}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Messages */}
            <Card padding="none" className="h-[50vh] flex flex-col overflow-hidden">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <MessageSquare size={40} className="mx-auto mb-3 text-ink-faint" />
                                <p className="text-ink-light text-sm">メッセージはまだありません</p>
                            </div>
                        </div>
                    ) : (
                        messages.map(message => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${message.sender_type === 'parent' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-3 rounded-lg ${message.sender_type === 'parent'
                                            ? 'bg-ink text-paper-light rounded-br-sm'
                                            : 'bg-paper-dark text-ink rounded-bl-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageTypeBadge type={message.message_type} />
                                        {message.sender_type === 'teacher' && (
                                            <span className={`text-xs ${message.sender_type === 'parent' ? 'text-paper-light/70' : 'text-ink-faint'
                                                }`}>
                                                先生
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                                    <p className={`text-xs mt-2 ${message.sender_type === 'parent' ? 'text-paper-light/60' : 'text-ink-faint'
                                        }`}>
                                        {format(new Date(message.created_at), 'M/d H:mm', { locale: ja })}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-paper-dark">
                    <div className="flex gap-2 mb-2">
                        <Select
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value as MessageType)}
                            options={messageTypeOptions}
                            className="w-36"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="先生へのメッセージを入力..."
                            className="flex-1 min-h-[60px] max-h-[120px]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                        />
                        <Button
                            variant="primary"
                            onClick={handleSend}
                            isLoading={sending}
                            disabled={!newMessage.trim()}
                            className="self-end"
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Tips */}
            <p className="text-xs text-ink-faint text-center">
                Shift + Enterで改行、Enterで送信
            </p>
        </div>
    )
}
