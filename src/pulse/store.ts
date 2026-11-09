// Runtime Pulse state on top of pulse.json: messages the agent sent, Needs-your-input answers,
// channels opened. Persisted so the demo survives a reload (decisions D7). The dashboard's task
// count reads the open asks from here.
import { useSyncExternalStore } from 'react'
import { pulse } from '../data'
import type { PulseAsk, PulseChannel, PulseMessage } from '../data/types'
import { timeOfDay } from '../lib/format'
import { reply } from './avanibot'

export interface PulseState {
  sent: Record<string, PulseMessage[]>
  /** askId → the answer given */
  answered: Record<string, string>
  read: string[]
  /** AvaniBot is composing (not persisted) */
  botTyping: boolean
}

const KEY = 'og.pulse.v1'
const EMPTY: PulseState = { sent: {}, answered: {}, read: [], botTyping: false }
export const BOT_DELAY_MS = 700

const listeners = new Set<() => void>()
let state: PulseState = load()

function load(): PulseState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return saved ? { ...EMPTY, ...saved, botTyping: false } : EMPTY
  } catch {
    return EMPTY
  }
}

function set(next: PulseState) {
  state = next
  try {
    const { botTyping: _, ...persisted } = next
    localStorage.setItem(KEY, JSON.stringify(persisted))
  } catch {
    // storage blocked: keep going in memory
  }
  listeners.forEach((l) => l())
}

/** "2:31pm", same style as the sample threads */
const nowLabel = () => timeOfDay(Date.now()).replace(' ', '').toLowerCase()

function append(channelId: string, message: PulseMessage) {
  set({ ...state, sent: { ...state.sent, [channelId]: [...(state.sent[channelId] ?? []), message] } })
}

const mine = (text: string, extra?: Partial<PulseMessage>): PulseMessage => ({
  from: 'You',
  initials: 'AR',
  time: nowLabel(),
  mine: true,
  text,
  ...extra,
})

export const pulseStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => state,

  /** Post the agent's message. Whitespace-only text is ignored. AvaniBot answers in its DM. */
  send(channelId: string, text: string) {
    const body = text.trim()
    if (!body) return false
    append(channelId, mine(body))
    if (channelId === 'avanibot') {
      set({ ...state, botTyping: true })
      setTimeout(() => {
        append('avanibot', { from: 'AvaniBot', initials: 'AI', bot: true, time: nowLabel(), text: reply(body) })
        set({ ...state, botTyping: false })
      }, BOT_DELAY_MS)
    }
    return true
  },

  /** Answer a pinned ask: records it, and posts the answer in the thread marked done. */
  answer(channelId: string, askId: string, answer: string) {
    const body = answer.trim()
    if (!body || askId in state.answered) return false
    set({ ...state, answered: { ...state.answered, [askId]: body } })
    append(channelId, mine(body, { done: true }))
    return true
  },

  markRead(channelId: string) {
    if (!state.read.includes(channelId)) set({ ...state, read: [...state.read, channelId] })
  },

  reset() {
    set(EMPTY)
  },
}

export function usePulse(): PulseState {
  return useSyncExternalStore(pulseStore.subscribe, pulseStore.getSnapshot)
}

export const threadFor = (c: PulseChannel, s: PulseState) => [...c.messages, ...(s.sent[c.id] ?? [])]

export const openAsks = (c: PulseChannel, s: PulseState): PulseAsk[] => (c.asks ?? []).filter((a) => !(a.id in s.answered))

/** Badge on the home list: unread until opened, plus anything still waiting on the agent. */
export const badgeFor = (c: PulseChannel, s: PulseState) => (s.read.includes(c.id) ? 0 : c.unread) + openAsks(c, s).length

/** Every unanswered ask across Pulse, with its channel: the dashboard's task list. */
export const allOpenAsks = (s: PulseState) => pulse.channels.flatMap((c) => openAsks(c, s).map((ask) => ({ channelId: c.id, ask })))
