import type { ReactNode } from 'react'
import s from './ui.module.css'

export type PillTone = 'brand' | 'warn' | 'danger' | 'info' | 'ai' | 'neutral'

export default function Pill({ tone = 'neutral', children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={s.pill} data-tone={tone}>
      {children}
    </span>
  )
}
