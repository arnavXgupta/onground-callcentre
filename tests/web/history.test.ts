import { describe, expect, it } from 'vitest'
import type { CallLogEntry } from '../../src/calling/callLog'
import { mergeHistory, missedCalls, sampleCalls, signalFor, valueAtStake } from '../../src/calling/history'
import { leadById } from '../../src/data'

const now = new Date(2026, 10, 9, 15, 0) // Mon 9 Nov, 3pm
const samples = sampleCalls(now)

function live(entry: Partial<CallLogEntry>): CallLogEntry {
  return { id: crypto.randomUUID(), name: 'x', number: '', direction: 'outgoing', at: now.getTime(), durationSec: 60, ...entry }
}

describe('sample history', () => {
  it('is dated relative to today', () => {
    const mukunda = samples.find((c) => c.id === 's-mukunda-in')!
    expect(new Date(mukunda.at)).toEqual(new Date(2026, 10, 9, 10, 42))
    const faizanOut = samples.find((c) => c.id === 's-faizan-out')!
    expect(new Date(faizanOut.at)).toEqual(new Date(2026, 10, 6, 15, 20))
    expect(samples.every((c) => c.sample)).toBe(true)
  })

  it('never dates a sample call in the future (early-morning demo)', () => {
    const early = sampleCalls(new Date(2026, 10, 9, 9, 0))
    const ritu = early.find((c) => c.id === 's-ritu-missed')! // 11:20 "today"
    expect(new Date(ritu.at)).toEqual(new Date(2026, 10, 8, 11, 20))
    expect(early.every((c) => c.at <= new Date(2026, 10, 9, 9, 0).getTime())).toBe(true)
  })

  it('merges with live calls, newest first', () => {
    const merged = mergeHistory([live({ id: 'mine', at: now.getTime() })], samples)
    expect(merged[0].id).toBe('mine')
    expect(merged.map((c) => c.at)).toEqual([...merged.map((c) => c.at)].sort((a, b) => b - a))
    expect(merged).toHaveLength(9)
  })
})

describe('missed calls', () => {
  it('ranks by value at stake, ties most recent first: the mock order and ₹81,860', () => {
    const rows = missedCalls(samples)
    expect(rows.map((r) => r.call.name)).toEqual(['Faizan A.', 'Kavitha R.', 'Divya P.', 'Ritu S.', 'Unknown'])
    expect(rows.map((r) => r.value)).toEqual([24990, 24990, 18490, 13390, 0])
    expect(valueAtStake(rows)).toBe(81860)
  })

  it('labels each caller by lead signal', () => {
    expect(missedCalls(samples).map((r) => r.signal)).toEqual([
      'Visited store / in CRM',
      'Warm lead',
      'Cold lead',
      'Visited store / in CRM',
      'No prior record',
    ])
  })

  it.each([
    ['ritu-s', 'Visited store / in CRM'], // icp 94
    ['faizan-a', 'Visited store / in CRM'], // 82
    ['kavitha-r', 'Warm lead'], // 61
    ['divya-p', 'Cold lead'], // 34
  ])('signalFor(%s) → %s', (id, signal) => expect(signalFor(leadById(id))).toBe(signal))

  it('marks a lead called back after the miss, sinks it and drops it from the stake', () => {
    const history = mergeHistory([live({ leadId: 'ritu-s', at: now.getTime() })], samples)
    const rows = missedCalls(history)
    expect(rows.at(-1)).toMatchObject({ calledBack: true, call: { name: 'Ritu S.' } })
    expect(valueAtStake(rows)).toBe(81860 - 13390)
  })

  it('matches an unknown caller by phone number', () => {
    const history = mergeHistory([live({ number: '+918041255770', at: now.getTime() })], samples)
    expect(missedCalls(history).find((r) => r.call.name === 'Unknown')?.calledBack).toBe(true)
  })

  it('an outgoing call from before the miss does not count as a call back', () => {
    const before = new Date(2026, 10, 9, 9, 0).getTime() // Ritu missed at 11:20
    const rows = missedCalls(mergeHistory([live({ leadId: 'ritu-s', at: before })], samples))
    expect(rows.find((r) => r.call.name === 'Ritu S.')?.calledBack).toBe(false)
  })
})
