'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    Calendar,
    CreditCard,
    Clock,
    RefreshCw,
    HelpCircle,
    ArrowLeft,
    CheckCircle,
    AlertTriangle,
} from 'lucide-react'
import { BILLING_CONFIRMATION_DAY, PAYMENT_DUE_DAY } from '@/lib/billing'

export default function BillingInfoPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/parent/billing">
                    <Button variant="secondary" size="sm">
                        <ArrowLeft size={16} />
                        戻る
                    </Button>
                </Link>
                <h1 className="text-2xl font-display text-ink">お支払いについて</h1>
            </div>

            {/* Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle size={20} className="text-ochre" />
                        請求の仕組み
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-ink-light">
                        毎月の授業料は、以下のスケジュールで請求・お支払いいただきます。
                    </p>
                </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar size={20} className="text-ochre" />
                        月間スケジュール
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Confirmation Date */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-sage-subtle flex items-center justify-center">
                                <CheckCircle size={24} className="text-sage" />
                            </div>
                            <div>
                                <p className="font-medium text-ink">
                                    前月{BILLING_CONFIRMATION_DAY}日：請求確定日
                                </p>
                                <p className="text-sm text-ink-light mt-1">
                                    翌月分の授業予定が確定し、請求金額が決まります。
                                    <br />
                                    例：4月分は3月20日に確定
                                </p>
                            </div>
                        </div>

                        {/* Billing Period */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-ochre-subtle flex items-center justify-center">
                                <Clock size={24} className="text-ochre" />
                            </div>
                            <div>
                                <p className="font-medium text-ink">
                                    当月1日〜末日：授業実施期間
                                </p>
                                <p className="text-sm text-ink-light mt-1">
                                    確定した予定に基づいて授業を実施します。
                                </p>
                            </div>
                        </div>

                        {/* Payment Due */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center">
                                <CreditCard size={24} className="text-accent" />
                            </div>
                            <div>
                                <p className="font-medium text-ink">
                                    当月{PAYMENT_DUE_DAY}日：お振り込み期限
                                </p>
                                <p className="text-sm text-ink-light mt-1">
                                    請求金額を毎月{PAYMENT_DUE_DAY}日までにお振り込みください。
                                    <br />
                                    例：4月分は4月25日まで
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Adjustments */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw size={20} className="text-ochre" />
                        調整について
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-paper-dark/30 rounded-lg space-y-3">
                        <p className="font-medium text-ink">追加レッスン</p>
                        <p className="text-sm text-ink-light">
                            請求確定後（前月20日以降）に追加された授業は、翌月の請求に加算されます。
                        </p>
                    </div>

                    <div className="p-4 bg-paper-dark/30 rounded-lg space-y-3">
                        <p className="font-medium text-ink">キャンセル時の返金</p>
                        <ul className="text-sm text-ink-light space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-sage mt-0.5">●</span>
                                <span>
                                    <strong>生徒都合</strong>：交通費のみ翌月に返金。授業料は振替時間として付与されます（1ヶ月有効）
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-accent mt-0.5">●</span>
                                <span>
                                    <strong>先生都合</strong>：授業料＋交通費の全額を翌月に返金
                                </span>
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Makeup Credits */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle size={20} className="text-ochre" />
                        振替について
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ul className="text-sm text-ink-light space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-ochre">•</span>
                            <span>生徒都合でキャンセルした場合、授業時間分の「振替クレジット」が付与されます</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-ochre">•</span>
                            <span>振替クレジットの有効期限は<strong className="text-ochre">元のレッスン日から1ヶ月間</strong>です</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-ochre">•</span>
                            <span>期限を過ぎた振替時間は失効し、返金対象外となります</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-ochre">•</span>
                            <span>振替レッスンは授業料無料（交通費のみ発生）</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>

            {/* Contact */}
            <Card className="bg-ochre-subtle/30 border-ochre-subtle">
                <CardContent className="p-4">
                    <p className="text-sm text-ink-light">
                        ご不明な点がございましたら、メッセージ機能よりお問い合わせください。
                    </p>
                    <Link href="/parent/messages" className="mt-3 inline-block">
                        <Button variant="secondary" size="sm">
                            メッセージを送る
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
