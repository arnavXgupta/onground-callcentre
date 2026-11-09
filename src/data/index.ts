// Typed access to the sample data. JSON infers plain strings, so unions are asserted here, once.
import agentJson from './agent.json'
import notificationsJson from './notifications.json'
import leadsJson from './leads.json'
import type { Agent, Lead, Notification } from './types'

export const agent: Agent = agentJson
export const notifications = notificationsJson as Notification[]
export const leads = leadsJson as Lead[]
export const leadById = (id: string) => leads.find((l) => l.id === id)
