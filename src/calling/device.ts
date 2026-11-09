// The only file that knows about Twilio in the browser. Everything else talks to PhoneDevice,
// which tests replace with a fake (vi.mock of this module).

/** The slice of a Twilio Call we use. Twilio's Call satisfies it structurally. */
export interface PhoneCall {
  readonly parameters: Record<string, string>
  on(event: 'ringing' | 'accept' | 'disconnect' | 'cancel' | 'error', listener: (arg?: unknown) => void): unknown
  accept(): void
  reject(): void
  disconnect(): void
  mute(shouldMute: boolean): void
  sendDigits(digits: string): void
}

export interface DeviceError {
  code?: number
  message: string
}

export interface PhoneDevice {
  register(): Promise<void>
  unregister(): Promise<void>
  /** Outbound call. Params reach /api/voice as form fields: { leadId } or { To }. */
  connect(params: Record<string, string>): Promise<PhoneCall>
  onIncoming(listener: (call: PhoneCall) => void): void
  onError(listener: (error: DeviceError) => void): void
  destroy(): void
}

async function fetchToken(): Promise<string> {
  const res = await fetch('/api/token')
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.token) throw new Error(body.error ?? `Couldn't get a calling token (HTTP ${res.status})`)
  return body.token
}

export async function createTwilioDevice(): Promise<PhoneDevice> {
  // Loaded on first use so the SDK stays out of the initial bundle.
  const [{ Device }, token] = await Promise.all([import('@twilio/voice-sdk'), fetchToken()])
  const device = new Device(token, {
    allowIncomingWhileBusy: true, // otherwise a busy agent's inbound call vanishes with no event
    closeProtection: 'A call is in progress. Leaving will hang up.',
  })
  device.on('tokenWillExpire', async () => device.updateToken(await fetchToken()))

  return {
    register: () => device.register(),
    unregister: () => device.unregister(),
    connect: (params) => device.connect({ params }),
    onIncoming: (listener) => device.on('incoming', listener),
    onError: (listener) => device.on('error', listener),
    destroy: () => device.destroy(),
  }
}

/** Twilio error codes that mean the browser blocked the microphone. */
export const MIC_BLOCKED_CODES = new Set([31401, 31208])
