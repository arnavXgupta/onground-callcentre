export const PLAN_TABS = [
  { tab: 'outgoing', label: 'Calls to make' },
  { tab: 'incoming', label: 'Incoming' },
  { tab: 'recent', label: 'Recent' },
  { tab: 'practise', label: 'Practise' },
] as const

export type PlanTab = (typeof PLAN_TABS)[number]['tab']

export const isPlanTab = (t: string | undefined): t is PlanTab => PLAN_TABS.some((p) => p.tab === t)
