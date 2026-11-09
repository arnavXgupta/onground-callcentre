import twilio from 'twilio'
import { MissingEnvError, requireEnv } from '../server/env.js'
import { publicUrl, readForm } from '../server/http.js'
import { routeCall } from '../server/voice.js'

/** Twilio webhook: TwiML App (calls from the browser) and our number (calls from phones). */
export async function POST(request: Request): Promise<Response> {
  let env
  try {
    env = requireEnv(['TWILIO_AUTH_TOKEN', 'PUBLIC_BASE_URL', 'TWILIO_PHONE_NUMBER', 'LEAD_CALL_NUMBER'])
  } catch (e) {
    if (e instanceof MissingEnvError) return new Response(e.message, { status: 500 })
    throw e
  }

  const params = await readForm(request)
  const signature = request.headers.get('x-twilio-signature') ?? ''
  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, publicUrl(request, env.PUBLIC_BASE_URL), params)) {
    return new Response('Invalid Twilio signature', { status: 403 })
  }

  const twiml = routeCall(params, new URL(request.url).searchParams, { ...env, DIAL_ALLOWLIST: process.env.DIAL_ALLOWLIST })
  return new Response(twiml, { headers: { 'content-type': 'text/xml' } })
}
