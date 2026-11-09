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

  /** Twilio sets parameters.CallSid on the browser leg once it's answered, before 'accept'. */
  answer(callSid = 'CA' + 'a'.repeat(32)) {
    this.parameters.CallSid = callSid
    this.emit('accept')
  }

  accept = vi.fn(() => this.emit('accept'))
  reject = vi.fn()
  disconnect = vi.fn(() => this.emit('disconnect'))
  mute = vi.fn()
  sendDigits = vi.fn()
}

export class FakeDevice implements PhoneDevice {
  calls: FakeCall[] = []
  private error?: (e: DeviceError) => void

  connect = vi.fn(async (params: Record<string, string>): Promise<PhoneCall> => {
    const call = new FakeCall(params)
    this.calls.push(call)
    return call
  })
  destroy = vi.fn()
  onError(listener: (e: DeviceError) => void) {
    this.error = listener
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

/**
 * Stand-in for the server: /api/queue (who's waiting) and /api/room (has the callee joined).
 * Tests mutate `server.queue` / `server.connected` and advance the poll timers.
 */
export const server = {
  queue: [] as { callSid: string; from: string; waitedSec: number; position: number }[],
  connected: false,
  declined: [] as string[],
  reset() {
    this.queue = []
    this.connected = false
    this.declined = []
  },
}

export function mockServer() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith('/api/queue') && init?.method === 'POST') {
      server.declined.push(JSON.parse(String(init.body)).decline)
      return Response.json({ ok: true })
    }
    if (url.startsWith('/api/queue')) return Response.json({ callers: server.queue })
    if (url.startsWith('/api/room')) return Response.json({ connected: server.connected })
    return new Response('not mocked', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
