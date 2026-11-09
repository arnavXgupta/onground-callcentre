import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { leads } from '../data'
import { callLog, type Outcome } from './callLog'
import { createTwilioDevice, MIC_BLOCKED_CODES, type DeviceError, type PhoneCall, type PhoneDevice } from './device'
import { callReducer, callSeconds, initialCallState, type CallEvent, type CallState, type Contact } from './machine'

export type DeviceStatus = 'offline' | 'connecting' | 'online' | 'mic_blocked' | 'error'

/** A caller waiting in the inbound queue (GET /api/queue). */
export interface QueueCaller {
  callSid: string
  from: string
  waitedSec: number
  position: number
}

/** How often the browser asks who's waiting (while online) and whether the callee joined (while ringing). */
export const QUEUE_POLL_MS = 2000
export const ROOM_POLL_MS = 1000

export interface CallApi {
  call: CallState
  /** Inbound availability: online = watching the queue. Outbound works in any status. */
  status: DeviceStatus
  statusDetail?: string
  /** Short-lived message for the agent (call failed, blocked second call…). */
  notice?: string
  dismissNotice(): void
  goOnline(): Promise<void>
  goOffline(): Promise<void>
  place(contact: Contact): Promise<void>
  accept(): Promise<void>
  decline(): void
  hangup(): void
  toggleMute(): void
  sendDigits(digits: string): void
  finishWrapUp(result?: { outcome?: Outcome; summary?: string }): void
}

const CallContext = createContext<CallApi | null>(null)

export function useCall(): CallApi {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>')
  return ctx
}

export const MIC_HELP = 'Microphone blocked. Allow it from the icon in the address bar, then try again.'

function errorText(e: unknown): string {
  const err = (e ?? {}) as Partial<DeviceError> & { name?: string }
  if (err.name === 'NotAllowedError' || MIC_BLOCKED_CODES.has(err.code ?? -1)) return MIC_HELP
  return err.message || 'Something went wrong with the call.'
}

/** Name a caller by matching their number against the sample leads. */
function contactFor(number: string): Contact {
  const digits = number.replace(/\D/g, '')
  const lead = digits ? leads.find((l) => l.phone.replace(/\D/g, '') === digits) : undefined
  return lead ? { name: lead.name, number, leadId: lead.id } : { name: number || 'Unknown caller', number }
}

