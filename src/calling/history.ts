// Call history = calls made in this browser (callLog) + the sample history (calls.json),
// dated relative to today so the demo always reads "Today / Yesterday".
import { useMemo } from 'react'
import { leadById } from '../data'
import samples from '../data/calls.json'
import type { Lead, SopItem } from '../data/types'
import { useCallLog, type CallLogEntry } from './callLog'

export interface CallRecord extends CallLogEntry {
  /** SOP review: only on sample calls that connected (see docs/06-recent.md). */
  sop?: SopItem[]
  sample?: boolean
}

interface SampleCall {
  id: string
  name: string
  leadId?: string
  number: string
  direction: CallLogEntry['direction']
  daysAgo: number
  time: string // "HH:MM", 24h
  durationSec: number
  sop?: SopItem[]
}

export function sampleCalls(now = new Date()): CallRecord[] {
  return (samples as SampleCall[]).map(({ daysAgo, time, ...call }) => {
    const [h, m] = time.split(':').map(Number)
    let at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m).getTime()
    // An early-morning demo must not show calls from later today: push those back a day.
    if (at > now.getTime()) at = new Date(at).setDate(new Date(at).getDate() - 1)
    return { ...call, at, sample: true }
  })
}

export function mergeHistory(live: CallLogEntry[], sample: CallRecord[]): CallRecord[] {
  return [...live, ...sample].sort((a, b) => b.at - a.at)
}

export function useCallHistory(): CallRecord[] {
  const live = useCallLog()
  return useMemo(() => mergeHistory(live, sampleCalls()), [live])
}

const digits = (n: string) => n.replace(/\D/g, '')

/** Same person: same lead, or same phone number when there's no lead. */
const samePerson = (a: CallLogEntry, b: CallLogEntry) =>
  a.leadId && b.leadId ? a.leadId === b.leadId : digits(a.number) !== '' && digits(a.number) === digits(b.number)

export type Signal = 'Visited store / in CRM' | 'Warm lead' | 'Cold lead' | 'No prior record'

export function signalFor(lead?: Lead): Signal {
  if (!lead) return 'No prior record'
  return lead.icp >= 80 ? 'Visited store / in CRM' : lead.icp >= 55 ? 'Warm lead' : 'Cold lead'
}

export interface MissedRow {
  call: CallRecord
  lead?: Lead
  /** Expected value if won (the lead's product price); 0 for unknown callers. */
  value: number
  signal: Signal
  /** An outgoing call to the same person happened after this miss. */
  calledBack: boolean
}

/** Missed calls ranked by value at stake, ties most recent first; called-back ones sink to the bottom. */
export function missedCalls(history: CallRecord[]): MissedRow[] {
  return history
    .filter((c) => c.direction === 'missed')
    .map((call) => {
      const lead = call.leadId ? leadById(call.leadId) : undefined
      const calledBack = history.some((o) => o.direction === 'outgoing' && o.at > call.at && samePerson(o, call))
      return { call, lead, value: lead?.price ?? 0, signal: signalFor(lead), calledBack }
    })
    .sort((a, b) => Number(a.calledBack) - Number(b.calledBack) || b.value - a.value || b.call.at - a.call.at)
}

/** Total value still at stake: missed calls not yet called back. */
export const valueAtStake = (rows: MissedRow[]) => rows.reduce((sum, r) => sum + (r.calledBack ? 0 : r.value), 0)
