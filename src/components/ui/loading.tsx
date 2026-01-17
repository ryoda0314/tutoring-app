// Loading spinner
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    }

    return (
        <svg
            className={`animate-spin text-ink-light ${sizeClasses[size]} ${className}`}
            viewBox="0 0 24 24"
            fill="none"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    )
}

// Full page loading
export function PageLoading({ message = '読み込み中...' }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Spinner size="lg" />
            <p className="text-ink-light">{message}</p>
        </div>
    )
}

// Skeleton loading for cards
export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`
        bg-paper-light
        border border-paper-dark
        rounded-[6px_10px_8px_10px]
        p-6
        animate-pulse
        ${className}
      `}
        >
            <div className="h-4 bg-paper-dark rounded w-3/4 mb-3" />
            <div className="h-3 bg-paper-dark rounded w-1/2 mb-6" />
            <div className="space-y-2">
                <div className="h-3 bg-paper-dark rounded" />
                <div className="h-3 bg-paper-dark rounded w-5/6" />
            </div>
        </div>
    )
}

// Skeleton for list items
export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 animate-pulse">
            <div className="h-10 w-10 bg-paper-dark rounded-full" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-paper-dark rounded w-1/3" />
                <div className="h-3 bg-paper-dark rounded w-1/2" />
            </div>
        </div>
    )
}
