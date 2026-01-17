'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    isLoading?: boolean
    children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-paper-light hover:bg-ink-light active:scale-[0.98]',
    secondary: 'bg-paper-light text-ink border border-paper-dark hover:bg-paper hover:border-ink-faint active:scale-[0.98]',
    accent: 'bg-accent text-paper-light hover:bg-accent-light active:scale-[0.98]',
    ghost: 'bg-transparent text-ink hover:bg-paper-dark/50 active:scale-[0.98]',
}

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', isLoading, children, className = '', disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-lg
          transition-all duration-200
          hover:scale-[1.02]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4"
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
                )}
                {children}
            </button>
        )
    }
)

Button.displayName = 'Button'