function logMissed(contact: Contact) {
  callLog.add({ name: contact.name, number: contact.number, leadId: contact.leadId, direction: 'missed', at: Date.now(), durationSec: 0 })
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init)
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [call, dispatch] = useReducer(callReducer, initialCallState)
  const [status, setStatus] = useState<DeviceStatus>('offline')
  const [statusDetail, setStatusDetail] = useState<string>()
  const [notice, setNotice] = useState<string>()

  // Twilio events and polls land between renders, so handlers read this ref, kept in lockstep with the reducer.
  const stateRef = useRef<CallState>(initialCallState)
  const deviceRef = useRef<Promise<PhoneDevice> | null>(null)
  const activeRef = useRef<PhoneCall | null>(null)
  const hangupRequested = useRef(false)
  const ringingCaller = useRef<QueueCaller | null>(null) // the queued caller shown as "Incoming"
  const pickingUp = useRef(false)
  const dismissed = useRef(new Set<string>()) // queued calls already answered, declined or missed
  const roomTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const send = useCallback((event: CallEvent) => {
    stateRef.current = callReducer(stateRef.current, event)
    dispatch(event)
  }, [])

  const fail = useCallback(
    (e: unknown) => {
      send({ type: 'FAILED', error: errorText(e) })
      setNotice(errorText(e))
    },
    [send],
  )

  const ensureDevice = useCallback(() => {
    if (!deviceRef.current) {
      const created = createTwilioDevice().then((d) => {
        d.onError((e) => {
          if (MIC_BLOCKED_CODES.has(e.code ?? -1)) setStatus('mic_blocked')
          setStatusDetail(errorText(e))
        })
        return d
      })
      created.catch(() => {
        if (deviceRef.current === created) deviceRef.current = null // let the next attempt retry
      })
      deviceRef.current = created
    }
    return deviceRef.current
  }, [])

  const stopRoomWatch = () => {
    if (roomTimer.current) clearInterval(roomTimer.current)
    roomTimer.current = null
  }

  useEffect(
    () => () => {
      stopRoomWatch()
      deviceRef.current?.then((d) => d.destroy()).catch(() => {})
      deviceRef.current = null
    },
    [],
  )

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(undefined), 6000)
    return () => clearTimeout(t)
  }, [notice])

  // ── inbound: watch the queue while online ──────────────
  const onQueue = useCallback(
    (callers: QueueCaller[]) => {
      const s = stateRef.current
      if (s.phase === 'incoming') {
        const ringing = ringingCaller.current
        if (ringing && !pickingUp.current && !callers.some((c) => c.callSid === ringing.callSid)) {
          // They hung up, or the hold timed out, before the agent answered.
          dismissed.current.add(ringing.callSid)
          ringingCaller.current = null
          if (s.contact) logMissed(s.contact)
          send({ type: 'MISSED' })
        }
        return
      }
      // Busy agent: callers just keep waiting in the queue and ring once the agent is free.
      const next = callers.find((c) => !dismissed.current.has(c.callSid))
      if (s.phase === 'idle' && next) {
        ringingCaller.current = next
        send({ type: 'INCOMING', contact: contactFor(next.from), at: Date.now() })
      }
    },
    [send],
  )

  useEffect(() => {
    if (status !== 'online') return
    let alive = true
    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      const res = await getJson<{ callers: QueueCaller[] }>('/api/queue')
      if (alive && res) onQueue(res.callers)
    }
    poll()
    const t = setInterval(poll, QUEUE_POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [status, onQueue])

  async function goOnline() {
    setStatus('connecting')
    setStatusDetail(undefined)
    try {
      // The click is the user gesture: get mic permission now, not mid-way through answering a call.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setStatus('mic_blocked')
      setStatusDetail(MIC_HELP)
      return
    }
    try {
      await ensureDevice() // proves the token works before we promise to ring
      setStatus('online')
    } catch (e) {
      setStatus('error')
      setStatusDetail(errorText(e))
    }
  }

  async function goOffline() {
    setStatus('offline')
  }

  async function accept() {
    const ringing = ringingCaller.current
    if (stateRef.current.phase !== 'incoming' || !ringing || pickingUp.current) return
    pickingUp.current = true
    dismissed.current.add(ringing.callSid)
    const missed = () => {
      const { contact } = stateRef.current
      if (contact) logMissed(contact)
      send({ type: 'MISSED' })
    }
    try {
      const d = await ensureDevice()
      const c = await d.connect({ pickup: '1' })
      activeRef.current = c
      c.on('accept', () => {
        pickingUp.current = false
        send({ type: 'CONNECTED', at: Date.now() })
      })
      c.on('disconnect', () => {
        activeRef.current = null
        pickingUp.current = false
        if (stateRef.current.phase === 'incoming') missed() // queue emptied before we got there
        else send({ type: 'ENDED', at: Date.now() })
      })
      c.on('error', (e) => setNotice(errorText(e)))
    } catch (e) {
      pickingUp.current = false
      missed()
      setNotice(errorText(e))
    }
  }

  function decline() {
    const ringing = ringingCaller.current
    const { phase, contact } = stateRef.current
    if (phase !== 'incoming' || !ringing || pickingUp.current) return
    dismissed.current.add(ringing.callSid)
    ringingCaller.current = null
    void getJson('/api/queue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decline: ringing.callSid }) })
    if (contact) logMissed(contact)
    send({ type: 'MISSED' })
  }

  // ── outbound: browser joins the room, the server rings the phone into it ──
  function watchRoom(agentSid: string | undefined) {
    stopRoomWatch()
    if (!agentSid) return
    roomTimer.current = setInterval(async () => {
      const res = await getJson<{ connected: boolean }>(`/api/room?agent=${agentSid}`)
      if (res?.connected && stateRef.current.phase === 'ringing') {
        stopRoomWatch()
        send({ type: 'CONNECTED', at: Date.now() })
      }
    }, ROOM_POLL_MS)
  }

  async function place(contact: Contact) {
    if (stateRef.current.phase !== 'idle') {
      setNotice('Finish the current call first.')
      return
    }
    hangupRequested.current = false
    send({ type: 'DIAL', contact, at: Date.now() })
    try {
      const d = await ensureDevice()
      const c = await d.connect(contact.leadId ? { leadId: contact.leadId } : { To: contact.number })
      activeRef.current = c
      // `accept` = the agent is in the room. The customer's phone is ringing until they join it.
      c.on('accept', () => {
        send({ type: 'RINGING' })
        watchRoom(c.parameters.CallSid)
      })
      c.on('disconnect', () => {
        stopRoomWatch()
        activeRef.current = null
        send({ type: 'ENDED', at: Date.now() })
      })
      c.on('error', fail)
      if (hangupRequested.current) c.disconnect() // agent hung up while we were still dialling
    } catch (e) {
      fail(e)
    }
  }

  function hangup() {
    if (activeRef.current) {
      activeRef.current.disconnect()
    } else if (['connecting', 'ringing'].includes(stateRef.current.phase)) {
      hangupRequested.current = true
      send({ type: 'ENDED', at: Date.now() })
    }
  }

  function toggleMute() {
    const { phase, muted } = stateRef.current
    if (phase !== 'in_call' || !activeRef.current) return
    activeRef.current.mute(!muted)
    send({ type: 'MUTE', muted: !muted })
  }

  function sendDigits(digits: string) {
    if (stateRef.current.phase === 'in_call') activeRef.current?.sendDigits(digits)
  }

  function finishWrapUp(result?: { outcome?: Outcome; summary?: string }) {
    const s = stateRef.current
    if (s.phase !== 'wrap_up' || !s.contact) return
    callLog.add({
      name: s.contact.name,
      number: s.contact.number,
      leadId: s.contact.leadId,
      direction: s.direction ?? 'outgoing',
      at: s.startedAt ?? Date.now(),
      durationSec: callSeconds(s),
      outcome: result?.outcome,
      summary: result?.summary?.trim() || undefined,
    })
    send({ type: 'DONE' })
  }

  const api: CallApi = {
    call,
    status,
    statusDetail,
    notice,
    dismissNotice: () => setNotice(undefined),
    goOnline,
    goOffline,
    place,
    accept,
    decline,
    hangup,
    toggleMute,
    sendDigits,
    finishWrapUp,
  }

  return <CallContext.Provider value={api}>{children}</CallContext.Provider>
}
