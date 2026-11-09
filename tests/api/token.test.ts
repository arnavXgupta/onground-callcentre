// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GET } from '../../api/token'
import { TEST_ENV, useTestEnv } from './env'

function claims(jwt: string) {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
}

describe('GET /api/token', () => {
  useTestEnv()

  it('issues a voice token for the agent: outbound via our TwiML app, inbound allowed', async () => {
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const { token, identity } = await res.json()
    expect(identity).toBe('agent')

    const c = claims(token)
    expect(c.iss).toBe(TEST_ENV.TWILIO_API_KEY_SID)
    expect(c.sub).toBe(TEST_ENV.TWILIO_ACCOUNT_SID)
    expect(c.grants.identity).toBe('agent')
    expect(c.grants.voice.outgoing.application_sid).toBe(TEST_ENV.TWILIO_TWIML_APP_SID)
    expect(c.grants.voice.incoming.allow).toBe(true)
    expect(c.exp - c.iat).toBe(3600)
  })

  it('fails loudly, naming the variable, when env is missing', async () => {
    delete process.env.TWILIO_TWIML_APP_SID
    const res = GET()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('TWILIO_TWIML_APP_SID')
  })
})
