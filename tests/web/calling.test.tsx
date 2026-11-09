import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callLog } from '../../src/calling/callLog'
import { QUEUE_POLL_MS, ROOM_POLL_MS } from '../../src/calling/CallProvider'
import { mockMicrophone, mockServer, phone, server } from './fake-phone'
import { renderAt } from './render'

vi.mock('../../src/calling/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/calling/device')>()
  const { phone } = await import('./fake-phone')
  return {
    ...actual,
    createTwilioDevice: vi.fn(async () => {
      if (phone.createError) throw phone.createError
      return phone.device
    }),
  }
})

const dock = () => screen.getByRole('region', { name: 'Call' })
const wrapUp = () => screen.getByRole('dialog')
/** Let the pollers (setInterval only is faked) run, and their fetches resolve. */
const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

async function dialFromPad(user: ReturnType<typeof renderAt>['user'], number = '98000 00002') {
  await user.type(screen.getByRole('textbox', { name: 'Phone number', hidden: true }), number)
  await user.click(screen.getByRole('button', { name: 'Call', hidden: true }))
}

const caller = (callSid: string, from: string) => ({ callSid, from, waitedSec: 3, position: 1 })

beforeEach(() => {
  phone.reset()
  server.reset()
  callLog.clear()
  mockMicrophone(true)
  mockServer()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('outbound call (browser and phone meet in one room)', () => {
  it('dial → ringing until the callee joins → on call → mute → keypad → end → wrap-up → logged', async () => {
    const { user } = renderAt('/plan/recent')
    await dialFromPad(user)
    expect(phone.device.connect).toHaveBeenCalledWith({ To: '98000 00002' })
    expect(dock()).toHaveTextContent('Calling…')

    act(() => phone.device.last.answer()) // the agent's leg is in the room
    expect(dock()).toHaveTextContent('Ringing…')
    await tick(ROOM_POLL_MS)
    expect(dock()).toHaveTextContent('Ringing…') // phone still ringing

    server.connected = true // callee picked up and joined
    await tick(ROOM_POLL_MS)
    expect(dock()).toHaveTextContent('On call')
    expect(fetch).toHaveBeenCalledWith(`/api/room?agent=CA${'a'.repeat(32)}`, undefined)
    expect(within(dock()).getByLabelText('Call duration')).toHaveTextContent('00:00')

    const mute = within(dock()).getByRole('button', { name: 'Mute' })
    await user.click(mute)
    expect(phone.device.last.mute).toHaveBeenCalledWith(true)
    expect(mute).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(dock()).getByRole('button', { name: 'Keypad' }))
    await user.click(within(dock()).getByRole('button', { name: 'Key 5' }))
    await user.click(within(dock()).getByRole('button', { name: 'Key #' }))
    expect(phone.device.last.sendDigits.mock.calls).toEqual([['5'], ['#']])
    expect(within(dock()).getByLabelText('Digits sent')).toHaveTextContent('5#')

    await user.click(within(dock()).getByRole('button', { name: 'End call' }))
    expect(phone.device.last.disconnect).toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()

    expect(wrapUp()).toHaveAccessibleName('Call with 98000 00002')
    const save = within(wrapUp()).getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    await user.click(within(wrapUp()).getByRole('button', { name: 'Interested' }))
    await user.clear(within(wrapUp()).getByLabelText('Summary'))
    await user.type(within(wrapUp()).getByLabelText('Summary'), 'Wants delivery this week')
    await user.click(save)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(callLog.getSnapshot()).toEqual([
      expect.objectContaining({ name: '98000 00002', direction: 'outgoing', outcome: 'Interested', summary: 'Wants delivery this week' }),
    ])
  })

  it('stops polling the room once connected', async () => {
    const { user } = renderAt('/plan/recent')
    await dialFromPad(user)
    act(() => phone.device.last.answer())
    server.connected = true
    await tick(ROOM_POLL_MS)
    const roomCalls = () => vi.mocked(fetch).mock.calls.filter(([u]) => String(u).startsWith('/api/room')).length
    const before = roomCalls()
    await tick(ROOM_POLL_MS * 3)
    expect(roomCalls()).toBe(before)
  })

  it('a callee who never joins ends as "Not connected", with No answer preselected', async () => {
    const { user } = renderAt('/plan/recent')
    await dialFromPad(user)
    act(() => phone.device.last.answer())
    await tick(ROOM_POLL_MS * 2)
    act(() => phone.device.last.emit('disconnect')) // server ended the room: busy / no answer

    expect(within(wrapUp()).getByText('Not connected · just now')).toBeInTheDocument()
    expect(within(wrapUp()).getByRole('button', { name: 'No answer' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(wrapUp()).getByRole('button', { name: 'Save' }))
    expect(callLog.getSnapshot()[0]).toMatchObject({ direction: 'outgoing', durationSec: 0, outcome: 'No answer' })
  })

  it('hanging up while still dialling cancels the call once Twilio hands it over', async () => {
    let release!: () => void
    phone.device.connect.mockImplementationOnce(async (params) => {
      await new Promise<void>((r) => (release = r))
      const { FakeCall } = await import('./fake-phone')
      const call = new FakeCall(params)
      phone.device.calls.push(call)
      return call
    })
    const { user } = renderAt('/plan/recent')
    await dialFromPad(user)
    await user.click(within(dock()).getByRole('button', { name: 'End call' }))
    expect(wrapUp()).toBeInTheDocument()

    await act(async () => release())
    expect(phone.device.last.disconnect).toHaveBeenCalled()

    await user.click(within(wrapUp()).getByRole('button', { name: 'Skip' }))
    expect(callLog.getSnapshot()[0]).toMatchObject({ direction: 'outgoing', durationSec: 0 })
    expect(callLog.getSnapshot()[0].outcome).toBeUndefined()
  })

  it('a failure before connecting shows why and leaves nothing behind', async () => {
    phone.createError = new Error('Server is missing env: TWILIO_API_KEY_SID')
    const { user } = renderAt('/plan/recent')
    await dialFromPad(user)
    expect(screen.getByRole('alert')).toHaveTextContent('TWILIO_API_KEY_SID')
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
    expect(callLog.getSnapshot()).toHaveLength(0)
  })

  it('blocks a second call while one is live', async () => {
    const { user } = renderAt('/plan/recent')
    await dialFromPad(user)
    act(() => phone.device.last.answer())
    expect(screen.getByRole('button', { name: 'Dial pad' })).toBeDisabled()

    await dialFromPad(user, '98000 00003')
    expect(phone.device.connect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent('Finish the current call first.')
  })
})

describe('going online', () => {
  it('asks for the mic, readies the phone and starts watching the queue; offline stops it', async () => {
    const getUserMedia = mockMicrophone(true)
    const { user } = renderAt('/plan/recent')
    await user.click(screen.getByRole('button', { name: 'Go online' }))
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(screen.getByRole('button', { name: 'Online' })).toBeInTheDocument()
    await tick(0) // the poller starts in an effect
    expect(fetch).toHaveBeenCalledWith('/api/queue', undefined)

    await user.click(screen.getByRole('button', { name: 'Online' }))
    expect(screen.getByRole('button', { name: 'Go online' })).toBeInTheDocument()
    const polls = vi.mocked(fetch).mock.calls.length
    await tick(QUEUE_POLL_MS * 3)
    expect(vi.mocked(fetch).mock.calls.length).toBe(polls)
  })

  it('shows Mic blocked and stays offline when the mic is denied', async () => {
    mockMicrophone(false)
    const { user } = renderAt('/plan/recent')
    await user.click(screen.getByRole('button', { name: 'Go online' }))
    expect(screen.getByRole('button', { name: 'Mic blocked' })).toHaveAttribute('title', expect.stringContaining('address bar'))
    expect(fetch).not.toHaveBeenCalledWith('/api/queue', undefined)
  })
})

describe('inbound call (picked up from the queue)', () => {
  async function online() {
    const r = renderAt('/plan/recent')
    await r.user.click(screen.getByRole('button', { name: 'Go online' }))
    return r
  }

  it('a queued caller rings, named from the CRM; accept picks them up; their hang-up → wrap-up', async () => {
    const { user } = await online()
    server.queue = [caller('CA1', '+919876543210')]
    await tick(QUEUE_POLL_MS)
    expect(dock()).toHaveTextContent('Incoming call')
    expect(dock()).toHaveTextContent('Mukunda')

    await user.click(within(dock()).getByRole('button', { name: 'Accept' }))
    expect(phone.device.connect).toHaveBeenCalledWith({ pickup: '1' })
    server.queue = [] // dequeued by the pickup: must not count as missed
    await tick(QUEUE_POLL_MS)
    act(() => phone.device.last.answer())
    expect(dock()).toHaveTextContent('On call')

    act(() => phone.device.last.emit('disconnect'))
    await user.click(within(wrapUp()).getByRole('button', { name: 'Resolved' }))
    await user.click(within(wrapUp()).getByRole('button', { name: 'Save' }))
    expect(callLog.getSnapshot()[0]).toMatchObject({ name: 'Mukunda', leadId: 'mukunda', direction: 'incoming', outcome: 'Resolved' })
  })

  it('a caller who leaves the queue before being answered is logged as missed', async () => {
    await online()
    server.queue = [caller('CA2', '+15550001111')]
    await tick(QUEUE_POLL_MS)
    expect(dock()).toHaveTextContent('+15550001111')

    server.queue = []
    await tick(QUEUE_POLL_MS)
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
    expect(callLog.getSnapshot()[0]).toMatchObject({ name: '+15550001111', direction: 'missed' })
  })

  it('declining tells the server, logs a missed call and does not ring for the same caller again', async () => {
    const { user } = await online()
    server.queue = [caller('CA3', '+15550001111')]
    await tick(QUEUE_POLL_MS)
    await user.click(within(dock()).getByRole('button', { name: 'Decline' }))
    expect(server.declined).toEqual(['CA3'])
    expect(callLog.getSnapshot()[0]).toMatchObject({ direction: 'missed' })

    await tick(QUEUE_POLL_MS) // still listed for a moment while Twilio redirects them
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
  })

  it('while the agent is on a call, new callers wait in the queue and ring once the agent is free', async () => {
    const { user } = await online()
    await dialFromPad(user)
    act(() => phone.device.last.answer())
    server.connected = true
    await tick(ROOM_POLL_MS)

    server.queue = [caller('CA4', '+15550002222')]
    await tick(QUEUE_POLL_MS)
    expect(dock()).toHaveTextContent('On call')
    expect(dock()).toHaveTextContent('98000 00002')
    expect(callLog.getSnapshot()).toHaveLength(0) // not rejected, not missed

    act(() => phone.device.last.emit('disconnect'))
    await user.click(within(wrapUp()).getByRole('button', { name: 'Skip' }))
    await tick(QUEUE_POLL_MS)
    expect(dock()).toHaveTextContent('Incoming call')
    expect(dock()).toHaveTextContent('+15550002222')
  })
})
