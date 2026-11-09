// @vitest-environment node
import twilio from 'twilio'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../../api/voice'
import * as rest from '../../server/twilio'
import { afterQueue, agentRoom, calleeRoom, destinationFor, enqueue, hold, pickup, toE164 } from '../../server/voice'
import { TEST_ENV, useTestEnv } from './env'

vi.mock('../../server/twilio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/twilio')>()
  return {
    ...actual,
    rest: vi.fn(() => ({})),
    endCall: vi.fn(async () => {}),
    ringIntoRoom: vi.fn(async () => 'CA' + 'b'.repeat(32)),
    queueHasCallers: vi.fn(async () => true),
  }
})

const BASE = TEST_ENV.PUBLIC_BASE_URL
const AGENT = 'CA' + 'a'.repeat(32)
const PSTN = 'CA' + 'b'.repeat(32)

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

describe('destinationFor (the trust boundary)', () => {
  it('sends every lead call to the demo phone, whatever number the browser shows', () => {
    expect(destinationFor({ leadId: 'ritu-s', To: '+15555550123' }, TEST_ENV)).toBe(TEST_ENV.LEAD_CALL_NUMBER)
  })

  it('dials an allowlisted dial-pad number, normalising what was typed', () => {
    expect(destinationFor({ To: '098000 00003' }, TEST_ENV)).toBe('+919800000003')
    expect(destinationFor({ To: '+919800000002' }, TEST_ENV)).toBe('+919800000002')
  })

  it.each<Record<string, string>>([{ To: '+15555550123' }, { To: 'garbage' }, {}])('refuses %j', (params) => {
    expect(destinationFor(params, TEST_ENV)).toBeNull()
  })

  it('refuses everything when no allowlist is configured', () => {
    expect(destinationFor({ To: '+919800000002' }, { ...TEST_ENV, DIAL_ALLOWLIST: undefined })).toBeNull()
  })
})

describe('TwiML (trial-compatible: conference + queue)', () => {
  it('the agent waits silently in the room, and the room reports leaves and its end', () => {
    const xml = agentRoom(BASE, AGENT, PSTN)
    expect(xml).toContain('<Conference')
    expect(xml).toContain('endConferenceOnExit="true"')
    expect(xml).toContain('waitUrl=""')
    expect(xml).toContain('beep="false"')
    expect(xml).toContain(`statusCallback="${BASE}/api/voice?leg=room&amp;agent=${AGENT}&amp;pstn=${PSTN}"`)
    expect(xml).toContain('statusCallbackEvent="leave end"')
    expect(xml).not.toContain('<Number')
    expect(xml).not.toContain('<Client')
  })

  it('the callee joins the same room', () => {
    expect(calleeRoom()).toMatch(/<Dial><Conference [^>]*endConferenceOnExit="true"[^>]*>agent-room<\/Conference><\/Dial>/)
  })

  it('a phone calling in is greeted and queued, with absolute wait/action URLs', () => {
    const xml = enqueue(BASE)
    expect(xml).toContain('<Say>Thanks for calling The Sleep Company')
    expect(xml).toContain(`waitUrl="${BASE}/api/voice?wait=1"`)
    expect(xml).toContain(`action="${BASE}/api/voice?left=1"`)
    expect(xml).toContain('>callers</Enqueue>')
  })

  it('holds ~30s in one document (one trial hop), then leaves the queue', () => {
    expect(hold()).toMatch(/<Say>Please hold.*<\/Say><Pause length="25"\/><Leave\/>/)
  })

  it.each([
    ['leave', true],
    ['bridged', false],
    ['hangup', false],
    ['redirected', false],
    [undefined, false],
  ])('after the queue (%s): apology only when nobody picked up', (result, apologises) => {
    const xml = afterQueue(result)
    expect(xml.includes('call you back')).toBe(apologises)
  })

  it('pickup bridges to the front of the queue, or says nobody is waiting', () => {
    expect(pickup(true)).toContain('<Dial><Queue>callers</Queue></Dial>')
    expect(pickup(false)).toContain('no one waiting')
    expect(pickup(false)).toContain('<Hangup/>')
  })
})

