'use client'

import { forwardRef, type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
    children: React.ReactNode
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ hover = true, padding = 'md', children, className = '', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`
          bg-paper-light
          border border-paper-dark
          rounded-[6px_10px_8px_10px]
          shadow-[0_2px_8px_rgba(30,58,79,0.06),0_1px_2px_rgba(30,58,79,0.04)]
          transition-all duration-200
          ${hover ? 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(30,58,79,0.08)]' : ''}
          ${paddingClasses[padding]}
          ${className}
        `}
                {...props}
            >
                {children}
            </div>
        )
    }
)

Card.displayName = 'Card'

// Card Header
export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mb-4 ${className}`}>
            {children}
        </div>
    )
}

// Card Title
export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <h3 className={`font-display text-lg text-ink ${className}`}>
            {children}
        </h3>
    )
}

// Card Description
export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={`text-sm text-ink-light mt-1 ${className}`}>
            {children}
        </p>
    )
}

// Card Content
export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            {children}
        </div>
    )
}

// Card Footer
export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mt-4 pt-4 border-t border-paper-dark ${className}`}>
            {children}
        </div>
    )
}
