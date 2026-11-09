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
