// The call lifecycle from flow.md §2 as a pure reducer. Twilio events are translated into these
// events by CallProvider; anything that doesn't fit the current phase is ignored (returns state).

export interface Contact {
  name: string
  /** E.164 or as typed; for lead calls this is the sample CRM number shown in the UI. */
  number: string
  leadId?: string
}

export type Phase = 'idle' | 'connecting' | 'ringing' | 'incoming' | 'in_call' | 'wrap_up'

export interface CallState {
  phase: Phase
  contact?: Contact
  direction?: 'outgoing' | 'incoming'
  startedAt?: number
  /** Set when audio is bridged. Absent at wrap-up → the call never connected. */
  connectedAt?: number
  endedAt?: number
  muted: boolean
}

export type CallEvent =
  | { type: 'DIAL'; contact: Contact; at: number }
  | { type: 'RINGING' }
  | { type: 'CONNECTED'; at: number }
  | { type: 'INCOMING'; contact: Contact; at: number }
  | { type: 'ENDED'; at: number }
  | { type: 'MISSED' }
  | { type: 'FAILED'; error: string }
  | { type: 'MUTE'; muted: boolean }
  | { type: 'DONE' }

export const initialCallState: CallState = { phase: 'idle', muted: false }

export function callReducer(state: CallState, event: CallEvent): CallState {
  switch (event.type) {
    case 'DIAL':
      return state.phase === 'idle'
        ? { phase: 'connecting', contact: event.contact, direction: 'outgoing', startedAt: event.at, muted: false }
        : state
    case 'INCOMING':
      return state.phase === 'idle'
        ? { phase: 'incoming', contact: event.contact, direction: 'incoming', startedAt: event.at, muted: false }
        : state
    case 'RINGING':
      return state.phase === 'connecting' ? { ...state, phase: 'ringing' } : state
    case 'CONNECTED':
      return ['connecting', 'ringing', 'incoming'].includes(state.phase)
        ? { ...state, phase: 'in_call', connectedAt: event.at }
        : state
    case 'ENDED':
      return ['connecting', 'ringing', 'in_call'].includes(state.phase)
        ? { ...state, phase: 'wrap_up', endedAt: event.at, muted: false }
        : state
    case 'MISSED':
      return state.phase === 'incoming' ? { ...initialCallState } : state
    case 'FAILED':
      // Only before anything connected (the provider shows event.error). A failure mid-call arrives as ENDED.
      return ['connecting', 'ringing'].includes(state.phase) ? { ...initialCallState } : state
    case 'MUTE':
      return state.phase === 'in_call' ? { ...state, muted: event.muted } : state
    case 'DONE':
      return state.phase === 'wrap_up' ? { ...initialCallState } : state
  }
}

/** Whole seconds between connect and end (or now). 0 if it never connected. */
export function callSeconds(state: Pick<CallState, 'connectedAt' | 'endedAt'>, now = Date.now()): number {
  if (!state.connectedAt) return 0
  return Math.max(0, Math.floor(((state.endedAt ?? now) - state.connectedAt) / 1000))
}

export const isLive = (phase: Phase) => phase !== 'idle'
