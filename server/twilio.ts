// Thin wrappers over the Twilio REST API used by the webhooks. Kept small and separate so the
// API handlers can be tested with this module mocked; the wrappers themselves are checked live.
import twilio from 'twilio'
import { QUEUE } from './voice.js'

export type Rest = ReturnType<typeof twilio>

export const rest = (accountSid: string, authToken: string): Rest => twilio(accountSid, authToken)

export const isCallSid = (s: string | null | undefined): s is string => !!s && /^CA[0-9a-f]{32}$/.test(s)

/** Hang up a call whatever state it's in. Already-finished calls are fine (errors ignored). */
export async function endCall(client: Rest, sid: string) {
  try {
    await client.calls(sid).update({ status: 'completed' }) // also ends an answered leg
  } catch {
    await client.calls(sid).update({ status: 'canceled' }).catch(() => {}) // still queued/ringing
  }
}

/** Ring a phone into the room; returns the new call's SID. */
export async function ringIntoRoom(client: Rest, opts: { to: string; from: string; twiml: string; statusCallback: string }) {
  const call = await client.calls.create(opts)
  return call.sid
}

/** The inbound queue, under its plain name or the trial-namespaced one. */
async function findQueue(client: Rest, accountSid: string) {
  const queues = await client.queues.list({ limit: 50 })
  return queues.find((q) => q.friendlyName === QUEUE || q.friendlyName === `${QUEUE}-${accountSid}`)
}

export async function queueHasCallers(client: Rest, accountSid: string) {
  return ((await findQueue(client, accountSid))?.currentSize ?? 0) > 0
}

export interface Waiting {
  callSid: string
  from: string
  waitedSec: number
  position: number
}

/** Who's waiting, front of the queue first. Members carry no caller number, so each call is fetched. */
export async function waitingCallers(client: Rest, accountSid: string): Promise<Waiting[]> {
  const queue = await findQueue(client, accountSid)
  if (!queue || queue.currentSize === 0) return []
  const members = await client.queues(queue.sid).members.list({ limit: 20 })
  const callers = await Promise.all(
    members.map(async (m) => {
      const call = await client.calls(m.callSid).fetch()
      return { callSid: m.callSid, from: call.from, waitedSec: m.waitTime, position: m.position }
    }),
  )
  return callers.sort((a, b) => a.position - b.position)
}

/** Has the customer joined the agent's room? Only rooms the agent is in count (stale rooms ignored). */
export async function agentConnected(client: Rest, agentSid: string) {
  const rooms = await client.conferences.list({ status: 'in-progress', limit: 5 })
  for (const room of rooms) {
    const people = await client.conferences(room.sid).participants.list({ limit: 10 })
    if (people.some((p) => p.callSid === agentSid)) return people.length >= 2
  }
  return false
}

/** Replace what a call is doing with new TwiML (e.g. tell a waiting caller we're busy). */
export async function redirect(client: Rest, sid: string, twiml: string) {
  await client.calls(sid).update({ twiml })
}
