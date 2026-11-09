// Typed access to the sample data. JSON infers plain strings, so unions are asserted here, once.
import agentJson from './agent.json'
import notificationsJson from './notifications.json'
import leadsJson from './leads.json'
import pulseJson from './pulse.json'
import type { Agent, Kudos, Lead, Notification, PulseAgent, PulseChannel } from './types'

export const agent: Agent = agentJson
export const notifications = notificationsJson as Notification[]
export const leads = leadsJson as Lead[]
export const leadById = (id: string) => leads.find((l) => l.id === id)

export const pulse = pulseJson as unknown as {
  workspace: string
  channels: PulseChannel[]
  agents: PulseAgent[]
  kudos: { allTime: number; items: Kudos[] }
}
export const channelById = (id: string) => pulse.channels.find((c) => c.id === id)
export const agentById = (id: string) => pulse.agents.find((a) => a.id === id)
