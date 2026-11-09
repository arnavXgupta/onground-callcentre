import { vi } from 'vitest'
import type { DeviceError, PhoneCall, PhoneDevice } from '../../src/calling/device'

type Listener = (arg?: unknown) => void

/** Stand-in for a Twilio Call: records what the app does, lets the test play Twilio's events. */
export class FakeCall implements PhoneCall {
  private listeners = new Map<string, Listener[]>()
  constructor(public parameters: Record<string, string>) {}

  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
    return this
  }
  emit(event: string, arg?: unknown) {
    this.listeners.get(event)?.forEach((l) => l(arg))
  }

  accept = vi.fn(() => this.emit('accept'))
  reject = vi.fn()
  disconnect = vi.fn(() => this.emit('disconnect'))
  mute = vi.fn()
  sendDigits = vi.fn()
}

export class FakeDevice implements PhoneDevice {
  calls: FakeCall[] = []
  private incoming?: (call: PhoneCall) => void
  private error?: (e: DeviceError) => void

  register = vi.fn(async () => {})
  unregister = vi.fn(async () => {})
  connect = vi.fn(async (params: Record<string, string>): Promise<PhoneCall> => {
    const call = new FakeCall(params)
    this.calls.push(call)
    return call
  })
  destroy = vi.fn()
  onIncoming(listener: (call: PhoneCall) => void) {
    this.incoming = listener
  }
  onError(listener: (e: DeviceError) => void) {
    this.error = listener
  }

  /** A phone dials our Twilio number. */
  ringIn(from: string) {
    const call = new FakeCall({ From: from })
    this.incoming?.(call)
    return call
  }
  fail(e: DeviceError) {
    this.error?.(e)
  }
  get last() {
    return this.calls[this.calls.length - 1]
  }
}

/** One fake per test; the mocked createTwilioDevice hands out phone.device (or phone.createError). */
export const phone = {
  device: new FakeDevice(),
  createError: null as Error | null,
  reset() {
    this.device = new FakeDevice()
    this.createError = null
  },
}

export function mockMicrophone(allow = true) {
  const getUserMedia = vi.fn(async () => {
    if (!allow) throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
    return { getTracks: () => [{ stop: vi.fn() }] }
  })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  return getUserMedia
}
