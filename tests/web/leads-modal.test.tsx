import { screen, within } from '@testing-library/react'
import { useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { phone } from './fake-phone'
import { renderAt } from './render'

vi.mock('../../src/calling/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/calling/device')>()
  const { phone } = await import('./fake-phone')
  return { ...actual, createTwilioDevice: vi.fn(async () => phone.device) }
})

const modal = () => screen.getByRole('dialog', { name: 'Leads' })
const fold = (name: string) => within(modal()).getByText(name, { selector: 'summary' }).closest('details')!

beforeEach(() => phone.reset())

describe('Leads modal', () => {
  it('opens from ?leads on lead 1 with ICP and intent', () => {
    renderAt('/dashboard?leads')
    expect(modal()).toHaveTextContent('Lead 1 of 5 · SLA to close')
    expect(modal()).toHaveTextContent('Mukunda')
    expect(modal()).toHaveTextContent('Interested: Ortho GRID · ₹8,490')
    expect(modal()).toHaveTextContent('2h left')
    expect(within(modal()).getByRole('meter', { name: 'ICP' })).toHaveAttribute('aria-valuenow', '87')
    expect(modal()).toHaveTextContent('Lead intent score91')
  })

  it('opens at a given lead, and falls back to lead 1 for an unknown id', () => {
    renderAt('/plan/outgoing?leads=ritu-s')
    expect(modal()).toHaveTextContent('Lead 4 of 5')
    expect(modal()).toHaveTextContent('Ritu S.')
  })

  it('falls back to lead 1 for an unknown id', () => {
    renderAt('/dashboard?leads=nobody')
    expect(modal()).toHaveTextContent('Lead 1 of 5')
  })

  it('pages with the arrows, the dots and the keyboard, and stops at the ends', async () => {
    const { user } = renderAt('/dashboard?leads')
    const prev = within(modal()).getByRole('button', { name: 'Previous lead' })
    const next = within(modal()).getByRole('button', { name: 'Next lead' })
    expect(prev).toBeDisabled()

    await user.click(next)
    expect(modal()).toHaveTextContent('Lead 2 of 5')
    expect(modal()).toHaveTextContent('Kavitha R.')
    expect(modal()).toHaveTextContent('SLA missed. 5 days of grace left to close.')

    await user.click(within(modal()).getByRole('button', { name: 'Go to lead 5: Divya P.' }))
    expect(modal()).toHaveTextContent('Lead 5 of 5')
    expect(modal()).toHaveTextContent('Cold')
    expect(next).toBeDisabled()
    await user.click(next)
    expect(modal()).toHaveTextContent('Lead 5 of 5')

    await user.keyboard('{ArrowLeft}')
    expect(modal()).toHaveTextContent('Lead 4 of 5')
    await user.keyboard('{ArrowRight}')
    expect(modal()).toHaveTextContent('Lead 5 of 5')
  })

  it('folds: breakdown and journey closed, signals and notes open; each toggles', async () => {
    const { user } = renderAt('/dashboard?leads')
    expect(fold('ICP fit breakdown')).not.toHaveAttribute('open')
    expect(fold('How we got here')).not.toHaveAttribute('open')
    expect(fold('Where we picked up signals')).toHaveAttribute('open')
    expect(fold('Pre-call notes')).toHaveAttribute('open')
    expect(fold('Where we picked up signals')).toHaveTextContent('Financing')
    expect(fold('Where we picked up signals')).toHaveTextContent('Asked specifically about EMI options')

    await user.click(within(fold('ICP fit breakdown')).getByText('ICP fit breakdown'))
    expect(fold('ICP fit breakdown')).toHaveAttribute('open')
    expect(fold('ICP fit breakdown')).toHaveTextContent('Need match72%')

    await user.click(within(fold('Where we picked up signals')).getByText('Where we picked up signals'))
    expect(fold('Where we picked up signals')).not.toHaveAttribute('open')
  })

  it('toggles the quote switch per lead', async () => {
    const { user } = renderAt('/dashboard?leads')
    const quote = within(modal()).getByRole('switch', { name: 'Quote to be given to customer' })
    expect(quote).toHaveAttribute('aria-checked', 'true')
    await user.click(quote)
    expect(quote).toHaveAttribute('aria-checked', 'false')
    await user.click(within(modal()).getByRole('button', { name: 'Next lead' }))
    expect(within(modal()).getByRole('switch')).toHaveAttribute('aria-checked', 'false') // Kavitha: no quote yet
  })

  it('Call closes the modal and dials the lead', async () => {
    const { user } = renderAt('/dashboard?leads=faizan-a')
    await user.click(within(modal()).getByRole('button', { name: 'Call Faizan A.' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(phone.device.connect).toHaveBeenCalledWith({ leadId: 'faizan-a' })
    expect(screen.getByRole('region', { name: 'Call' })).toHaveTextContent('Faizan A.')
  })

  it('closing removes ?leads from the URL', async () => {
    let search = ''
    function Spy() {
      search = useLocation().search
      return null
    }
    const { user } = renderAt('/dashboard?leads', <Spy />)
    await user.click(within(modal()).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(search).toBe('')
  })
})
