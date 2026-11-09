// Pure call routing: what Twilio should do, as TwiML strings. No network here (see server/twilio.ts).
//
// Trial-compatible (decisions D18): no <Dial><Number>/<Dial><Client>.
//   outbound: the agent's browser and the customer's phone meet in one <Conference>
//   inbound:  callers wait in an <Enqueue> queue; the agent picks up with <Dial><Queue>
import twilio from 'twilio'

/** Every browser registers as this one agent identity (single-agent demo). */
export const AGENT_IDENTITY = 'agent'
/** Inbound queue. On trial Twilio namespaces it ("callers-AC…"); TwiML keeps the bare name. */
export const QUEUE = 'callers'
/** On trial the conference name is replaced by the account SID: one room per account. */
const ROOM = 'agent-room'

export const MISSED = "Sorry we missed you. An agent from The Sleep Company will call you back shortly."
export const REFUSED = 'This demo can only call approved numbers. Goodbye.'
export const DECLINED = "Sorry, all our agents are busy right now. We'll call you back shortly."
export const GREETING = 'Thanks for calling The Sleep Company. Connecting you to an agent.'
export const HOLD = 'Please hold. An agent will be with you shortly.'

type VoiceResponse = InstanceType<typeof twilio.twiml.VoiceResponse>
const xml = (build: (r: VoiceResponse) => void) => {
  const r = new twilio.twiml.VoiceResponse()
  build(r)
  return r.toString()
}

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

export interface RoutingEnv {
  LEAD_CALL_NUMBER: string
  /** Comma-separated numbers the dial pad may reach. */
  DIAL_ALLOWLIST?: string
}

/**
 * Where a call from the browser may go. The public demo never dials a number the browser chose
 * freely: lead calls ring the demo phone, dial-pad calls only reach the allowlist.
 */
export function destinationFor(params: Record<string, string>, env: RoutingEnv): string | null {
  if (params.leadId) return env.LEAD_CALL_NUMBER
  const to = toE164(params.To)
  const allowlist = (env.DIAL_ALLOWLIST ?? '').split(',').map(toE164).filter(Boolean)
  return to && allowlist.includes(to) ? to : null
}

/** Say something, then hang up. */
export const sayAndHangUp = (text: string) =>
  xml((r) => {
    r.say(text)
    r.hangup()
  })

/** Twilio ignores the body of status callbacks; reply with an empty document. */
export const empty = () => xml(() => {})

/**
 * The agent's browser leg: wait (silently) in the room. The agent is always first in, so its
 * statusCallback is the room's: when anyone leaves or the room ends, the server hangs up both legs.
 */
export const agentRoom = (base: string, agentSid: string, pstnSid: string) =>
  xml((r) =>
    r.dial().conference(
      {
        beep: 'false',
        waitUrl: '',
        endConferenceOnExit: true,
        statusCallback: `${base}/api/voice?leg=room&agent=${agentSid}&pstn=${pstnSid}`,
        statusCallbackEvent: ['leave', 'end'],
      },
      ROOM,
    ),
  )

/** The customer's phone leg, rung by the server, joins the same room. */
export const calleeRoom = () => xml((r) => r.dial().conference({ beep: 'false', endConferenceOnExit: true }, ROOM))

/** A phone calling our number waits in the queue. */
export const enqueue = (base: string) =>
  xml((r) => {
    r.say(GREETING)
    r.enqueue({ waitUrl: `${base}/api/voice?wait=1`, action: `${base}/api/voice?left=1` }, QUEUE)
  })

/** One hold document per caller (each waitUrl fetch is a trial "hop"): about 30s, then leave the queue. */
export const hold = () =>
  xml((r) => {
    r.say(HOLD)
    r.pause({ length: 25 })
    r.leave()
  })

/** Enqueue's action: apologise only when nobody picked up (`leave`); bridged/hangup/redirected end quietly. */
export const afterQueue = (queueResult?: string) => (queueResult === 'leave' ? sayAndHangUp(MISSED) : empty())

/** The agent picks up the caller at the front of the queue, unless it has just emptied. */
export const pickup = (someoneWaiting: boolean) =>
  someoneWaiting ? xml((r) => r.dial().queue(QUEUE)) : sayAndHangUp('There is no one waiting right now.')
