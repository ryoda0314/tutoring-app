import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { addDays, addWeeks, format } from 'date-fns'
import { ja } from 'date-fns/locale'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// Single schedule result
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

// Response that can contain multiple schedules
export interface ParsedScheduleResponse {
    schedules: ParsedSchedule[]
    is_recurring: boolean
    recurring_pattern: string | null // e.g., "毎週日曜日"
}

interface ParseRequest {
    text: string
    contextMonth?: string // YYYY-MM format - the currently viewed calendar month
}

export async function POST(request: Request) {
    try {
        const body: ParseRequest = await request.json()
        const { text, contextMonth } = body

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: '入力テキストが必要です' },
                { status: 400 }
            )
        }

        // Get current date for relative calculations
        const today = new Date()
        const currentDateStr = format(today, 'yyyy年M月d日（E）', { locale: ja })

        // Parse context month if provided (the calendar month the user is viewing)
        let contextMonthStr = ''
        if (contextMonth) {
            const [year, month] = contextMonth.split('-').map(Number)
            contextMonthStr = `${year}年${month}月`
        }

        const systemPrompt = `あなたは日本語の日程情報を解析するアシスタントです。
ユーザーの入力から日程情報を抽出してJSONで返してください。

【最重要】月の指定について：
- 特定の月が明示されている場合（例：「1月の土曜日」「2月の毎週日曜」）、その月の日付のみを返してください
- 絶対に指定された月以外の日付を含めないでください
- 例：今日が12月8日で「1月の毎週土曜日」と言われたら、2025年1月の土曜日のみ（1/4, 1/11, 1/18, 1/25）を返す

【繰り返しパターンの対応】：
- 月の指定がある場合 → その月のすべての該当曜日
- 「毎週◯曜」のみ（月指定なし） → 今日から4週間分
- 「今月の◯曜日」 → 今月の残りすべての該当曜日

JSONフォーマット：
{
  "is_recurring": boolean,
  "recurring_pattern": string | null,  // 例: "毎週日曜日"
  "schedules": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "duration_hours": number,
      "location": string | null,
      "mode": "online" | "in-person" | null,
      "confidence": "high" | "medium" | "low"
    }
  ]
}

今日は${currentDateStr}です。
${contextMonthStr ? `
【重要】ユーザーは現在カレンダーで${contextMonthStr}を表示しています。
日付のみ（「5日」「15日」など）や曜日のみ（「土曜日」など）が指定された場合は、${contextMonthStr}の日付として解釈してください。
` : ''}

【解釈例】（今日が2024年12月8日の場合）：
- 「1月の毎週土曜日 19時から」→ 2025-01-04, 2025-01-11, 2025-01-18, 2025-01-25 のみ（12月は含まない！）
- 「来月の日曜日」→ 2025年1月のすべての日曜日
- 「毎週火曜日」→ 12/10, 12/17, 12/24, 12/31（今日から4週間）
- 「今月の土曜日」→ 12月の残りの土曜日
- 「来週月曜」→ 次の月曜日1日のみ

相対的な日付の解釈：
- "来週◯曜" = 次の週の◯曜日（1日のみ）
- "再来週" = 2週間後の週
- "今週" = 今週
- "明日" = 翌日
- "毎週◯曜"（月指定なし） = 今日から4週間分の◯曜日
- "◯月の毎週△曜" = その月のすべての△曜日（他の月は絶対に含めない）
- "今月の◯曜日" = 今月の残りすべての◯曜日
- "来月の◯曜日" = 来月のすべての◯曜日

時間の解釈：
- "19時から2時間" = start_time: "19:00", end_time: "21:00", duration_hours: 2
- "午後7時" = "19:00"
- 時間が不明な場合はデフォルト19:00〜21:00

場所の解釈：
- "日暮里で" = location: "日暮里", mode: "in-person"
- "オンラインで" = location: "オンライン", mode: "online"
- "対面" = mode: "in-person"

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

        // Handle both new format (with schedules array) and old format (single schedule)
        if (parsed.schedules && Array.isArray(parsed.schedules)) {
            // New format with multiple schedules
            const result: ParsedScheduleResponse = {
                schedules: parsed.schedules.map((s: any) => ({
                    date: s.date || format(addDays(today, 7), 'yyyy-MM-dd'),
                    start_time: s.start_time || '19:00',
                    end_time: s.end_time || '21:00',
                    duration_hours: s.duration_hours || 2,
                    location: s.location || null,
                    mode: s.mode || null,
                    confidence: s.confidence || 'medium',
                    original_text: text,
                })),
                is_recurring: parsed.is_recurring || false,
                recurring_pattern: parsed.recurring_pattern || null,
            }
            return NextResponse.json(result)
        } else {
            // Legacy format - single schedule
            const result: ParsedScheduleResponse = {
                schedules: [{
                    date: parsed.date || format(addDays(today, 7), 'yyyy-MM-dd'),
                    start_time: parsed.start_time || '19:00',
                    end_time: parsed.end_time || '21:00',
                    duration_hours: parsed.duration_hours || 2,
                    location: parsed.location || null,
                    mode: parsed.mode || null,
                    confidence: parsed.confidence || 'medium',
                    original_text: text,
                }],
                is_recurring: false,
                recurring_pattern: null,
            }
            return NextResponse.json(result)
        }
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
