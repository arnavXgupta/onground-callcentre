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

export interface SopItem {
  step: string
  pass: boolean
  /** A quoted line from the call when passed; the reason when missed. */
  evidence: string
}

// ── Pulse ────────────────────────────────────────────────
export interface PulseCard {
  title: string
  badge?: string
  fields: [string, string][]
  /** Navigates: a path, or "?leads=<id>" to open the Leads modal over the current screen. */
  action?: { label: string; to: string }
}

export interface PulseMessage {
  from: string
  initials: string
  time: string
  text?: string
  /** Bold lead-in, e.g. "Issue definition". */
  label?: string
  mine?: boolean
  bot?: boolean
  /** Relayed from another channel, e.g. "WhatsApp". */
  via?: string
  card?: PulseCard
  /** Marks the agent's answer to a Needs-your-input ask. */
  done?: boolean
}

export interface PulseAsk {
  id: string
  question: string
  context: string
  options: string[]
}

export interface PulseChannel {
  id: string
  kind: 'channel' | 'dm' | 'bot' | 'customer'
  title: string
  subtitle: string
  preview: string
  time: string
  unread: number
  mention?: boolean
  badge?: string
  messages: PulseMessage[]
  asks?: PulseAsk[]
}

export interface PulseAgent {
  id: string
  type: 'role' | 'task'
  title: string
  name: string
  metric: string
  value: number
  target: number
  delta: number
  members: number
  wentWell: string
  improve: string
  itemsLabel: string
  items: [string, string][]
  strengths: string[]
  workOn: string[]
}

export interface Kudos {
  from: string
  role: string
  initials: string
  time: string
  emoji: string
  text: string
}
