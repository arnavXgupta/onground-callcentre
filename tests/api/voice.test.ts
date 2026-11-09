// @vitest-environment node
import twilio from 'twilio'
import { describe, expect, it } from 'vitest'
import { POST } from '../../api/voice'
import { routeCall, toE164 } from '../../server/voice'
import { TEST_ENV, useTestEnv } from './env'

const route = (params: Record<string, string>, query = '') => routeCall(params, new URLSearchParams(query), TEST_ENV)
const FROM_APP = { From: 'client:agent' }

describe('toE164', () => {
  it.each([
    ['+91 98450 61245', '+919845061245'],
    ['098450 61245', '+919845061245'],
    ['9845061245', '+919845061245'],
    ['+1 (415) 555-0100', '+14155550100'],
    ['0044 7700 900123', '+447700900123'],
  ])('%s → %s', (raw, e164) => expect(toE164(raw)).toBe(e164))

  it.each(['', '123', 'abc', '+0123456789'])('rejects %j', (raw) => expect(toE164(raw)).toBeNull())
  it('rejects undefined', () => expect(toE164(undefined)).toBeNull())
})

describe('routeCall: outbound from the browser', () => {
  it('sends every lead call to the demo phone, whatever number the browser shows', () => {
    const xml = route({ ...FROM_APP, leadId: 'ritu-s', To: '+15555550123' })
    expect(xml).toContain('<Number>+919800000001</Number>')
    expect(xml).toContain('callerId="+14155550100"')
    expect(xml).toContain('answerOnBridge="true"')
    expect(xml).not.toContain('+15555550123')
  })

  it('dials an allowlisted dial-pad number, normalising what was typed', () => {
    expect(route({ ...FROM_APP, To: '098000 00003' })).toContain('<Number>+919800000003</Number>')
    expect(route({ ...FROM_APP, To: '+919800000002' })).toContain('<Number>+919800000002</Number>')
  })

  it.each<Record<string, string>>([{ To: '+15555550123' }, { To: 'garbage' }, {}])('refuses a non-allowlisted target %j', (extra) => {
    const xml = route({ ...FROM_APP, ...extra })
    expect(xml).not.toContain('<Dial')
    expect(xml).toContain('approved numbers')
    expect(xml).toContain('<Hangup/>')
  })

  it('refuses everything when no allowlist is configured', () => {
    const xml = routeCall({ ...FROM_APP, To: '+919800000002' }, new URLSearchParams(), { ...TEST_ENV, DIAL_ALLOWLIST: undefined })
    expect(xml).not.toContain('<Dial')
  })
})

describe('routeCall: inbound from a phone', () => {
  it('rings the agent in the browser, with a callback for the outcome', () => {
    const xml = route({ From: '+919811112222', To: TEST_ENV.TWILIO_PHONE_NUMBER })
    expect(xml).toContain('<Client>agent</Client>')
    expect(xml).toContain('action="/api/voice?dialed=1"')
    expect(xml).toContain('timeout="20"')
  })

  it('hangs up quietly after a call that was answered', () => {
    const xml = route({ From: '+919811112222', DialCallStatus: 'completed' }, 'dialed=1')
    expect(xml).not.toContain('<Say')
    expect(xml).toContain('<Hangup/>')
  })

  it.each(['no-answer', 'busy', 'failed'])('apologises when nobody answered (%s)', (status) => {
    const xml = route({ From: '+919811112222', DialCallStatus: status }, 'dialed=1')
    expect(xml).toContain('<Say>')
    expect(xml).toContain('call you back')
    expect(xml).toContain('<Hangup/>')
  })
})

describe('POST /api/voice', () => {
  useTestEnv()

  /** Simulates Twilio: signs the PUBLIC url, while the request arrives on a different origin (ngrok / proxy). */
  function twilioRequest(params: Record<string, string>, path = '/api/voice', signature?: string) {
    const sig =
      signature ?? twilio.getExpectedTwilioSignature(TEST_ENV.TWILIO_AUTH_TOKEN, TEST_ENV.PUBLIC_BASE_URL + path, params)
    return new Request('http://localhost:5173' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig },
      body: new URLSearchParams(params).toString(),
    })
  }

  it('answers a correctly signed request with TwiML', async () => {
    const res = await POST(twilioRequest({ ...FROM_APP, leadId: 'mukunda' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/xml')
    expect(await res.text()).toContain('<Number>+919800000001</Number>')
  })

  it('validates the signature over the query string too (Dial action callback)', async () => {
    const res = await POST(twilioRequest({ From: '+919811112222', DialCallStatus: 'no-answer' }, '/api/voice?dialed=1'))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('call you back')
  })

  it('rejects a forged signature', async () => {
    const res = await POST(twilioRequest({ ...FROM_APP, To: '+919800000002' }, '/api/voice', 'forged'))
    expect(res.status).toBe(403)
  })

  it('rejects a request with no signature', async () => {
    const req = new Request('http://localhost:5173/api/voice', { method: 'POST', body: 'From=client%3Aagent' })
    expect((await POST(req)).status).toBe(403)
  })

  it('rejects a body tampered with after signing', async () => {
    const params = { ...FROM_APP, To: '+919800000002' }
    const sig = twilio.getExpectedTwilioSignature(TEST_ENV.TWILIO_AUTH_TOKEN, TEST_ENV.PUBLIC_BASE_URL + '/api/voice', params)
    const req = new Request('http://localhost:5173/api/voice', {
      method: 'POST',
      headers: { 'x-twilio-signature': sig },
      body: new URLSearchParams({ ...params, To: '+15555550123' }).toString(),
    })
    expect((await POST(req)).status).toBe(403)
  })

  it('fails loudly, naming the variable, when env is missing', async () => {
    delete process.env.LEAD_CALL_NUMBER
    const res = await POST(twilioRequest(FROM_APP))
    expect(res.status).toBe(500)
    expect(await res.text()).toContain('LEAD_CALL_NUMBER')
  })
})
