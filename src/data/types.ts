export interface Agent {
  name: string
  initials: string
  role: string
  company: string
  store: string
  ogScore: number
  ogDelta: number
  rank: number
  rankScope: string
}

export type NotificationKind = 'team' | 'callback' | 'practise' | 'win' | 'streak' | 'report'

export interface Notification {
  id: string
  kind: NotificationKind
  time: string
  title: string
  cta?: { label: string; to: string }
}

export type Tone = 'brand' | 'warn' | 'danger' | 'neutral'

export interface Lead {
  id: string
  name: string
  initials: string
  /** Display number from the sample CRM. Real lead calls are routed server-side (see docs/03-calling.md). */
  phone: string
  status: 'open' | 'ageing' | 'cold'
  intent: 'interested' | 'browsing'
  product: string
  productShort: string
  price: number
  crossSell: { name: string; price: number }
  emiNote: string
  /** Lead attractiveness score: ranks Calls to make. */
  score: number
  icp: number
  intentScore: number
  icpBreakdown: { label: string; pct: number }[]
  sla: { label: string; tone: Tone }
  slaNote: string | null
  quoteRequested: boolean
  notes: string[]
  signals: { category: string; text: string }[]
  journey: { date: string; channel: string; text: string }[]
}
