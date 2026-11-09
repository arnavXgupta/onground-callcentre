import { MissingEnvError, requireEnv } from '../server/env.js'
import { agentConnected, isCallSid, rest } from '../server/twilio.js'

/** Has the customer picked up and joined the agent's room? Polled while the call shows "Ringing". */
export async function GET(request: Request): Promise<Response> {
  const agent = new URL(request.url).searchParams.get('agent')
  if (!isCallSid(agent)) return Response.json({ error: 'agent must be a CallSid' }, { status: 400 })
  try {
    const env = requireEnv(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'])
    const connected = await agentConnected(rest(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN), agent)
    return Response.json({ connected }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    if (e instanceof MissingEnvError) return Response.json({ error: e.message }, { status: 500 })
    return Response.json({ error: 'Twilio request failed' }, { status: 502 })
  }
}
