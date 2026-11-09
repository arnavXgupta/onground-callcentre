import { useSyncExternalStore } from 'react'

export const OUTCOMES = [
  'Interested',
  'Follow-up needed',
  'Requested callback',
  'Resolved',
  'Not interested',
  'No answer',
] as const
export type Outcome = (typeof OUTCOMES)[number]

export interface CallLogEntry {
  id: string
  name: string
  number: string
  leadId?: string
  direction: 'outgoing' | 'incoming' | 'missed'
  /** epoch ms when the call started (dialled / rang) */
  at: number
  durationSec: number
  outcome?: Outcome
  summary?: string
}

// Calls made in this browser, newest first. Persisted so the demo survives a reload (decisions D7).
const KEY = 'og.callLog.v1'
const listeners = new Set<() => void>()
let entries: CallLogEntry[] = load()

function load(): CallLogEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // private mode / quota: keep the in-memory log
  }
  listeners.forEach((l) => l())
}

export const callLog = {
  add(entry: Omit<CallLogEntry, 'id'>) {
    entries = [{ id: crypto.randomUUID(), ...entry }, ...entries]
    save()
  },
  clear() {
    entries = []
    save()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => entries,
}

export function useCallLog(): CallLogEntry[] {
  return useSyncExternalStore(callLog.subscribe, callLog.getSnapshot)
}

/** Pill colour per outcome (Recent list, review modal). */
export const OUTCOME_TONE: Record<Outcome, 'brand' | 'info' | 'danger' | 'neutral'> = {
  Interested: 'brand',
  Resolved: 'brand',
  'Follow-up needed': 'info',
  'Requested callback': 'info',
  'Not interested': 'danger',
  'No answer': 'neutral',
}
