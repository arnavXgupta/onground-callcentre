import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callLog } from '../../src/calling/callLog'
import { pulseStore } from '../../src/pulse/store'
import { greeting, last7Labels } from '../../src/screens/dashboard/Dashboard'
import { mockMicrophone, mockServer, phone } from './fake-phone'
import { renderAt } from './render'

vi.mock('../../src/calling/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/calling/device')>()
  const { phone } = await import('./fake-phone')
  return { ...actual, createTwilioDevice: vi.fn(async () => phone.device) }
})

const hero = () => screen.getByRole('region', { name: 'Today at a glance' })
const card = (title: string) => screen.getByRole('heading', { name: title }).closest('section')!

beforeEach(() => {
  phone.reset()
  callLog.clear()
  pulseStore.reset()
  mockMicrophone(true)
})
afterEach(() => vi.useRealTimers())

describe('helpers', () => {
  it.each([
    [8, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
  ])('greeting at %i:00 → %s', (h, text) => expect(greeting(h)).toBe(text))

  it('labels the last six weekdays then Today', () => {
    expect(last7Labels(new Date(2026, 10, 9))).toEqual(['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Today'])
  })
})

describe('Dashboard', () => {
  it('greets the agent and shows the KPI strip', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { name: 'Arvind Rajan' })).toBeInTheDocument()
    expect(hero()).toHaveTextContent('The Sleep Company · Call Centre')
    const kpis = within(hero()).getAllByRole('listitem').map((li) => li.textContent)
    expect(kpis).toEqual(['76OG Score™▲13', '4m 12sAvg handle time▼8%', '94%CSAT today▲2pt', '2In queue● live'])
  })

  it('switching the period changes the numbers, not just a label', async () => {
    const { user } = renderAt('/dashboard')
    await user.selectOptions(within(hero()).getByRole('combobox', { name: 'Period' }), 'This week')
    expect(hero()).toHaveTextContent('4m 31s')
    expect(hero()).toHaveTextContent('91%CSAT this week')
    expect(card('My progress · this week')).toHaveTextContent('14Leads created')
    expect(card('My progress · this week')).toHaveTextContent('11Leads called')
  })

  it('the queue pill follows the softphone: Go online → On queue', async () => {
    mockServer()
    const { user } = renderAt('/dashboard')
    await user.click(within(hero()).getByRole('button', { name: 'Off queue · Go online' }))
    expect(hero()).toHaveTextContent('On queue')
  })

  it("who's waiting ticks live and links to the planner", () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    renderAt('/dashboard')
    const waiting = card('Who’s waiting')
    expect(within(waiting).getByLabelText('Waiting 4m 20s')).toBeInTheDocument()
    expect(within(waiting).getByLabelText('Waiting 1m 50s')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5_000))
    expect(within(waiting).getByLabelText('Waiting 4m 25s')).toBeInTheDocument()
    expect(within(waiting).getByRole('link', { name: 'Open planner →' })).toHaveAttribute('href', '/plan/outgoing')
  })

  it('shows earnings against the slab', () => {
    renderAt('/dashboard')
    const earnings = card('My earnings this month')
    expect(earnings).toHaveTextContent('₹5,200')
    expect(earnings).toHaveTextContent('₹1,700 from coached moves')
    expect(earnings).toHaveTextContent('₹800 to ₹6,000 slab')
    expect(within(earnings).getByRole('meter', { name: 'Earnings slab' })).toHaveAttribute('aria-valuenow', '85')
  })

  it('tasks come from open Pulse asks and open the right place', async () => {
    const { user } = renderAt('/dashboard')
    const tasks = card('My tasks')
    expect(within(tasks).getByLabelText('3 open')).toBeInTheDocument()
    const links = within(tasks).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['2 callbacks next 4:30pm', '2 hot leads untouched 24h', '1 outcome to log'])
    expect(links[0]).toHaveAttribute('href', '/pulse/callcentre-team')
    expect(links[2]).toHaveAttribute('href', '/pulse/avanibot')

    await user.click(links[1])
    expect(screen.getByRole('dialog', { name: 'Leads' })).toHaveTextContent('Lead 1 of 5')
  })

  it('a task answered in Pulse leaves the list; all answered → all caught up', () => {
    pulseStore.answer('callcentre-team', 'confirm-callback', 'Confirmed')
    const first = renderAt('/dashboard')
    expect(within(card('My tasks')).getByLabelText('2 open')).toBeInTheDocument()
    expect(card('My tasks')).not.toHaveTextContent('2 callbacks')
    first.unmount()

    pulseStore.answer('avanibot', 'hot-leads', 'Calling now')
    pulseStore.answer('avanibot', 'log-outcome', 'Converted')
    renderAt('/dashboard')
    expect(card('My tasks')).toHaveTextContent('All caught up')
  })

  it('counts lead calls made in the app towards Leads called', () => {
    callLog.add({ name: 'Ritu S.', leadId: 'ritu-s', number: '+91 98450 00001', direction: 'outgoing', at: Date.now(), durationSec: 60 })
    renderAt('/dashboard')
    expect(card('My progress · today')).toHaveTextContent('3Leads called▲3')
  })

  it('draws both 7-day charts (data readable as tables)', async () => {
    renderAt('/dashboard')
    const calls = await screen.findByRole('table', { name: 'Calls handled · last 7 days' }, { timeout: 10_000 })
    expect(within(calls).getAllByRole('cell').map((c) => c.textContent)).toEqual(['18', '22', '15', '26', '20', '12', '14'])
    expect(within(calls).getAllByRole('rowheader').at(-1)).toHaveTextContent('Today')
    const csat = screen.getByRole('table', { name: 'CSAT trend · last 7 days' })
    expect(within(csat).getAllByRole('cell').map((c) => c.textContent)).toEqual(['88%', '90%', '85%', '92%', '89%', '91%', '94%'])
  })
})
