'use client'

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', id, ...props }, ref) => {
        const inputId = id || props.name

        return (
            <div className="space-y-2">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-ink-light"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
            w-full px-4 py-3
            text-ink bg-paper-light
            border border-paper-dark rounded-lg
            placeholder:text-ink-faint
            transition-all duration-200
            focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre-subtle
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-accent focus:border-accent focus:ring-accent-subtle' : ''}
            ${className}
          `}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-accent">{error}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, className = '', id, ...props }, ref) => {
        const textareaId = id || props.name

        return (
            <div className="space-y-2">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-ink-light"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={`
            w-full px-4 py-3 min-h-[100px]
            text-ink bg-paper-light
            border border-paper-dark rounded-lg
            placeholder:text-ink-faint
            transition-all duration-200
            focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre-subtle
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-y
            ${error ? 'border-accent focus:border-accent focus:ring-accent-subtle' : ''}
            ${className}
          `}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-accent">{error}</p>
                )}
            </div>
        )
    }
)

Textarea.displayName = 'Textarea'

// Select
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className = '', id, ...props }, ref) => {
        const selectId = id || props.name

        return (
            <div className="space-y-2">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-ink-light"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={`
            w-full px-4 py-3
            text-ink bg-paper-light
            border border-paper-dark rounded-lg
            transition-all duration-200
            focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre-subtle
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-accent focus:border-accent focus:ring-accent-subtle' : ''}
            ${className}
          `}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="text-sm text-accent">{error}</p>
                )}
            </div>
        )
    }
)

Select.displayName = 'Select'
