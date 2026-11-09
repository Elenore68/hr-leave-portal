import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-glow hover:bg-secondary',
  secondary: 'bg-lavender text-primary hover:bg-lavender-deep',
  ghost: 'bg-transparent text-primary hover:bg-lavender',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  gold: 'bg-gold text-ink hover:bg-gold-bright',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
      {...rest}
    />
  )
}
