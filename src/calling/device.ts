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

/**
 * The browser only ever calls out (decisions D18): to a customer via the conference room, or to
 * pick up a queued caller. It is never dialled, so there's no registration or incoming handler.
 */
export interface PhoneDevice {
  /** Params reach /api/voice as form fields: { leadId } | { To } | { pickup: '1' }. */
  connect(params: Record<string, string>): Promise<PhoneCall>
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
  const device = new Device(token, { closeProtection: 'A call is in progress. Leaving will hang up.' })
  device.on('tokenWillExpire', async () => device.updateToken(await fetchToken()))

  return {
    connect: (params) => device.connect({ params }),
    onError: (listener) => device.on('error', listener),
    destroy: () => device.destroy(),
  }
}

/** Twilio error codes that mean the browser blocked the microphone. */
export const MIC_BLOCKED_CODES = new Set([31401, 31208])
