import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent-dark disabled:bg-accent/40 disabled:text-ink/50',
  secondary:
    'border border-border bg-surface text-ink hover:border-teal disabled:text-ink-muted disabled:border-border',
  ghost: 'bg-transparent text-teal hover:bg-teal-soft disabled:text-ink-muted',
}

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-disabled={disabled}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
