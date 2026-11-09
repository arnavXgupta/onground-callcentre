import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callLog } from '../../src/calling/callLog'
import { phone, mockMicrophone } from './fake-phone'
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

async function dialFromPad(user: ReturnType<typeof renderAt>['user'], number = '98000 00002') {
  await user.type(screen.getByRole('textbox', { name: 'Phone number', hidden: true }), number)
  await user.click(screen.getByRole('button', { name: 'Call', hidden: true }))
}

beforeEach(() => {
  phone.reset()
  callLog.clear()
  mockMicrophone(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('outbound call', () => {
  it('walks dial → ringing → on call → mute → keypad → end → wrap-up → saved to the log', async () => {
    const { user } = renderAt('/dashboard')
    await dialFromPad(user)

    expect(phone.device.connect).toHaveBeenCalledWith({ To: '98000 00002' })
    expect(dock()).toHaveTextContent('Calling…')

    act(() => phone.device.last.emit('ringing'))
    expect(dock()).toHaveTextContent('Ringing…')

    act(() => phone.device.last.emit('accept'))
    expect(dock()).toHaveTextContent('On call')
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
      expect.objectContaining({
        name: '98000 00002',
        direction: 'outgoing',
        outcome: 'Interested',
        summary: 'Wants delivery this week',
      }),
    ])
  })

  it('ticks the timer while connected', async () => {
    const { user } = renderAt('/dashboard')
    await dialFromPad(user)
    vi.useFakeTimers({ shouldAdvanceTime: false })
    act(() => phone.device.last.emit('accept'))
    act(() => vi.advanceTimersByTime(65_000))
    expect(within(dock()).getByLabelText('Call duration')).toHaveTextContent('01:05')
  })

  it('a call nobody answers lands in wrap-up as "Not connected", with No answer preselected', async () => {
    const { user } = renderAt('/dashboard')
    await dialFromPad(user)
    act(() => phone.device.last.emit('ringing'))
    act(() => phone.device.last.emit('disconnect'))

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
    const { user } = renderAt('/dashboard')
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
    phone.createError = new Error("Server is missing env: TWILIO_API_KEY_SID")
    const { user } = renderAt('/dashboard')
    await dialFromPad(user)
    expect(screen.getByRole('alert')).toHaveTextContent('TWILIO_API_KEY_SID')
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
    expect(callLog.getSnapshot()).toHaveLength(0)
  })

  it('blocks a second call while one is live', async () => {
    const { user } = renderAt('/dashboard')
    await dialFromPad(user)
    act(() => phone.device.last.emit('accept'))
    expect(screen.getByRole('button', { name: 'Dial pad' })).toBeDisabled()

    await dialFromPad(user, '98000 00003')
    expect(phone.device.connect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent('Finish the current call first.')
  })
})

describe('going online', () => {
  it('asks for the mic, registers, and shows Online; clicking again goes offline', async () => {
    const getUserMedia = mockMicrophone(true)
    const { user } = renderAt('/dashboard')
    await user.click(screen.getByRole('button', { name: 'Go online' }))
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(phone.device.register).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Online' }))
    expect(phone.device.unregister).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Go online' })).toBeInTheDocument()
  })

  it('shows Mic blocked and does not register when the mic is denied', async () => {
    mockMicrophone(false)
    const { user } = renderAt('/dashboard')
    await user.click(screen.getByRole('button', { name: 'Go online' }))
    expect(screen.getByRole('button', { name: 'Mic blocked' })).toHaveAttribute('title', expect.stringContaining('address bar'))
    expect(phone.device.register).not.toHaveBeenCalled()
  })
})

describe('inbound call', () => {
  async function online() {
    const r = renderAt('/dashboard')
    await r.user.click(screen.getByRole('button', { name: 'Go online' }))
    return r
  }

  it('rings with the caller named from the CRM, accept → on call → caller hangs up → wrap-up', async () => {
    const { user } = await online()
    let call!: ReturnType<typeof phone.device.ringIn>
    act(() => {
      call = phone.device.ringIn('+919876543210')
    })
    expect(dock()).toHaveTextContent('Incoming call')
    expect(dock()).toHaveTextContent('Mukunda')

    await user.click(within(dock()).getByRole('button', { name: 'Accept' }))
    expect(call.accept).toHaveBeenCalled()
    expect(dock()).toHaveTextContent('On call')

    act(() => call.emit('disconnect'))
    await user.click(within(wrapUp()).getByRole('button', { name: 'Resolved' }))
    await user.click(within(wrapUp()).getByRole('button', { name: 'Save' }))
    expect(callLog.getSnapshot()[0]).toMatchObject({ name: 'Mukunda', leadId: 'mukunda', direction: 'incoming', outcome: 'Resolved' })
  })

  it('logs a missed call when the caller hangs up before it is answered', async () => {
    await online()
    let call!: ReturnType<typeof phone.device.ringIn>
    act(() => {
      call = phone.device.ringIn('+15550001111')
    })
    expect(dock()).toHaveTextContent('+15550001111')
    act(() => call.emit('cancel'))
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
    expect(callLog.getSnapshot()[0]).toMatchObject({ name: '+15550001111', direction: 'missed' })
  })

  it('declining rejects the call and logs it as missed', async () => {
    const { user } = await online()
    let call!: ReturnType<typeof phone.device.ringIn>
    act(() => {
      call = phone.device.ringIn('+15550001111')
    })
    await user.click(within(dock()).getByRole('button', { name: 'Decline' }))
    expect(call.reject).toHaveBeenCalled()
    expect(callLog.getSnapshot()[0]).toMatchObject({ direction: 'missed' })
  })

  it('rejects a second caller while busy, logs them as missed, and keeps the live call', async () => {
    const { user } = await online()
    await dialFromPad(user)
    act(() => phone.device.last.emit('accept'))

    let second!: ReturnType<typeof phone.device.ringIn>
    act(() => {
      second = phone.device.ringIn('+15550002222')
    })
    expect(second.reject).toHaveBeenCalled()
    expect(callLog.getSnapshot()[0]).toMatchObject({ name: '+15550002222', direction: 'missed' })
    expect(dock()).toHaveTextContent('On call')
    expect(dock()).toHaveTextContent('98000 00002')
  })
})
