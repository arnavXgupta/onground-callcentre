// Typed access to the sample data. JSON infers plain strings, so unions are asserted here, once.
import agentJson from './agent.json'
import notificationsJson from './notifications.json'
import type { Agent, Notification } from './types'

export const agent: Agent = agentJson
export const notifications = notificationsJson as Notification[]
