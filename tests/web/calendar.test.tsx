import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderAt } from './render'

// Events are dated relative to today: pin the date (Date only; timers stay real for userEvent).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 9, 9, 0)) // Mon 9 Nov 2026
})
afterEach(() => vi.useRealTimers())

const month = () => screen.getByRole('heading', { level: 2, name: /\w+ \d{4}/ })
const day = (label: RegExp) => screen.getByRole('button', { name: label })
const list = () => screen.getByRole('heading', { name: /^(Upcoming|\w{3} \d+ \w{3})$/ }).closest('section')!
const titles = () => within(list()).queryAllByRole('listitem').map((li) => li.querySelector('.what strong')?.textContent)

describe('Calendar', () => {
  it('opens on this month with today marked and dots on event days', () => {
    renderAt('/calendar')
    expect(month()).toHaveTextContent('November 2026')
    expect(day(/^Monday, 9 November 2026, today, 1 event$/)).toBeInTheDocument()
    const withEvents = screen.getAllByRole('button', { name: /event/ }).map((b) => b.textContent)
    expect(withEvents).toEqual(['9', '10', '12', '14'])
  })

  it('lists the month’s events in time order under Upcoming', () => {
    renderAt('/calendar')
    expect(titles()).toEqual(['Callback · Priya Iyer', 'SOP coaching session', 'Warranty pitch refresher', 'Weekly team huddle'])
    expect(list()).toHaveTextContent('4:30 PM')
  })

  it('switches months, wrapping the year', async () => {
    const { user } = renderAt('/calendar')
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(month()).toHaveTextContent('December 2026')
    expect(list()).toHaveTextContent('Nothing scheduled this month.')
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(month()).toHaveTextContent('January 2027')
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(month()).toHaveTextContent('October 2026')
  })

  it('selecting a day filters the list; selecting it again clears', async () => {
    const { user } = renderAt('/calendar')
    await user.click(day(/^Thursday, 12 November 2026/))
    expect(day(/^Thursday, 12 November 2026/)).toHaveAttribute('aria-pressed', 'true')
    expect(titles()).toEqual(['Warranty pitch refresher'])
    expect(screen.getByRole('heading', { name: 'Thu 12 Nov' })).toBeInTheDocument()

    await user.click(day(/^Thursday, 12 November 2026/))
    expect(titles()).toHaveLength(4)
  })

  it('an empty day says so', async () => {
    const { user } = renderAt('/calendar')
    await user.click(day(/^Wednesday, 11 November 2026/))
    expect(list()).toHaveTextContent('Nothing on Wed 11 Nov.')
  })

  it('Today jumps back and selects today', async () => {
    const { user } = renderAt('/calendar')
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(month()).toHaveTextContent('November 2026')
    expect(day(/today/)).toHaveAttribute('aria-pressed', 'true')
    expect(titles()).toEqual(['Callback · Priya Iyer'])
  })
})
