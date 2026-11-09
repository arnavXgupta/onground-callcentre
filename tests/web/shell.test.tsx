import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAt } from './render'

const nav = () => within(screen.getByRole('navigation', { name: 'Main' }))

describe('sidebar nav', () => {
  it('links every screen', () => {
    renderAt('/dashboard')
    const hrefs = Object.fromEntries(nav().getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]))
    expect(hrefs).toEqual({
      Dashboard: '/dashboard',
      Plan: '/plan',
      'Calls to make': '/plan/outgoing',
      Incoming: '/plan/incoming',
      Recent: '/plan/recent',
      'Practise a call': '/plan/practise',
      Calendar: '/calendar',
      Pulse: '/pulse',
    })
  })

  it('marks the current page and keeps Plan active on a plan sub-route', () => {
    renderAt('/plan/incoming')
    expect(nav().getByRole('link', { name: 'Incoming' })).toHaveAttribute('aria-current', 'page')
    expect(nav().getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'true')
    expect(nav().getByRole('link', { name: 'Recent' })).not.toHaveAttribute('aria-current')
    expect(nav().getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('keeps Pulse active inside a channel', () => {
    renderAt('/pulse/callcentre-team')
    expect(nav().getByRole('link', { name: 'Pulse' })).toHaveAttribute('aria-current', 'page')
  })

  it('swaps the screen when a link is clicked', async () => {
    const { user } = renderAt('/calendar')
    await user.click(nav().getByRole('link', { name: 'Recent' }))
    expect(screen.getByRole('heading', { name: 'Recent calls' })).toBeInTheDocument()
    await user.click(nav().getByRole('link', { name: 'Plan' }))
    expect(screen.getByRole('heading', { name: 'Planned outgoing calls' })).toBeInTheDocument()
  })
})

describe('top bar', () => {
  it.each([
    ['/dashboard', 'Arvind Rajan'],
    ['/plan/recent', 'Plan'],
    ['/calendar', 'Calendar'],
    ['/pulse/all-stores', 'Pulse'],
  ])('shows the section title on %s', (path, title) => {
    renderAt(path)
    expect(screen.getByRole('banner')).toHaveTextContent(title)
  })

  it('shows OG score and rank', () => {
    renderAt('/dashboard')
    const banner = within(screen.getByRole('banner'))
    expect(banner.getByText('76')).toBeInTheDocument()
    expect(banner.getByText('#3')).toBeInTheDocument()
  })

  it('clears the unread dot once notifications are opened', async () => {
    const { user } = renderAt('/dashboard')
    expect(screen.getByTestId('unread-dot')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Notifications, unread' }))
    expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('lists notifications and their CTAs navigate', async () => {
    const { user } = renderAt('/dashboard')
    expect(screen.getAllByRole('listitem', { hidden: true }).filter((li) => li.closest('[popover]'))).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Open incoming', hidden: true }))
    expect(screen.getByRole('heading', { name: 'Missed calls' })).toBeInTheDocument()
  })

  it('account menu shows who is signed in', () => {
    renderAt('/calendar')
    const menu = within(document.getElementById('user-popover')!)
    expect(menu.getByText('Arvind Rajan')).toBeInTheDocument()
    expect(menu.getByText('Call Centre Agent')).toBeInTheDocument()
    expect(menu.getByText('The Sleep Company · Koramangala')).toBeInTheDocument()
  })
})
