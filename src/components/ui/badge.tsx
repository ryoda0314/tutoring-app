import type { ScheduleRequestStatus, LessonStatus, MessageType } from '@/types/database'

interface BadgeProps {
    variant?: 'default' | 'requested' | 'confirmed' | 'rejected' | 'reproposed' | 'planned' | 'done' | 'cancelled'
    children: React.ReactNode
    className?: string
}

const variantClasses = {
    default: 'bg-paper-dark text-ink-light',
    requested: 'bg-ochre-subtle text-ochre',
    confirmed: 'bg-sage-subtle text-sage',
    rejected: 'bg-accent-subtle text-accent',
    reproposed: 'bg-paper-dark text-ink-light',
    planned: 'bg-ochre-subtle text-ochre',
    done: 'bg-sage-subtle text-sage',
    cancelled: 'bg-accent-subtle text-accent',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        text-xs font-medium
        rounded-full
        ${variantClasses[variant]}
        ${className}
      `}
        >
            {children}
        </span>
    )
}

// Status badge for schedule requests
export function ScheduleStatusBadge({ status }: { status: ScheduleRequestStatus }) {
    const labels: Record<ScheduleRequestStatus, string> = {
        requested: '申請中',
        reproposed: '再提案',
        rejected: '却下',
        confirmed: '確定',
    }

    return (
        <Badge variant={status}>
            {labels[status]}
        </Badge>
    )
}

// Status badge for lessons
export function LessonStatusBadge({ status }: { status: LessonStatus }) {
    const labels: Record<LessonStatus, string> = {
        planned: '予定',
        done: '完了',
        cancelled: 'キャンセル',
    }

    return (
        <Badge variant={status}>
            {labels[status]}
        </Badge>
    )
}

// Message type badge
export function MessageTypeBadge({ type }: { type: MessageType }) {
    const variants: Record<MessageType, 'default' | 'requested' | 'confirmed'> = {
        '日程相談': 'requested',
        '宿題': 'confirmed',
        '連絡事項': 'default',
        '欠席連絡': 'default',
    }

    return (
        <Badge variant={variants[type]}>
            {type}
        </Badge>
    )
}
