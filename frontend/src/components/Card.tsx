import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass animate-fade-up rounded-3xl ${className}`} {...rest} />
}
