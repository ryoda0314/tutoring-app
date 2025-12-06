import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { addDays, addWeeks, nextDay, format, parse } from 'date-fns'
import { ja } from 'date-fns/locale'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// Weekday mapping for Japanese
const weekdayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
    '日': 0, '日曜': 0, '日曜日': 0,
    '月': 1, '月曜': 1, '月曜日': 1,
    '火': 2, '火曜': 2, '火曜日': 2,
    '水': 3, '水曜': 3, '水曜日': 3,
    '木': 4, '木曜': 4, '木曜日': 4,
    '金': 5, '金曜': 5, '金曜日': 5,
    '土': 6, '土曜': 6, '土曜日': 6,
}

export interface ParsedSchedule {
    date: string // YYYY-MM-DD
    start_time: string // HH:MM
    end_time: string // HH:MM
    duration_hours: number
    location: string | null
    mode: 'online' | 'in-person' | null
    confidence: 'high' | 'medium' | 'low'
    original_text: string
}

interface ParseRequest {
    text: string
}

export async function POST(request: Request) {
    try {
        const body: ParseRequest = await request.json()
        const { text } = body

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: '入力テキストが必要です' },
                { status: 400 }
            )
        }

        // Get current date for relative calculations
        const today = new Date()
        const currentDateStr = format(today, 'yyyy年M月d日（E）', { locale: ja })

        const systemPrompt = `あなたは日本語の日程情報を解析するアシスタントです。
ユーザーの入力から以下の情報を抽出してJSONで返してください：

- date: 日付（YYYY-MM-DD形式）
- start_time: 開始時刻（HH:MM形式、24時間表記）
- end_time: 終了時刻（HH:MM形式、24時間表記）
- duration_hours: 時間数（数値）
- location: 場所（"日暮里"、"蓮沼"、"オンライン"など、なければnull）
- mode: "online"（オンライン）または"in-person"（対面）、判断できなければnull
- confidence: 解析の確信度（"high", "medium", "low"）

今日は${currentDateStr}です。

相対的な日付の解釈：
- "来週◯曜" = 次の週の◯曜日
- "再来週" = 2週間後の週
- "今週" = 今週
- "明日" = 翌日
- "明後日" = 2日後

時間の解釈：
- "19時から2時間" = start_time: "19:00", end_time: "21:00", duration_hours: 2
- "午後7時" = "19:00"
- "夜7時" = "19:00"

場所の解釈：
- "日暮里で" = location: "日暮里", mode: "in-person"
- "蓮沼で" = location: "蓮沼", mode: "in-person"
- "オンラインで" = location: "オンライン", mode: "online"
- "対面" or "対面希望" = mode: "in-person"

必ずJSON形式のみで返答してください。説明は不要です。`

        const userPrompt = `以下のテキストから日程情報を抽出してください：

"${text}"`

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
        })

        const responseText = completion.choices[0]?.message?.content
        if (!responseText) {
            return NextResponse.json(
                { error: '解析結果を取得できませんでした' },
                { status: 500 }
            )
        }

        const parsed = JSON.parse(responseText)

        // Validate and format the response
        const result: ParsedSchedule = {
            date: parsed.date || format(addDays(today, 7), 'yyyy-MM-dd'),
            start_time: parsed.start_time || '19:00',
            end_time: parsed.end_time || '21:00',
            duration_hours: parsed.duration_hours || 2,
            location: parsed.location || null,
            mode: parsed.mode || null,
            confidence: parsed.confidence || 'medium',
            original_text: text,
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Schedule parsing error:', error)

        // Check if it's an OpenAI API error
        if (error instanceof OpenAI.APIError) {
            return NextResponse.json(
                { error: 'AI解析サービスでエラーが発生しました。しばらく経ってから再試行してください。' },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: '日程の解析中にエラーが発生しました' },
            { status: 500 }
        )
    }
}
