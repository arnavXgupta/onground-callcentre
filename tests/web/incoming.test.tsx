import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callLog } from '../../src/calling/callLog'
import { phone } from './fake-phone'
import { renderAt } from './render'

vi.mock('../../src/calling/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/calling/device')>()
  const { phone } = await import('./fake-phone')
  return { ...actual, createTwilioDevice: vi.fn(async () => phone.device) }
})

const section = () => screen.getByRole('region', { name: 'Missed calls' })
const rows = () => within(section()).getAllByRole('listitem')
const names = () => rows().map((li) => li.querySelector('.rowTitle')?.textContent)
const row = (name: string) => rows().find((li) => li.querySelector('.rowTitle')?.textContent === name)!

// Sample calls are dated relative to "now": pin the clock (Date only, so timers and userEvent stay real).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 9, 15, 0))
})
afterEach(() => vi.useRealTimers())

beforeEach(() => {
  phone.reset()
  callLog.clear()
})

describe('Incoming', () => {
  it('summarises the missed calls and the value at stake', () => {
    renderAt('/plan/incoming')
    expect(section()).toHaveTextContent('5Missed')
    expect(section()).toHaveTextContent('₹81,860Expected value at stake')
  })

  it('ranks by expected value with the lead signal on each row', () => {
    renderAt('/plan/incoming')
    expect(names()).toEqual(['Faizan A.', 'Kavitha R.', 'Divya P.', 'Ritu S.', 'Unknown'])
    expect(row('Faizan A.')).toHaveTextContent(/Missed Today 10:05 AM · Visited store \/ in CRM/)
    expect(row('Faizan A.')).toHaveTextContent('₹24,990 expected')
    expect(row('Kavitha R.')).toHaveTextContent('Warm lead')
    expect(row('Unknown')).toHaveTextContent('New contact')
    expect(row('Unknown')).toHaveTextContent('No prior record')
  })

  it('calls a lead back through its leadId, an unknown caller by number', async () => {
    const { user } = renderAt('/plan/incoming')
    await user.click(within(row('Faizan A.')).getByRole('button', { name: 'Call back' }))
    expect(phone.device.connect).toHaveBeenLastCalledWith({ leadId: 'faizan-a' })
  })

  it('calls an unknown caller back by number', async () => {
    const { user } = renderAt('/plan/incoming')
    await user.click(within(row('Unknown')).getByRole('button', { name: 'Call back' }))
    expect(phone.device.connect).toHaveBeenLastCalledWith({ To: '+91 80412 55770' })
  })

  it('includes real missed calls from the call log', () => {
    callLog.add({ name: '+15550001111', number: '+15550001111', direction: 'missed', at: Date.now(), durationSec: 0 })
    renderAt('/plan/incoming')
    expect(section()).toHaveTextContent('6Missed')
    expect(row('+15550001111')).toHaveTextContent('No prior record')
  })

  it('shows Called back after a call-back and takes it out of the value at stake', () => {
    callLog.add({ name: 'Ritu S.', leadId: 'ritu-s', number: '+91 98450 00001', direction: 'outgoing', at: Date.now() + 60_000, durationSec: 80 })
    renderAt('/plan/incoming')
    expect(names().at(-1)).toBe('Ritu S.')
    expect(row('Ritu S.')).toHaveTextContent('Called back')
    expect(section()).toHaveTextContent('4Missed')
    expect(section()).toHaveTextContent('₹68,470')
  })
})
