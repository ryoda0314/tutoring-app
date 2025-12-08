'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import {
    Calendar,
    Clock,
    MapPin,
    Check,
    X,
    Edit3,
    AlertCircle,
    Sparkles,
    Repeat,
    Trash2,
    Train,
} from 'lucide-react'
import type { ParsedSchedule, ParsedScheduleResponse } from '@/app/api/parse-schedule/route'
import type { StudentLocation } from '@/types/database'

interface NaturalInputProps {
    studentId: string
    contextMonth?: Date // The currently displayed calendar month
    onSuccess?: () => void
}

type InputMode = 'natural' | 'manual'
type Step = 'input' | 'confirm' | 'success'

export function NaturalScheduleInput({ studentId, contextMonth, onSuccess }: NaturalInputProps) {
    const router = useRouter()
    const [mode, setMode] = useState<InputMode>('natural')
    const [step, setStep] = useState<Step>('input')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Available locations for this student
    const [locations, setLocations] = useState<StudentLocation[]>([])

    // Natural language input
    const [naturalText, setNaturalText] = useState('')
    const [parsedResponse, setParsedResponse] = useState<ParsedScheduleResponse | null>(null)
    const [selectedSchedules, setSelectedSchedules] = useState<ParsedSchedule[]>([])

    // Manual input / editable fields
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [memo, setMemo] = useState('')

    // Fetch available locations on mount
    useEffect(() => {
        const fetchLocations = async () => {
            const supabase = createClient()

            // Fetch locations for this student
            const { data: locs } = await supabase
                .from('student_locations')
                .select('*')
                .eq('student_id', studentId)
                .order('name')

            setLocations(locs || [])
        }
        fetchLocations()
    }, [studentId])

    const getSelectedLocation = () => {
        return locations.find(l => l.id === selectedLocationId)
    }

    const handleParse = async () => {
        if (!naturalText.trim()) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/parse-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: naturalText,
                    contextMonth: contextMonth ? format(contextMonth, 'yyyy-MM') : undefined,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || '解析に失敗しました')
            }

            const result: ParsedScheduleResponse = await response.json()
            setParsedResponse(result)
            setSelectedSchedules(result.schedules)

            // For single schedule, pre-fill editable fields
            if (result.schedules.length === 1) {
                const s = result.schedules[0]
                setDate(s.date)
                setStartTime(s.start_time)
                setEndTime(s.end_time)

                // Try to match location from parsed text
                if (s.location) {
                    const matchedLoc = locations.find(l =>
                        l.name.includes(s.location!) || s.location!.includes(l.name)
                    )
                    if (matchedLoc) {
                        setSelectedLocationId(matchedLoc.id)
                    }
                }
            }

            setStep('confirm')
        } catch (err) {
            setError(err instanceof Error ? err.message : '解析中にエラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveSchedule = (index: number) => {
        setSelectedSchedules(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const selectedLoc = getSelectedLocation()

            // Submit all selected schedules
            const schedulesToSubmit = parsedResponse && parsedResponse.schedules.length > 1
                ? selectedSchedules
                : [{
                    date,
                    start_time: startTime,
                    end_time: endTime,
                }]

            for (const schedule of schedulesToSubmit) {
                const { error: insertError } = await supabase
                    .from('schedule_requests')
                    .insert({
                        student_id: studentId,
                        requested_by: 'parent',
                        date: schedule.date,
                        start_time: (schedule.start_time || startTime) + ':00',
                        end_time: (schedule.end_time || endTime) + ':00',
                        location: selectedLoc?.name || null,
                        memo: memo || null,
                    })

                if (insertError) throw insertError
            }

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
        setParsedResponse(null)
        setSelectedSchedules([])
        setDate('')
        setStartTime('')
        setEndTime('')
        setSelectedLocationId('')
        setMemo('')
        setError(null)
    }

    const locationOptions = [
        { value: '', label: '場所を選択' },
        ...locations.map(l => ({
            value: l.id,
            label: `${l.name} (交通費: ¥${l.transportation_fee.toLocaleString()})`,
        }))
    ]

    // Success view
    if (step === 'success') {
        const count = parsedResponse && parsedResponse.schedules.length > 1
            ? selectedSchedules.length
            : 1
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
            >
                <div className="w-16 h-16 rounded-full bg-sage-subtle flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-sage" />
                </div>
                <h3 className="text-lg font-display text-ink mb-2">
                    {count > 1 ? `${count}件の` : ''}リクエストを送信しました
                </h3>
                <p className="text-ink-light text-sm">先生からの返答をお待ちください</p>
            </motion.div>
        )
    }

    // Confirmation view - Multiple schedules
    if (step === 'confirm' && parsedResponse && parsedResponse.schedules.length > 1) {
        const selectedLoc = getSelectedLocation()

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Recurring info */}
                {parsedResponse.is_recurring && (
                    <Card padding="sm" className="bg-ochre-subtle/30 border-ochre-subtle">
                        <div className="flex items-center gap-2">
                            <Repeat size={16} className="text-ochre" />
                            <span className="text-sm font-medium text-ochre">
                                繰り返し: {parsedResponse.recurring_pattern}
                            </span>
                        </div>
                    </Card>
                )}

                {/* Schedules list */}
                <div className="space-y-2">
                    <p className="text-sm text-ink-light">
                        {selectedSchedules.length}件の日程が見つかりました
                    </p>
                    {selectedSchedules.map((schedule, index) => (
                        <Card key={index} padding="sm" className="bg-sage-subtle/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-ink-light" />
                                        <span className="text-sm font-medium text-ink">
                                            {format(new Date(schedule.date), 'M/d（E）', { locale: ja })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-ink-light" />
                                        <span className="text-sm text-ink">
                                            {schedule.start_time} - {schedule.end_time}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveSchedule(index)}
                                    className="p-1 text-ink-faint hover:text-accent transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Location selection */}
                {locations.length > 0 && (
                    <div className="space-y-2">
                        <Select
                            label="場所"
                            value={selectedLocationId}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                            options={locationOptions}
                        />
                        {selectedLoc && (
                            <div className="flex items-center gap-2 text-sm text-ochre">
                                <Train size={14} />
                                交通費: ¥{selectedLoc.transportation_fee.toLocaleString()}
                            </div>
                        )}
                    </div>
                )}

                {/* Memo for all */}
                <Textarea
                    label="メモ（全ての日程に適用）"
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
                        disabled={selectedSchedules.length === 0}
                        className="flex-1"
                    >
                        <Check size={16} />
                        {selectedSchedules.length}件を送信
                    </Button>
                </div>
            </motion.div>
        )
    }

    // Confirmation view - Single schedule
    if (step === 'confirm' && parsedResponse && parsedResponse.schedules.length === 1) {
        const displayDate = date ? format(new Date(date), 'M月d日（E）', { locale: ja }) : ''
        const schedule = parsedResponse.schedules[0]
        const selectedLoc = getSelectedLocation()

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
                                {schedule.confidence === 'high' ? '高い精度で解析' :
                                    schedule.confidence === 'medium' ? '確認をおすすめします' :
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
                                ({schedule.duration_hours}時間)
                            </span>
                        </div>
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

                    {/* Location selection */}
                    {locations.length > 0 ? (
                        <div className="space-y-2">
                            <Select
                                label="場所"
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                options={locationOptions}
                            />
                            {selectedLoc && (
                                <div className="flex items-center gap-2 text-sm text-ochre">
                                    <Train size={14} />
                                    交通費: ¥{selectedLoc.transportation_fee.toLocaleString()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <Input
                            label="場所"
                            value={selectedLocationId}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                            placeholder="例：日暮里、オンライン"
                        />
                    )}

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
                            placeholder="例：毎週日曜日の19時から2時間"
                            className="min-h-[100px]"
                        />

                        <p className="text-xs text-ink-faint">
                            💡 「毎週◯曜日」「今月の土曜日」など繰り返しも対応！
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

                        {/* Location selection */}
                        {locations.length > 0 ? (
                            <div className="space-y-2">
                                <Select
                                    label="場所"
                                    value={selectedLocationId}
                                    onChange={(e) => setSelectedLocationId(e.target.value)}
                                    options={locationOptions}
                                />
                                {getSelectedLocation() && (
                                    <div className="flex items-center gap-2 text-sm text-ochre">
                                        <Train size={14} />
                                        交通費: ¥{getSelectedLocation()!.transportation_fee.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Input
                                label="場所"
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                placeholder="例：日暮里、オンライン"
                            />
                        )}

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
