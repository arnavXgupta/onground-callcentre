import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { phone } from './fake-phone'
import { renderAt } from './render'

vi.mock('../../src/calling/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/calling/device')>()
  const { phone } = await import('./fake-phone')
  return { ...actual, createTwilioDevice: vi.fn(async () => phone.device) }
})

const list = () => screen.getByRole('region', { name: 'Planned outgoing calls' })
/** The row heads, in display order (the only buttons with aria-expanded). */
const rowButtons = () => within(list()).getAllByRole('button').filter((b) => b.hasAttribute('aria-expanded'))
const names = () => within(list()).getAllByRole('listitem').map((li) => li.querySelector('.rowTitle')?.textContent)

beforeEach(() => phone.reset())

describe('Calls to make', () => {
  it('ranks leads by score, two per page, across three pages', async () => {
    const { user } = renderAt('/plan/outgoing')
    expect(screen.getByRole('heading', { name: 'Planner' })).toBeInTheDocument()
    expect(names()).toEqual(['Ritu S.', 'Mukunda'])
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(names()).toEqual(['Faizan A.', 'Kavitha R.'])
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(names()).toEqual(['Divya P.'])
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('shows the score and interest line on each row', () => {
    renderAt('/plan/outgoing')
    const ritu = within(list()).getAllByRole('listitem')[0]
    expect(ritu).toHaveTextContent('Interested: Smart Luxe Mattress · ₹13,390')
    expect(ritu).toHaveTextContent('96')
  })

  it('opens one lead at a time and shows the full picture', async () => {
    const { user } = renderAt('/plan/outgoing')
    const [ritu, mukunda] = rowButtons()
    await user.click(ritu)
    expect(ritu).toHaveAttribute('aria-expanded', 'true')
    const detail = document.getElementById(ritu.getAttribute('aria-controls')!)!
    expect(detail).toHaveTextContent('Visited RT Nagar store, tried the Smart Luxe in person → Called back after the store visit')
    expect(detail).toHaveTextContent('Smart Luxe Mattress')
    expect(detail).toHaveTextContent('Mattress Protector · ₹1,999')
    expect(detail).toHaveTextContent('she asked about the total cost')

    await user.click(mukunda)
    expect(ritu).toHaveAttribute('aria-expanded', 'false')
    expect(mukunda).toHaveAttribute('aria-expanded', 'true')

    await user.click(mukunda)
    expect(mukunda).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the open lead when the page changes', async () => {
    const { user } = renderAt('/plan/outgoing')
    await user.click(rowButtons()[0])
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(within(list()).queryAllByRole('button', { expanded: true })).toHaveLength(0)
  })

  it('Place call dials the lead (routed by leadId) and the dock shows the pitch', async () => {
    const { user } = renderAt('/plan/outgoing')
    await user.click(rowButtons()[0])
    await user.click(screen.getByRole('button', { name: 'Place call' }))
    expect(phone.device.connect).toHaveBeenCalledWith({ leadId: 'ritu-s' })

    const dock = screen.getByRole('region', { name: 'Call' })
    expect(dock).toHaveTextContent('Ritu S.')
    expect(dock).toHaveTextContent('Smart Luxe Mattress · ₹13,390')
    expect(screen.getByRole('button', { name: 'On a call' })).toBeDisabled()

    act(() => phone.device.last.emit('accept'))
    expect(dock).toHaveTextContent('On call')
  })
})
