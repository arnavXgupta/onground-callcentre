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

const section = () => screen.getByRole('region', { name: 'Recent calls' })
const rows = () => within(section()).getAllByRole('listitem')
const nameOf = (li: HTMLElement) => li.querySelector('.rowTitle')?.firstChild?.textContent
const rowButton = (name: string, nth = 0) => within(rows().filter((li) => nameOf(li) === name)[nth]).getByRole('button')

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

describe('Recent', () => {
  it('lists every call newest first with type, time and length', () => {
    renderAt('/plan/recent')
    expect(rows().map(nameOf)).toEqual([
      'Ritu S.',
      'Mukunda R.',
      'Faizan A.',
      'Kavitha R.',
      'Divya P.',
      'Unknown',
      'Kavitha R.',
      'Faizan A.',
    ])
    expect(rowButton('Mukunda R.')).toHaveTextContent('Incoming call:')
    expect(rowButton('Mukunda R.')).toHaveTextContent('Today 10:42 AM · 4m 12s')
    expect(rowButton('Ritu S.')).toHaveTextContent('Missed call:')
    expect(rowButton('Kavitha R.', 1)).toHaveTextContent('Outgoing call:')
    expect(rowButton('Kavitha R.', 1)).toHaveTextContent('Yesterday 11:50 AM · 2m 05s')
  })

  it('reviews a connected call against SOP', async () => {
    const { user } = renderAt('/plan/recent')
    await user.click(rowButton('Mukunda R.'))
    const dialog = screen.getByRole('dialog', { name: 'Call with Mukunda R.' })
    expect(within(dialog).getByRole('meter', { name: 'SOP adherence' })).toHaveAttribute('aria-valuenow', '83')
    expect(dialog).toHaveTextContent('83%')
    const warranty = within(dialog).getByText('Warranty mention').closest('li')!
    expect(warranty).toHaveTextContent('Missed')
    expect(warranty).toHaveTextContent('No mention of the warranty period')
    expect(within(dialog).getAllByLabelText('Done')).toHaveLength(5)

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a call made in the app shows at the top with its outcome, and its wrap-up in review', async () => {
    callLog.add({
      name: 'Ritu S.',
      leadId: 'ritu-s',
      number: '+91 98450 00001',
      direction: 'outgoing',
      at: Date.now() + 60_000,
      durationSec: 95,
      outcome: 'Interested',
      summary: 'Wants delivery on Friday',
    })
    const { user } = renderAt('/plan/recent')
    const top = rows()[0]
    expect(nameOf(top)).toBe('Ritu S.')
    expect(top).toHaveTextContent('Interested')
    expect(top).toHaveTextContent('1m 35s')

    await user.click(within(top).getByRole('button'))
    const dialog = screen.getByRole('dialog', { name: 'Call with Ritu S.' })
    expect(dialog).toHaveTextContent('Wants delivery on Friday')
    expect(dialog).toHaveTextContent('Recording is off in this demo')
    expect(within(dialog).queryByRole('meter')).not.toBeInTheDocument()
  })

  it('a missed call has nothing to review but can be called back', async () => {
    const { user } = renderAt('/plan/recent')
    await user.click(rowButton('Ritu S.'))
    const dialog = screen.getByRole('dialog', { name: 'Call with Ritu S.' })
    expect(dialog).toHaveTextContent('No conversation to review')
    await user.click(within(dialog).getByRole('button', { name: 'Call back' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(phone.device.connect).toHaveBeenCalledWith({ leadId: 'ritu-s' })
  })
})
