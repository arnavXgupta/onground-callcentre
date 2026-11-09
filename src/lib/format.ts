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

const dayChip = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

/** Header date chip: "Mon, 9 Nov" */
export const todayChip = (d = new Date()) => dayChip.format(d)

/** "10:42 AM" */
export const timeOfDay = (at: number) => timeFmt.format(at)

const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)

/** When a call happened, relative to now: "Today 10:42 AM", "Yesterday 4:40 PM", "Mon 2:15 PM", "3 Nov". */
export function formatWhen(at: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000)
  if (days <= 0) return `Today ${timeOfDay(at)}`
  if (days === 1) return `Yesterday ${timeOfDay(at)}`
  if (days < 7) return `${weekday.format(at)} ${timeOfDay(at)}`
  return shortDate.format(at)
}

/** "Attach rate" → "attach rate", but acronyms stay: "SOP adherence" → "SOP adherence". */
export const lowerFirst = (s: string) => s.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())
