'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import {
    MessageSquare,
    Calendar,
    Clock,
    MapPin,
    Check,
    X,
    Edit3,
    AlertCircle,
    Sparkles,
} from 'lucide-react'
import type { ParsedSchedule } from '@/app/api/parse-schedule/route'

interface NaturalInputProps {
    studentId: string
    onSuccess?: () => void
}

type InputMode = 'natural' | 'manual'
type Step = 'input' | 'confirm' | 'success'

export function NaturalScheduleInput({ studentId, onSuccess }: NaturalInputProps) {
    const router = useRouter()
    const [mode, setMode] = useState<InputMode>('natural')
    const [step, setStep] = useState<Step>('input')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Natural language input
    const [naturalText, setNaturalText] = useState('')
    const [parsedResult, setParsedResult] = useState<ParsedSchedule | null>(null)

    // Manual input / editable fields
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [location, setLocation] = useState('')
    const [memo, setMemo] = useState('')

    const handleParse = async () => {
        if (!naturalText.trim()) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/parse-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: naturalText }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || '解析に失敗しました')
            }

            const result: ParsedSchedule = await response.json()
            setParsedResult(result)

            // Pre-fill editable fields
            setDate(result.date)
            setStartTime(result.start_time)
            setEndTime(result.end_time)
            setLocation(result.location || '')

            setStep('confirm')
        } catch (err) {
            setError(err instanceof Error ? err.message : '解析中にエラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!date || !startTime || !endTime) {
            setError('日付と時間は必須です')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { error: insertError } = await supabase
                .from('schedule_requests')
                .insert({
                    student_id: studentId,
                    requested_by: 'parent',
                    date,
                    start_time: startTime + ':00',
                    end_time: endTime + ':00',
                    location: location || null,
                    memo: memo || null,
                })

            if (insertError) throw insertError

            setStep('success')

            // Callback and refresh
            setTimeout(() => {
                onSuccess?.()
                router.refresh()
            }, 1500)
        } catch (err) {
            console.error('Submit error:', err)
            setError('リクエストの送信に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setStep('input')
        setNaturalText('')
        setParsedResult(null)
        setDate('')
        setStartTime('')
        setEndTime('')
        setLocation('')
        setMemo('')
        setError(null)
    }

    // Success view
    if (step === 'success') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
            >
                <div className="w-16 h-16 rounded-full bg-sage-subtle flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-sage" />
                </div>
                <h3 className="text-lg font-display text-ink mb-2">リクエストを送信しました</h3>
                <p className="text-ink-light text-sm">先生からの返答をお待ちください</p>
            </motion.div>
        )
    }

    // Confirmation view
    if (step === 'confirm' && parsedResult) {
        const displayDate = format(new Date(date), 'M月d日（E）', { locale: ja })

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Parsed result card */}
                <Card padding="md" className="bg-sage-subtle/30 border-sage-subtle">
                    <div className="flex items-start gap-3 mb-4">
                        <Sparkles size={20} className="text-sage flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-sage">解析結果</p>
                            <p className="text-xs text-ink-light mt-0.5">
                                {parsedResult.confidence === 'high' ? '高い精度で解析' :
                                    parsedResult.confidence === 'medium' ? '確認をおすすめします' :
                                        '内容を確認してください'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-ink-light" />
                            <span className="text-ink">{displayDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-ink-light" />
                            <span className="text-ink">{startTime} - {endTime}</span>
                            <span className="text-sm text-ink-faint">
                                ({parsedResult.duration_hours}時間)
                            </span>
                        </div>
                        {location && (
                            <div className="flex items-center gap-3">
                                <MapPin size={18} className="text-ink-light" />
                                <span className="text-ink">{location}</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Editable fields */}
                <div className="space-y-4">
                    <p className="text-sm text-ink-light">
                        内容を確認・修正してください
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="日付"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="time"
                                label="開始時刻"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                            <Input
                                type="time"
                                label="終了時刻"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <Input
                        label="場所"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="例：日暮里、蓮沼、オンライン"
                    />

                    <Textarea
                        label="メモ（任意）"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="先生への連絡事項があれば"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} className="text-accent" />
                        <p className="text-sm text-accent">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleReset}
                        className="flex-1"
                    >
                        <X size={16} />
                        やり直す
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={loading}
                        className="flex-1"
                    >
                        <Check size={16} />
                        リクエストを送信
                    </Button>
                </div>
            </motion.div>
        )
    }

    // Input view
    return (
        <div className="space-y-6">
            {/* Mode toggle */}
            <div className="flex bg-paper rounded-lg p-1">
                <button
                    type="button"
                    onClick={() => setMode('natural')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === 'natural'
                            ? 'bg-paper-light shadow-sm text-ink'
                            : 'text-ink-faint hover:text-ink-light'
                        }`}
                >
                    <Sparkles size={16} />
                    自然言語入力
                </button>
                <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === 'manual'
                            ? 'bg-paper-light shadow-sm text-ink'
                            : 'text-ink-faint hover:text-ink-light'
                        }`}
                >
                    <Edit3 size={16} />
                    カレンダー入力
                </button>
            </div>

            <AnimatePresence mode="wait">
                {mode === 'natural' ? (
                    <motion.div
                        key="natural"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-4"
                    >
                        <Textarea
                            value={naturalText}
                            onChange={(e) => setNaturalText(e.target.value)}
                            placeholder="例：来週火曜の19時から2時間、日暮里で対面希望です"
                            className="min-h-[100px]"
                        />

                        <p className="text-xs text-ink-faint">
                            日時、場所、要望を自由な言葉で入力してください。AIが解析します。
                        </p>

                        {error && (
                            <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} className="text-accent" />
                                <p className="text-sm text-accent">{error}</p>
                            </div>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleParse}
                            isLoading={loading}
                            disabled={!naturalText.trim()}
                            className="w-full"
                        >
                            <Sparkles size={16} />
                            解析して確認
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="manual"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                type="date"
                                label="日付"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="time"
                                    label="開始時刻"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                                <Input
                                    type="time"
                                    label="終了時刻"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Input
                            label="場所"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="例：日暮里、蓮沼、オンライン"
                        />

                        <Textarea
                            label="メモ（任意）"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="先生への連絡事項があれば"
                        />

                        {error && (
                            <div className="p-3 bg-accent-subtle rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} className="text-accent" />
                                <p className="text-sm text-accent">{error}</p>
                            </div>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            isLoading={loading}
                            disabled={!date || !startTime || !endTime}
                            className="w-full"
                        >
                            <Check size={16} />
                            リクエストを送信
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
