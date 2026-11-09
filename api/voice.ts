import twilio from 'twilio'
import { MissingEnvError, requireEnv } from '../server/env.js'
import { publicUrl, readForm } from '../server/http.js'
import { endCall, isCallSid, queueHasCallers, rest, ringIntoRoom } from '../server/twilio.js'
import {
  afterQueue,
  agentRoom,
  calleeRoom,
  destinationFor,
  empty,
  enqueue,
  hold,
  pickup,
  REFUSED,
  sayAndHangUp,
} from '../server/voice.js'

const twiml = (body: string) => new Response(body, { headers: { 'content-type': 'text/xml' } })

/**
 * The one Twilio webhook: the TwiML App (browser calls), our number (phone calls) and every
 * callback those set up. Query-string branches first: callbacks can carry any From.
 */
export async function POST(request: Request): Promise<Response> {
  let env
  try {
    env = requireEnv(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'PUBLIC_BASE_URL', 'TWILIO_PHONE_NUMBER', 'LEAD_CALL_NUMBER'])
  } catch (e) {
    if (e instanceof MissingEnvError) return new Response(e.message, { status: 500 })
    throw e
  }

  const params = await readForm(request)
  const signature = request.headers.get('x-twilio-signature') ?? ''
  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, publicUrl(request, env.PUBLIC_BASE_URL), params)) {
    return new Response('Invalid Twilio signature', { status: 403 })
  }

  const q = new URL(request.url).searchParams
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, '')
  const client = rest(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

  // ── callbacks ─────────────────────────────────────────
  if (q.get('leg') === 'pstn') {
    // The customer's leg finished (answered and hung up, busy, no answer, failed): free the agent.
    const agent = q.get('agent')
    if (isCallSid(agent)) await endCall(client, agent)
    return twiml(empty())
  }
  if (q.get('leg') === 'room') {
    // Someone left the room or it ended: hang up both legs so nobody is left alone in it.
    if (params.StatusCallbackEvent === 'participant-leave' || params.StatusCallbackEvent === 'conference-end') {
      await Promise.all([q.get('agent'), q.get('pstn')].filter(isCallSid).map((sid) => endCall(client, sid)))
    }
    return twiml(empty())
  }
  if (q.has('wait')) return twiml(hold())
  if (q.has('left')) return twiml(afterQueue(params.QueueResult))

  // ── a call from the agent's browser ───────────────────
  if (params.From?.startsWith('client:')) {
    if (params.pickup) return twiml(pickup(await queueHasCallers(client, env.TWILIO_ACCOUNT_SID)))

    const dest = destinationFor(params, { LEAD_CALL_NUMBER: env.LEAD_CALL_NUMBER, DIAL_ALLOWLIST: process.env.DIAL_ALLOWLIST })
    if (!dest) return twiml(sayAndHangUp(REFUSED))
    try {
      const pstnSid = await ringIntoRoom(client, {
        to: dest,
        from: env.TWILIO_PHONE_NUMBER,
        twiml: calleeRoom(),
        statusCallback: `${base}/api/voice?leg=pstn&agent=${params.CallSid}`,
      })
      return twiml(agentRoom(base, params.CallSid, pstnSid))
    } catch (e) {
      console.error('[api/voice] could not ring', dest, (e as Error).message)
      return twiml(sayAndHangUp('Sorry, that call could not be placed right now.'))
    }
  }

  // ── a phone calling our number ────────────────────────
  return twiml(enqueue(base))
}
