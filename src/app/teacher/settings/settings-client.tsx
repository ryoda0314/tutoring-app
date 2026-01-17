'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/loading'
import type { TeacherSettings } from '@/types/database'
import {
    Settings,
    JapaneseYen,
    Clock,
    Save,
    Check,
} from 'lucide-react'

export function TeacherSettingsClient() {
    const [settings, setSettings] = useState<TeacherSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [lessonPrice, setLessonPrice] = useState('')
    const [lessonDuration, setLessonDuration] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        const fetchSettings = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const { data: settingsData } = await supabase
                .from('teacher_settings')
                .select('*')
                .eq('teacher_id', user.id)
                .single() as { data: TeacherSettings | null }

            if (settingsData) {
                setSettings(settingsData)
                setLessonPrice(settingsData.lesson_price?.toString() || '0')
                setLessonDuration(settingsData.lesson_duration?.toString() || '60')
                setNotes(settingsData.notes || '')
            } else {
                setLessonPrice('0')
                setLessonDuration('60')
                setNotes('')
            }

            setLoading(false)
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setSaving(false)
            return
        }

        const settingsData = {
            teacher_id: user.id,
            lesson_price: parseInt(lessonPrice) || 0,
            lesson_duration: parseInt(lessonDuration) || 60,
            notes: notes.trim() || null,
        }

        if (settings) {
            await (supabase
                .from('teacher_settings') as any)
                .update(settingsData)
                .eq('id', settings.id)
        } else {
            const { data } = await (supabase
                .from('teacher_settings') as any)
                .insert(settingsData)
                .select()
                .single() as { data: TeacherSettings | null }
            if (data) {
                setSettings(data)
            }
        }

        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Settings className="text-sage" size={24} />
                <h1 className="text-2xl font-display text-ink">設定</h1>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                {/* Lesson Settings */}
                <Card>
                    <CardHeader>
                        <h2 className="text-lg font-display text-ink">レッスン設定</h2>
                        <p className="text-sm text-ink-faint">デフォルトのレッスン料金と時間</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                    <JapaneseYen size={14} className="text-sage" />
                                    1コマ料金（円）
                                </label>
                                <Input
                                    type="number"
                                    value={lessonPrice}
                                    onChange={(e) => setLessonPrice(e.target.value)}
                                    placeholder="3000"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                    <Clock size={14} className="text-sage" />
                                    1コマ時間（分）
                                </label>
                                <Input
                                    type="number"
                                    value={lessonDuration}
                                    onChange={(e) => setLessonDuration(e.target.value)}
                                    placeholder="60"
                                    min="15"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-ink">メモ</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="その他のメモ..."
                                className="w-full px-3 py-2 rounded-lg border border-paper-dark bg-paper-light text-ink text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-sage/50"
                            />
                        </div>

                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={saving}
                            className="w-full"
                        >
                            {saved ? (
                                <>
                                    <Check size={16} />
                                    保存しました
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    設定を保存
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-sage-subtle/30">
                    <CardContent>
                        <h3 className="font-medium text-ink mb-3 text-sm">現在の設定</h3>
                        <div className="flex gap-6 text-center">
                            <div>
                                <p className="text-xl font-display text-sage">¥{parseInt(lessonPrice || '0').toLocaleString()}</p>
                                <p className="text-xs text-ink-faint">1コマ料金</p>
                            </div>
                            <div>
                                <p className="text-xl font-display text-sage">{lessonDuration || '60'}分</p>
                                <p className="text-xs text-ink-faint">1コマ時間</p>
                            </div>
                        </div>
                        <p className="text-xs text-ink-faint mt-4">
                            ※ 場所と交通費は各生徒ページで設定します
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
