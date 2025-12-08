'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StudentLocation } from '@/types/database'
import {
    MapPin,
    Train,
    Plus,
    Trash2,
} from 'lucide-react'

interface StudentLocationsManagerProps {
    studentId: string
}

export function StudentLocationsManager({ studentId }: StudentLocationsManagerProps) {
    const [locations, setLocations] = useState<StudentLocation[]>([])
    const [loading, setLoading] = useState(true)

    const [newName, setNewName] = useState('')
    const [newFee, setNewFee] = useState('')

    useEffect(() => {
        const fetchLocations = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('student_locations')
                .select('*')
                .eq('student_id', studentId)
                .order('name')

            setLocations(data || [])
            setLoading(false)
        }
        fetchLocations()
    }, [studentId])

    const handleAdd = async () => {
        if (!newName.trim()) return

        const supabase = createClient()
        const { data, error } = await supabase
            .from('student_locations')
            .insert({
                student_id: studentId,
                name: newName.trim(),
                transportation_fee: parseInt(newFee) || 0,
            })
            .select()
            .single()

        if (data) {
            setLocations(prev => [...prev, data])
            setNewName('')
            setNewFee('')
        }
    }

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        await supabase
            .from('student_locations')
            .delete()
            .eq('id', id)

        setLocations(prev => prev.filter(l => l.id !== id))
    }

    if (loading) {
        return (
            <Card padding="md">
                <div className="animate-pulse h-20 bg-paper-dark/30 rounded" />
            </Card>
        )
    }

    return (
        <Card padding="md">
            <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Train size={18} className="text-ochre" />
                    場所と交通費
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
                {/* Existing locations */}
                {locations.length > 0 && (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {locations.map((loc) => (
                                <motion.div
                                    key={loc.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-ochre-subtle/20"
                                >
                                    <MapPin size={14} className="text-ochre flex-shrink-0" />
                                    <span className="flex-1 text-sm font-medium text-ink">
                                        {loc.name}
                                    </span>
                                    <span className="text-sm text-sage font-medium">
                                        ¥{loc.transportation_fee.toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(loc.id)}
                                        className="p-1 text-ink-faint hover:text-accent transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Add new location */}
                <div className="flex items-end gap-2 pt-2 border-t border-paper-dark">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-ink-faint">場所</label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="例: 日暮里"
                            className="text-sm"
                        />
                    </div>
                    <div className="w-24 space-y-1">
                        <label className="text-xs text-ink-faint">交通費</label>
                        <Input
                            type="number"
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            placeholder="500"
                            min="0"
                            className="text-sm"
                        />
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                    >
                        <Plus size={14} />
                    </Button>
                </div>

                {locations.length === 0 && (
                    <p className="text-xs text-ink-faint text-center py-2">
                        場所を追加すると日程申請時に選択できます
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
