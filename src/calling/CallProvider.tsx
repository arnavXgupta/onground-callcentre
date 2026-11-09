import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { leads } from '../data'
import { callLog, type Outcome } from './callLog'
import { createTwilioDevice, MIC_BLOCKED_CODES, type DeviceError, type PhoneCall, type PhoneDevice } from './device'
import { callReducer, callSeconds, initialCallState, type CallEvent, type CallState, type Contact } from './machine'

export type DeviceStatus = 'offline' | 'connecting' | 'online' | 'mic_blocked' | 'error'

export interface CallApi {
  call: CallState
  /** Inbound availability (registration). Outbound works in any status. */
  status: DeviceStatus
  statusDetail?: string
  /** Short-lived message for the agent (call failed, blocked second call…). */
  notice?: string
  dismissNotice(): void
  goOnline(): Promise<void>
  goOffline(): Promise<void>
  place(contact: Contact): Promise<void>
  accept(): void
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

export function CallProvider({ children }: { children: ReactNode }) {
  const [call, dispatch] = useReducer(callReducer, initialCallState)
  const [status, setStatus] = useState<DeviceStatus>('offline')
  const [statusDetail, setStatusDetail] = useState<string>()
  const [notice, setNotice] = useState<string>()

  // Twilio fires events between renders, so handlers read this ref, kept in lockstep with the reducer.
  const stateRef = useRef<CallState>(initialCallState)
  const deviceRef = useRef<Promise<PhoneDevice> | null>(null)
  const activeRef = useRef<PhoneCall | null>(null)
  const hangupRequested = useRef(false)

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

  const handleIncoming = useCallback(
    (c: PhoneCall) => {
      const contact = contactFor(c.parameters.From ?? '')
      if (stateRef.current.phase !== 'idle') {
        c.reject() // busy: one call at a time
        logMissed(contact)
        return
      }
      activeRef.current = c
      c.on('accept', () => send({ type: 'CONNECTED', at: Date.now() }))
      c.on('cancel', () => {
        activeRef.current = null
        if (stateRef.current.phase === 'incoming') {
          send({ type: 'MISSED' })
          logMissed(contact)
        }
      })
      c.on('disconnect', () => {
        activeRef.current = null
        send({ type: 'ENDED', at: Date.now() })
      })
      c.on('error', (e) => setNotice(errorText(e)))
      send({ type: 'INCOMING', contact, at: Date.now() })
    },
    [send],
  )

  const ensureDevice = useCallback(() => {
    if (!deviceRef.current) {
      const created = createTwilioDevice().then((d) => {
        d.onIncoming(handleIncoming)
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
  }, [handleIncoming])

  useEffect(
    () => () => {
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
      const d = await ensureDevice()
      await d.register()
      setStatus('online')
    } catch (e) {
      setStatus('error')
      setStatusDetail(errorText(e))
    }
  }

  async function goOffline() {
    const d = await deviceRef.current?.catch(() => null)
    await d?.unregister().catch(() => {})
    setStatus('offline')
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
      c.on('ringing', () => send({ type: 'RINGING' }))
      c.on('accept', () => send({ type: 'CONNECTED', at: Date.now() }))
      c.on('disconnect', () => {
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

  function decline() {
    const c = activeRef.current
    const { phase, contact } = stateRef.current
    if (!c || phase !== 'incoming' || !contact) return
    activeRef.current = null
    c.reject()
    logMissed(contact)
    send({ type: 'MISSED' })
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
    accept: () => {
      if (stateRef.current.phase === 'incoming') activeRef.current?.accept()
    },
    decline,
    hangup,
    toggleMute,
    sendDigits,
    finishWrapUp,
  }

  return <CallContext.Provider value={api}>{children}</CallContext.Provider>
}
