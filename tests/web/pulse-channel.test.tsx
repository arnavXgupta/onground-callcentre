import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { pulseStore } from '../../src/pulse/store'
import { renderAt } from './render'

const log = (title: string) => screen.getByRole('log', { name: `${title} messages` })
const composer = (title: string) => screen.getByRole('textbox', { name: `Message ${title}` })
const pinned = () => screen.queryByRole('region', { name: 'Needs your input' })

beforeEach(() => pulseStore.reset())

describe('channel thread', () => {
  it('shows the conversation: others left, mine right, with times and the @mention', () => {
    renderAt('/pulse/callcentre-team')
    expect(screen.getByRole('heading', { name: '#callcentre-team' })).toBeInTheDocument()
    const messages = log('#callcentre-team').querySelectorAll('.msg')
    expect(messages).toHaveLength(5)
    expect([...messages].map((m) => m.hasAttribute('data-mine'))).toEqual([false, false, false, true, false])
    expect(messages[0]).toHaveTextContent('Sunita Rao2:05pm')
    expect(messages[0]).toHaveTextContent('Stakeholders: @You (Arvind R.), whole call centre shift')
    expect(within(log('#callcentre-team')).getByText('@You (Arvind R.)').tagName).toBe('MARK')
    expect(messages[3]).toHaveTextContent('You2:10pm')
  })

  it('back goes to Pulse home', async () => {
    const { user } = renderAt('/pulse/callcentre-team')
    await user.click(screen.getByRole('link', { name: 'Back to Pulse' }))
    expect(screen.getByRole('heading', { name: 'Pulse' })).toBeInTheDocument()
  })

  it('sends with the button and with Enter; Shift+Enter adds a line; blank is never sent', async () => {
    const { user } = renderAt('/pulse/callcentre-team')
    const send = screen.getByRole('button', { name: 'Send message' })
    expect(send).toBeDisabled()

    await user.type(composer('#callcentre-team'), '   ')
    expect(send).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(log('#callcentre-team').querySelectorAll('.msg')).toHaveLength(5)

    await user.clear(composer('#callcentre-team'))
    await user.type(composer('#callcentre-team'), 'Greeting script from now on')
    await user.click(send)
    const last = () => [...log('#callcentre-team').querySelectorAll('.msg')].at(-1)!
    expect(last()).toHaveAttribute('data-mine')
    expect(last()).toHaveTextContent('Greeting script from now on')
    expect(composer('#callcentre-team')).toHaveValue('')

    await user.type(composer('#callcentre-team'), 'line one{Shift>}{Enter}{/Shift}line two{Enter}')
    expect(last().querySelector('.bubble')?.textContent).toBe('line one\nline two')
    expect(log('#callcentre-team').querySelectorAll('.msg')).toHaveLength(7)
  })

  it('keeps sent messages after leaving and coming back (and in localStorage)', async () => {
    const first = renderAt('/pulse/priya-krishnan')
    await first.user.type(composer('Priya Krishnan'), 'Yes, I can cover 3pm{Enter}')
    first.unmount()

    renderAt('/pulse/priya-krishnan')
    expect(log('Priya Krishnan')).toHaveTextContent('Yes, I can cover 3pm')
    expect(localStorage.getItem('og.pulse.v1')).toContain('Yes, I can cover 3pm')
  })

  it('AvaniBot answers a question', async () => {
    const { user } = renderAt('/pulse/avanibot')
    await user.type(composer('AvaniBot'), 'what are my action items from Sunita{Enter}')
    expect(await within(log('AvaniBot')).findByText(/Approve your quote for Mukunda/)).toBeInTheDocument()
  })
})

describe('needs your input', () => {
  it('answering with an option removes the card and posts the answer as done', async () => {
    const { user } = renderAt('/pulse/callcentre-team')
    expect(pinned()).toHaveTextContent('Confirm the 4:30pm callback')
    expect(pinned()).toHaveTextContent('Priya Iyer · likely billing dispute')

    await user.click(within(pinned()!).getByRole('button', { name: 'Confirmed' }))
    expect(pinned()).not.toBeInTheDocument()
    const last = [...log('#callcentre-team').querySelectorAll('.msg')].at(-1)!
    expect(last).toHaveTextContent('Confirmed')
    expect(last).toHaveTextContent('Task done · removed from your tasks')
  })

  it('a typed answer works; an empty one asks for text', async () => {
    const { user } = renderAt('/pulse/avanibot')
    const card = () => within(pinned()!).getByRole('group', { name: "Log this morning's call outcome" })
    expect(within(pinned()!).getByRole('button', { name: /Needs your input/ })).toHaveTextContent('2')

    await user.click(within(card()).getByRole('button', { name: 'Send' }))
    expect(card()).toHaveTextContent('Type an answer first')

    await user.type(within(card()).getByRole('textbox'), 'Converted to Ortho GRID{Enter}')
    expect(within(pinned()!).queryByRole('group', { name: "Log this morning's call outcome" })).not.toBeInTheDocument()
    expect(within(pinned()!).getByRole('button', { name: /Needs your input/ })).toHaveTextContent('1')
    expect(log('AvaniBot')).toHaveTextContent('Converted to Ortho GRID')
  })

  it('collapses to a one-line summary', async () => {
    const { user } = renderAt('/pulse/avanibot')
    await user.click(within(pinned()!).getByRole('button', { name: /Needs your input/ }))
    expect(pinned()).toHaveTextContent('Call now or reassign the 2 hot leads +1 more')
    expect(within(pinned()!).queryByRole('group')).not.toBeInTheDocument()
  })
})

describe('cards and agents', () => {
  it('the quotation card opens the Leads modal at Mukunda', async () => {
    const { user } = renderAt('/pulse/quotation-tickets')
    expect(log('#quotation-tickets')).toHaveTextContent('₹58,000')
    await user.click(screen.getByRole('link', { name: 'View lead' }))
    const modal = screen.getByRole('dialog', { name: 'Leads' })
    expect(modal).toHaveTextContent('Lead 1 of 5')
    expect(modal).toHaveTextContent('Mukunda')
  })

  it('an agent channel opens with the agent’s read on you', () => {
    renderAt('/pulse/sop-agent')
    const card = screen.getByRole('article', { name: 'SOP Agent: your read' })
    expect(within(card).getByRole('meter', { name: 'SOP adherence' })).toHaveAttribute('aria-valuenow', '81')
    expect(card).toHaveTextContent('target 85% · ▲2 this week')
    expect(card).toHaveTextContent('Greet within 10 seconds')
    expect(card).toHaveTextContent('Call at 11:40am')
  })

  it('an unknown channel goes back to Pulse home', () => {
    renderAt('/pulse/nope')
    expect(screen.getByRole('heading', { name: 'Pulse' })).toBeInTheDocument()
  })
})
