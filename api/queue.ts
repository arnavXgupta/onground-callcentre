import { MissingEnvError, requireEnv } from '../server/env.js'
import { isCallSid, redirect, rest, waitingCallers } from '../server/twilio.js'
import { DECLINED, sayAndHangUp } from '../server/voice.js'

function client() {
  const env = requireEnv(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'])
  return { env, client: rest(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN) }
}

const fail = (e: unknown) =>
  e instanceof MissingEnvError ? Response.json({ error: e.message }, { status: 500 }) : Response.json({ error: 'Twilio request failed' }, { status: 502 })

/** Who's waiting in the inbound queue (polled by the agent's browser while online). */
export async function GET(): Promise<Response> {
  try {
    const { env, client: c } = client()
    return Response.json({ callers: await waitingCallers(c, env.TWILIO_ACCOUNT_SID) }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return fail(e)
  }
}

/** Decline a waiting caller: they hear an apology and are hung up. Only works on calls that are in the queue. */
export async function POST(request: Request): Promise<Response> {
  const { decline } = await request.json().catch(() => ({}) as { decline?: string })
  if (!isCallSid(decline)) return Response.json({ error: 'decline must be a CallSid' }, { status: 400 })
  try {
    const { env, client: c } = client()
    const waiting = await waitingCallers(c, env.TWILIO_ACCOUNT_SID)
    if (!waiting.some((w) => w.callSid === decline)) return Response.json({ error: 'Not waiting in the queue' }, { status: 404 })
    await redirect(c, decline, sayAndHangUp(DECLINED))
    return Response.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}
