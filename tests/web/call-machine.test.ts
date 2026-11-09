import { describe, expect, it } from 'vitest'
import { callReducer, callSeconds, initialCallState as idle, type CallEvent, type CallState } from '../../src/calling/machine'

const contact = { name: 'Ritu S.', number: '+91 98450 00001', leadId: 'ritu-s' }
const run = (...events: CallEvent[]) => events.reduce(callReducer, idle)

const dial: CallEvent = { type: 'DIAL', contact, at: 1_000 }
const incoming: CallEvent = { type: 'INCOMING', contact, at: 1_000 }

describe('call state machine: outbound', () => {
  it('dial → ringing → connected → ended → wrap-up → idle', () => {
    let s: CallState = run(dial)
    expect(s).toMatchObject({ phase: 'connecting', direction: 'outgoing', contact, startedAt: 1_000 })
    s = callReducer(s, { type: 'RINGING' })
    expect(s.phase).toBe('ringing')
    s = callReducer(s, { type: 'CONNECTED', at: 2_000 })
    expect(s).toMatchObject({ phase: 'in_call', connectedAt: 2_000 })
    s = callReducer(s, { type: 'ENDED', at: 65_000 })
    expect(s).toMatchObject({ phase: 'wrap_up', endedAt: 65_000 })
    expect(callSeconds(s)).toBe(63)
    expect(callReducer(s, { type: 'DONE' })).toEqual(idle)
  })

  it('connects straight from connecting (no ringing event)', () => {
    expect(run(dial, { type: 'CONNECTED', at: 2_000 }).phase).toBe('in_call')
  })

  it('ending before anyone answers still goes to wrap-up, as "not connected"', () => {
    const s = run(dial, { type: 'RINGING' }, { type: 'ENDED', at: 9_000 })
    expect(s.phase).toBe('wrap_up')
    expect(s.connectedAt).toBeUndefined()
    expect(callSeconds(s)).toBe(0)
  })

  it('a failure before connecting returns to idle', () => {
    expect(run(dial, { type: 'FAILED', error: 'mic' })).toEqual(idle)
    expect(run(dial, { type: 'RINGING' }, { type: 'FAILED', error: 'x' })).toEqual(idle)
  })

  it('a failure after connecting is ignored (the disconnect ends the call)', () => {
    const live = run(dial, { type: 'CONNECTED', at: 2_000 })
    expect(callReducer(live, { type: 'FAILED', error: 'x' })).toBe(live)
  })

  it('mute only applies on a live call and resets at the end', () => {
    expect(run(dial, { type: 'MUTE', muted: true }).muted).toBe(false)
    const muted = run(dial, { type: 'CONNECTED', at: 2_000 }, { type: 'MUTE', muted: true })
    expect(muted.muted).toBe(true)
    expect(callReducer(muted, { type: 'ENDED', at: 3_000 }).muted).toBe(false)
  })
})

describe('call state machine: inbound', () => {
  it('incoming → answered → ended → wrap-up', () => {
    const s = run(incoming, { type: 'CONNECTED', at: 3_000 }, { type: 'ENDED', at: 13_000 })
    expect(s).toMatchObject({ phase: 'wrap_up', direction: 'incoming' })
    expect(callSeconds(s)).toBe(10)
  })

  it('missed (declined or caller hung up) goes straight back to idle', () => {
    expect(run(incoming, { type: 'MISSED' })).toEqual(idle)
  })
})

describe('call state machine: one call at a time', () => {
  const live = run(dial, { type: 'CONNECTED', at: 2_000 })

  it.each<CallEvent>([dial, incoming, { type: 'RINGING' }, { type: 'MISSED' }, { type: 'DONE' }])(
    'ignores %o during a live call',
    (event) => expect(callReducer(live, event)).toBe(live),
  )

  it.each<CallEvent>([{ type: 'RINGING' }, { type: 'CONNECTED', at: 1 }, { type: 'ENDED', at: 1 }, { type: 'MISSED' }, { type: 'DONE' }])(
    'ignores %o when idle',
    (event) => expect(callReducer(idle, event)).toBe(idle),
  )

  it('ignores a late ENDED during wrap-up (Twilio disconnect after a local hang-up)', () => {
    const wrap = run(dial, { type: 'ENDED', at: 2_000 })
    expect(callReducer(wrap, { type: 'ENDED', at: 3_000 })).toBe(wrap)
  })
})
