import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { pulseStore } from '../../src/pulse/store'
import { renderAt } from './render'

const section = (name: string) => screen.getByRole('region', { name })
const rowsIn = (name: string) => within(section(name)).getAllByRole('link')
const search = () => screen.getByRole('searchbox', { name: 'Ask AvaniBot or search Pulse' })

beforeEach(() => pulseStore.reset())

describe('Pulse home', () => {
  it('shows AvaniBot, role and task agents, general, kudos, channels and DMs', () => {
    renderAt('/pulse')
    expect(screen.getByRole('heading', { name: 'Pulse' })).toBeInTheDocument()
    expect(section('AvaniBot')).toHaveTextContent('Always on')

    expect(rowsIn('Role agents').map((a) => a.getAttribute('href'))).toEqual(['/pulse/callcentre-agent'])
    const tasks = rowsIn('Task agents')
    expect(tasks).toHaveLength(4)
    expect(tasks[0]).toHaveTextContent('#cross-sell-agent')
    expect(tasks[0]).toHaveTextContent('Your attach rate · 5 members')
    expect(tasks[0]).toHaveTextContent('24% ▲2')
    expect(tasks[1]).toHaveTextContent('Your SOP adherence')

    expect(rowsIn('General')[0]).toHaveTextContent('customer-discussions')
    expect(screen.getByRole('button', { name: /Kudos/ })).toHaveTextContent('3 new')
    expect(screen.getByRole('button', { name: /Kudos/ })).toHaveTextContent('12All-time')

    expect(rowsIn('Channels')).toHaveLength(6)
    expect(rowsIn('Channels')[0]).toHaveAccessibleName(/callcentre-team/)
    expect(rowsIn('Direct messages')).toHaveLength(3)
    expect(rowsIn('Direct messages')[0]).toHaveTextContent('Sunita RaoMGR')
  })

  it('folds the custom agents away', async () => {
    const { user } = renderAt('/pulse')
    const fold = screen.getByText('Custom agents').closest('details')!
    expect(fold).toHaveAttribute('open')
    await user.click(screen.getByText('Custom agents'))
    expect(fold).not.toHaveAttribute('open')
  })

  it('search filters channels, people, agents and message text live', async () => {
    const { user } = renderAt('/pulse')
    await user.type(search(), 'shipment')
    expect(rowsIn('Channels')).toHaveLength(1)
    expect(rowsIn('Channels')[0]).toHaveTextContent('manage-shipment')
    expect(screen.queryByRole('region', { name: 'Direct messages' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AvaniBot' })).not.toBeInTheDocument()

    await user.clear(search())
    await user.type(search(), '3pm slot') // only inside Priya's DM text
    expect(rowsIn('Direct messages')).toHaveLength(1)
    expect(rowsIn('Direct messages')[0]).toHaveTextContent('Priya Krishnan')
  })

  it('no match says so, and Enter asks AvaniBot', async () => {
    const { user } = renderAt('/pulse')
    await user.type(search(), 'zzz')
    expect(screen.getByText(/Nothing matches “zzz”/)).toBeInTheDocument()
    await user.keyboard('{Enter}')
    const log = screen.getByRole('log', { name: 'AvaniBot messages' })
    expect(log).toHaveTextContent('zzz')
    expect(await within(log).findByText(/I can pull your daily brief/)).toBeInTheDocument()
  })

  it('Daily Brief opens AvaniBot and posts the brief', async () => {
    const { user } = renderAt('/pulse')
    await user.click(screen.getByRole('button', { name: 'Daily Brief' }))
    const log = screen.getByRole('log', { name: 'AvaniBot messages' })
    expect(log).toHaveTextContent('Give me my daily brief')
    expect(within(log).getByText('AvaniBot is typing…')).toBeInTheDocument()
    expect(await within(log).findByText(/Here's today's brief/)).toBeInTheDocument()
  })

  it('Ask a question opens AvaniBot with the composer focused', async () => {
    const { user } = renderAt('/pulse')
    await user.click(screen.getByRole('button', { name: 'Ask a question' }))
    expect(screen.getByRole('textbox', { name: 'Message AvaniBot' })).toHaveFocus()
  })

  it('Kudos opens the list', async () => {
    const { user } = renderAt('/pulse')
    await user.click(screen.getByRole('button', { name: /Kudos/ }))
    const dialog = screen.getByRole('dialog', { name: 'Kudos' })
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
    expect(dialog).toHaveTextContent('closed that warranty objection beautifully')
  })

  it('clears a channel’s unread badge once it has been opened', async () => {
    const { user } = renderAt('/pulse')
    const allStores = () => rowsIn('Channels').find((a) => a.getAttribute('href') === '/pulse/all-stores')!
    expect(within(allStores()).getByLabelText('4 new')).toBeInTheDocument()
    await user.click(allStores())
    await user.click(screen.getByRole('link', { name: 'Back to Pulse' }))
    expect(within(allStores()).queryByLabelText('4 new')).not.toBeInTheDocument()
  })
})
