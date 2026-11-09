import type { ReactNode } from 'react'

const tones = {
  purple: 'bg-lavender text-primary',
  gold: 'bg-gold/30 text-ink',
  pink: 'bg-blush/30 text-ink',
} as const

export function Badge({
  tone = 'purple',
  children,
}: {
  tone?: keyof typeof tones
  children: ReactNode
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}
