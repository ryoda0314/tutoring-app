'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Select } from '@/components/ui/input'
import { Spinner } from '@/components/ui/loading'
import type { Message, Student, MessageType } from '@/types/database'
import {
    MessageSquare,
    Send,
    User,
    Pin,
    ChevronRight,
} from 'lucide-react'

const messageTypeOptions = [
    { value: '連絡事項', label: '連絡事項' },
    { value: '日程相談', label: '日程相談' },
    { value: '宿題', label: '宿題' },
    { value: '欠席連絡', label: '欠席連絡' },
]

export function TeacherMessagesClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialStudentId = searchParams.get('student')

    const [students, setStudents] = useState<Student[]>([])
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId)
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    const [newMessage, setNewMessage] = useState('')
    const [messageType, setMessageType] = useState<MessageType>('連絡事項')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Fetch students
    useEffect(() => {
        const fetchStudents = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('students')
                .select('*')
                .order('name')
            setStudents(data || [])
            setLoading(false)
        }
        fetchStudents()
    }, [])

    // Fetch messages when student is selected
    useEffect(() => {
        if (!selectedStudentId) {
            setMessages([])
            return
        }

        const fetchMessages = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('student_id', selectedStudentId)
                .order('created_at', { ascending: false })
            setMessages(data || [])
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
                    filter: `student_id=eq.${selectedStudentId}`,
                },
                (payload) => {
                    setMessages((prev) => [payload.new as Message, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedStudentId])

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedStudentId) return

        setSending(true)
        const supabase = createClient()

        await supabase.from('messages').insert({
            student_id: selectedStudentId,
            sender_type: 'teacher',
            body: newMessage.trim(),
            message_type: messageType,
        })

        setNewMessage('')
        setSending(false)
    }

    const handlePin = async (messageId: string, isPinned: boolean) => {
        const supabase = createClient()
        await supabase
            .from('messages')
            .update({ is_pinned: !isPinned })
            .eq('id', messageId)

        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, is_pinned: !isPinned } : m
        ))
    }

    const selectedStudent = students.find(s => s.id === selectedStudentId)

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-display text-ink">メッセージ</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Student list - sidebar */}
                <Card padding="none" className="lg:col-span-1 h-fit max-h-[70vh] overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-paper-dark bg-paper-light">
                        <h2 className="text-sm font-medium text-ink-light">生徒一覧</h2>
                    </div>
                    <div className="overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-4">
                                <Spinner />
                            </div>
                        ) : (
                            <div className="p-1">
                                {students.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`
                                            w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-colors
                                            ${selectedStudentId === student.id
                                                ? 'bg-ink text-paper-light'
                                                : 'hover:bg-paper-dark'
                                            }
                                        `}
                                    >
                                        <User size={14} />
                                        <span className="truncate">{student.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Message area - main content */}
                <div className="lg:col-span-3 space-y-3">
                    {selectedStudentId ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-sage" />
                                    <span className="font-display text-ink">{selectedStudent?.name}</span>
                                    <span className="text-xs text-ink-faint">{selectedStudent?.grade}</span>
                                </div>
                            </div>

                            {/* Input at top */}
                            <Card padding="sm" className="bg-paper-light">
                                <div className="flex items-start gap-2">
                                    <Select
                                        value={messageType}
                                        onChange={(e) => setMessageType(e.target.value as MessageType)}
                                        options={messageTypeOptions}
                                        className="w-24 text-xs"
                                    />
                                    <Textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="メッセージを入力..."
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

                            {/* Messages list - horizontal layout */}
                            <Card padding="none" className="overflow-hidden">
                                <div className="max-h-[55vh] overflow-y-auto">
                                    {messages.length === 0 ? (
                                        <div className="p-8 text-center text-ink-faint text-sm">
                                            メッセージがありません
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-paper-dark/50 sticky top-0">
                                                <tr className="text-left text-xs text-ink-faint">
                                                    <th className="p-2 w-20">日時</th>
                                                    <th className="p-2 w-16">送信者</th>
                                                    <th className="p-2 w-20">種別</th>
                                                    <th className="p-2">内容</th>
                                                    <th className="p-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {messages.map((message, index) => (
                                                    <motion.tr
                                                        key={message.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className={`border-b border-paper-dark/50 hover:bg-paper-dark/30 ${message.sender_type === 'teacher'
                                                                ? 'bg-sage-subtle/20'
                                                                : ''
                                                            } ${message.is_pinned ? 'bg-ochre-subtle/30' : ''}`}
                                                    >
                                                        <td className="p-2 text-xs text-ink-faint whitespace-nowrap">
                                                            {format(new Date(message.created_at), 'M/d H:mm', { locale: ja })}
                                                        </td>
                                                        <td className="p-2">
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${message.sender_type === 'teacher'
                                                                    ? 'bg-sage text-paper-light'
                                                                    : 'bg-ink-faint/20 text-ink'
                                                                }`}>
                                                                {message.sender_type === 'teacher' ? '先生' : '保護者'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2">
                                                            <span className="text-xs text-ink-light">
                                                                {message.message_type}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 text-ink">
                                                            <p className="line-clamp-2">{message.body}</p>
                                                        </td>
                                                        <td className="p-2">
                                                            {message.sender_type === 'teacher' && (
                                                                <button
                                                                    onClick={() => handlePin(message.id, message.is_pinned)}
                                                                    className={`p-1 rounded hover:bg-paper-dark ${message.is_pinned ? 'text-ochre' : 'text-ink-faint'
                                                                        }`}
                                                                >
                                                                    <Pin size={12} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </Card>
                        </>
                    ) : (
                        <Card padding="lg" className="text-center">
                            <MessageSquare size={32} className="mx-auto mb-3 text-ink-faint" />
                            <p className="text-ink-light text-sm">生徒を選択してメッセージを表示</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
