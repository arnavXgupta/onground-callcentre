import type { Tone } from '../data/types'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** 13390 → "₹13,390" (Indian digit grouping: 181860 → "₹1,81,860") */
export const formatINR = (amount: number) => `₹${inr.format(amount)}`

/** Live call timer: 75 → "01:15" */
export function clock(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Call length in lists: 252 → "4m 12s", 40 → "40s", 0 → "—" */
export function duration(totalSec: number): string {
  if (!totalSec) return '—'
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

/** Lead score colour: ≥ 80 strong, ≥ 55 middling, below that weak. */
export const scoreTone = (score: number): Tone => (score >= 80 ? 'brand' : score >= 55 ? 'warn' : 'danger')

const TINTS = 6
/** Stable avatar tint index (0–5) from a name, so a person keeps their colour everywhere. */
export function avatarTint(name: string): number {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % TINTS
}
