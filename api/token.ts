import twilio from 'twilio'
import { MissingEnvError, requireEnv } from '../server/env.js'
import { AGENT_IDENTITY } from '../server/voice.js'

/** Access token for the browser softphone. Calls always go out via the TwiML App (/api/voice); the browser is never dialled (inbound uses the queue). */
export function GET(): Response {
  let env
  try {
    env = requireEnv(['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_TWIML_APP_SID'])
  } catch (e) {
    if (e instanceof MissingEnvError) return Response.json({ error: e.message }, { status: 500 })
    throw e
  }

  const { AccessToken } = twilio.jwt
  const token = new AccessToken(env.TWILIO_ACCOUNT_SID, env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, {
    identity: AGENT_IDENTITY,
    ttl: 3600,
  })
  token.addGrant(new AccessToken.VoiceGrant({ outgoingApplicationSid: env.TWILIO_TWIML_APP_SID, incomingAllow: false }))

  return Response.json({ token: token.toJwt(), identity: AGENT_IDENTITY }, { headers: { 'cache-control': 'no-store' } })
}