describe('POST /api/voice', () => {
  useTestEnv()
  beforeEach(() => vi.clearAllMocks())

  /** Simulates Twilio: signs the PUBLIC url, while the request arrives on a different origin (ngrok / proxy). */
  function twilioRequest(params: Record<string, string>, path = '/api/voice', signature?: string) {
    const sig = signature ?? twilio.getExpectedTwilioSignature(TEST_ENV.TWILIO_AUTH_TOKEN, BASE + path, params)
    return new Request('http://localhost:5173' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig },
      body: new URLSearchParams(params).toString(),
    })
  }
  const text = async (r: Response) => (expect(r.status).toBe(200), r.text())

  it('a lead call rings the demo phone into the room and puts the agent in it', async () => {
    const xml = await text(await POST(twilioRequest({ From: 'client:agent', CallSid: AGENT, leadId: 'mukunda' })))
    expect(rest.ringIntoRoom).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        to: TEST_ENV.LEAD_CALL_NUMBER,
        from: TEST_ENV.TWILIO_PHONE_NUMBER,
        twiml: expect.stringContaining('<Conference'),
        statusCallback: `${BASE}/api/voice?leg=pstn&agent=${AGENT}`,
      }),
    )
    expect(xml).toContain(`agent=${AGENT}&amp;pstn=${PSTN}`)
  })

  it('a non-allowlisted dial-pad number is refused without ringing anyone', async () => {
    const xml = await text(await POST(twilioRequest({ From: 'client:agent', CallSid: AGENT, To: '+15555550123' })))
    expect(xml).toContain('approved numbers')
    expect(rest.ringIntoRoom).not.toHaveBeenCalled()
  })

  it('if Twilio refuses to ring (e.g. unverified number on trial) the agent hears why', async () => {
    vi.mocked(rest.ringIntoRoom).mockRejectedValueOnce(new Error('21219 unverified'))
    const xml = await text(await POST(twilioRequest({ From: 'client:agent', CallSid: AGENT, leadId: 'mukunda' })))
    expect(xml).toContain('could not be placed')
  })

  it('pickup bridges to the queue only when someone is waiting', async () => {
    expect(await text(await POST(twilioRequest({ From: 'client:agent', CallSid: AGENT, pickup: '1' })))).toContain('<Queue>callers</Queue>')
    vi.mocked(rest.queueHasCallers).mockResolvedValueOnce(false)
    expect(await text(await POST(twilioRequest({ From: 'client:agent', CallSid: AGENT, pickup: '1' })))).toContain('no one waiting')
  })

  it('a phone calling our number is queued', async () => {
    const xml = await text(await POST(twilioRequest({ From: '+919811112222', To: TEST_ENV.TWILIO_PHONE_NUMBER })))
    expect(xml).toContain('</Enqueue>')
  })

  it('the callee leg finishing (busy / no-answer / hung up) frees the agent', async () => {
    const path = `/api/voice?leg=pstn&agent=${AGENT}`
    await text(await POST(twilioRequest({ CallStatus: 'no-answer', From: TEST_ENV.TWILIO_PHONE_NUMBER }, path)))
    expect(rest.endCall).toHaveBeenCalledWith({}, AGENT)
  })

  it.each(['participant-leave', 'conference-end'])('room %s hangs up both legs', async (event) => {
    const path = `/api/voice?leg=room&agent=${AGENT}&pstn=${PSTN}`
    await text(await POST(twilioRequest({ StatusCallbackEvent: event }, path)))
    expect(rest.endCall).toHaveBeenCalledWith({}, AGENT)
    expect(rest.endCall).toHaveBeenCalledWith({}, PSTN)
  })

  it('room join/start events change nothing', async () => {
    const path = `/api/voice?leg=room&agent=${AGENT}&pstn=${PSTN}`
    await text(await POST(twilioRequest({ StatusCallbackEvent: 'participant-join' }, path)))
    expect(rest.endCall).not.toHaveBeenCalled()
  })

  it('ignores SIDs that are not call SIDs', async () => {
    await text(await POST(twilioRequest({ StatusCallbackEvent: 'conference-end' }, '/api/voice?leg=room&agent=nope&pstn=../x')))
    expect(rest.endCall).not.toHaveBeenCalled()
  })

  it('the queue wait and leave callbacks (query string covered by the signature)', async () => {
    expect(await text(await POST(twilioRequest({ QueueTime: '5' }, '/api/voice?wait=1')))).toContain('<Leave/>')
    expect(await text(await POST(twilioRequest({ QueueResult: 'leave' }, '/api/voice?left=1')))).toContain('call you back')
  })

  it('rejects a forged signature', async () => {
    const res = await POST(twilioRequest({ From: 'client:agent', leadId: 'mukunda' }, '/api/voice', 'forged'))
    expect(res.status).toBe(403)
    expect(rest.ringIntoRoom).not.toHaveBeenCalled()
  })

  it('rejects a request with no signature', async () => {
    const req = new Request('http://localhost:5173/api/voice', { method: 'POST', body: 'From=client%3Aagent' })
    expect((await POST(req)).status).toBe(403)
  })

  it('rejects a callback whose query was tampered with after signing', async () => {
    const params = { StatusCallbackEvent: 'conference-end' }
    const sig = twilio.getExpectedTwilioSignature(TEST_ENV.TWILIO_AUTH_TOKEN, `${BASE}/api/voice?leg=room&agent=${AGENT}&pstn=${PSTN}`, params)
    const other = 'CA' + 'c'.repeat(32)
    const req = new Request(`http://localhost:5173/api/voice?leg=room&agent=${other}&pstn=${PSTN}`, {
      method: 'POST',
      headers: { 'x-twilio-signature': sig },
      body: new URLSearchParams(params).toString(),
    })
    expect((await POST(req)).status).toBe(403)
    expect(rest.endCall).not.toHaveBeenCalled()
  })

  it('fails loudly, naming the variable, when env is missing', async () => {
    delete process.env.LEAD_CALL_NUMBER
    const res = await POST(twilioRequest({ From: 'client:agent' }))
    expect(res.status).toBe(500)
    expect(await res.text()).toContain('LEAD_CALL_NUMBER')
  })
})
