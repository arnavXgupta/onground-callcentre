import twilio from 'twilio'

/** Every browser registers as this one agent identity (single-agent demo). */
export const AGENT_IDENTITY = 'agent'

const MISSED = "Sorry we missed you. An agent from The Sleep Company will call you back shortly."
const REFUSED = 'This demo can only call approved numbers. Goodbye.'

/**
 * Normalise what someone typed on the dial pad to E.164. Bare 10-digit numbers are
 * treated as Indian mobiles; anything else needs its country code. Returns null if hopeless.
 */
export function toE164(raw: string | undefined): string | null {
  if (!raw) return null
  const hasPlus = raw.trim().startsWith('+')
  let digits = raw.replace(/\D/g, '')
  if (!hasPlus) {
    digits = digits.replace(/^0+/, '') // trunk "0" or international "00"
    if (digits.length === 10) digits = '91' + digits
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? '+' + digits : null
}

export interface VoiceEnv {
  TWILIO_PHONE_NUMBER: string
  LEAD_CALL_NUMBER: string
  /** Comma-separated numbers the dial pad may reach. */
  DIAL_ALLOWLIST?: string
}

/**
 * Decide what Twilio does with a call. Pure: params = signed form body, query = webhook URL query.
 * - Dial action callback (?dialed=1): apologise only if nobody picked up.
 * - From our browser (client:…): lead calls go to LEAD_CALL_NUMBER, dial-pad calls only to the allowlist.
 * - From a phone: ring the agent's browser.
 */
export function routeCall(params: Record<string, string>, query: URLSearchParams, env: VoiceEnv): string {
  const r = new twilio.twiml.VoiceResponse()

  if (query.has('dialed')) {
    if (['no-answer', 'busy', 'failed'].includes(params.DialCallStatus)) r.say(MISSED)
    r.hangup()
    return r.toString()
  }

  if (params.From?.startsWith('client:')) {
    const allowlist = (env.DIAL_ALLOWLIST ?? '').split(',').map(toE164).filter(Boolean)
    const to = toE164(params.To)
    const dest = params.leadId ? env.LEAD_CALL_NUMBER : to && allowlist.includes(to) ? to : null
    if (!dest) {
      r.say(REFUSED)
      r.hangup()
    } else {
      r.dial({ callerId: env.TWILIO_PHONE_NUMBER, answerOnBridge: true }).number(dest)
    }
    return r.toString()
  }

  r.dial({ action: '/api/voice?dialed=1', timeout: 20, answerOnBridge: true }).client(AGENT_IDENTITY)
  return r.toString()
}
