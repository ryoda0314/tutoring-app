'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Select } from '@/components/ui/input'
import { MessageTypeBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/loading'
import type { Message, Student, MessageType } from '@/types/database'
import {
    MessageSquare,
    Send,
    User,
    Pin,
    ChevronRight,
} from 'lucide-react'

interface MessageWithStudent extends Message {
    student?: Student
}

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
                .order('created_at', { ascending: true })
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
                    setMessages((prev) => [...prev, payload.new as Message])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedStudentId])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

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
        <div className="h-[calc(100vh-12rem)] flex gap-6">
            {/* Student list */}
            <div className="w-72 flex-shrink-0 hidden md:block">
                <Card padding="none" className="h-full overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-paper-dark">
                        <h2 className="font-display text-lg text-ink">メッセージ</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Spinner />
                            </div>
                        ) : students.length === 0 ? (
                            <p className="text-ink-faint text-sm p-4 text-center">
                                生徒がいません
                            </p>
                        ) : (
                            <div className="p-2 space-y-1">
                                {students.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`
                      w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                      ${selectedStudentId === student.id
                                                ? 'bg-ink text-paper-light'
                                                : 'hover:bg-paper-dark'
                                            }
                    `}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedStudentId === student.id ? 'bg-paper-light/20' : 'bg-sage-subtle'
                                            }`}>
                                            <User size={20} className={selectedStudentId === student.id ? 'text-paper-light' : 'text-sage'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{student.name}</p>
                                            <p className={`text-xs truncate ${selectedStudentId === student.id ? 'text-paper-light/70' : 'text-ink-faint'
                                                }`}>
                                                {student.grade}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="opacity-50" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Mobile student selector */}
            <div className="md:hidden mb-4">
                <Select
                    value={selectedStudentId || ''}
                    onChange={(e) => setSelectedStudentId(e.target.value || null)}
                    options={[
                        { value: '', label: '生徒を選択' },
                        ...students.map(s => ({ value: s.id, label: s.name })),
                    ]}
                />
            </div>

            {/* Message area */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedStudentId ? (
                    <Card padding="none" className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-paper-dark flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-sage-subtle flex items-center justify-center">
                                <User size={20} className="text-sage" />
                            </div>
                            <div>
                                <h3 className="font-display text-lg text-ink">{selectedStudent?.name}</h3>
                                <p className="text-sm text-ink-faint">{selectedStudent?.grade}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(message => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${message.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-lg ${message.sender_type === 'teacher'
                                                ? 'bg-ink text-paper-light rounded-br-sm'
                                                : 'bg-paper-dark text-ink rounded-bl-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageTypeBadge type={message.message_type} />
                                            {message.is_pinned && (
                                                <Pin size={12} className="text-ochre" />
                                            )}
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className={`text-xs ${message.sender_type === 'teacher' ? 'text-paper-light/60' : 'text-ink-faint'
                                                }`}>
                                                {format(new Date(message.created_at), 'M/d H:mm', { locale: ja })}
                                            </p>
                                            {message.sender_type === 'teacher' && (
                                                <button
                                                    onClick={() => handlePin(message.id, message.is_pinned)}
                                                    className="opacity-50 hover:opacity-100 transition-opacity"
                                                >
                                                    <Pin size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-paper-dark">
                            <div className="flex gap-2 mb-2">
                                <Select
                                    value={messageType}
                                    onChange={(e) => setMessageType(e.target.value as MessageType)}
                                    options={messageTypeOptions}
                                    className="w-32"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="メッセージを入力..."
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
                ) : (
                    <Card padding="lg" className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageSquare size={48} className="mx-auto mb-4 text-ink-faint" />
                            <p className="text-ink-light">生徒を選択してメッセージを開始</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
