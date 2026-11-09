// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as queueGET, POST as queuePOST } from '../../api/queue'
import { GET as roomGET } from '../../api/room'
import * as rest from '../../server/twilio'
import { useTestEnv } from './env'

vi.mock('../../server/twilio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/twilio')>()
  return {
    ...actual,
    rest: vi.fn(() => ({})),
    waitingCallers: vi.fn(async () => [{ callSid: 'CA' + '1'.repeat(32), from: '+919811112222', waitedSec: 4, position: 1 }]),
    redirect: vi.fn(async () => {}),
    agentConnected: vi.fn(async () => true),
  }
})

const WAITING = 'CA' + '1'.repeat(32)
const json = (body: unknown) =>
  new Request('http://localhost/api/queue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('/api/queue', () => {
  useTestEnv()
  beforeEach(() => vi.clearAllMocks())

  it('GET lists who is waiting', async () => {
    const res = await queueGET()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ callers: [{ callSid: WAITING, from: '+919811112222', waitedSec: 4, position: 1 }] })
  })

  it('POST declines a waiting caller with an apology', async () => {
    const res = await queuePOST(json({ decline: WAITING }))
    expect(res.status).toBe(200)
    expect(rest.redirect).toHaveBeenCalledWith({}, WAITING, expect.stringContaining('agents are busy'))
  })

  it('POST refuses to touch a call that is not waiting in the queue', async () => {
    const res = await queuePOST(json({ decline: 'CA' + '9'.repeat(32) }))
    expect(res.status).toBe(404)
    expect(rest.redirect).not.toHaveBeenCalled()
  })

  it.each([{}, { decline: 'nope' }, { decline: 42 }])('POST rejects a bad body %j', async (body) => {
    expect((await queuePOST(json(body))).status).toBe(400)
  })

  it('reports a Twilio failure as 502, not a crash', async () => {
    vi.mocked(rest.waitingCallers).mockRejectedValueOnce(new Error('boom'))
    expect((await queueGET()).status).toBe(502)
  })
})

describe('/api/room', () => {
  useTestEnv()
  beforeEach(() => vi.clearAllMocks())

  it('says whether the callee has joined the agent’s room', async () => {
    const res = await roomGET(new Request(`http://localhost/api/room?agent=${WAITING}`))
    expect(await res.json()).toEqual({ connected: true })
    expect(rest.agentConnected).toHaveBeenCalledWith({}, WAITING)
  })

  it('rejects a missing or malformed agent CallSid', async () => {
    expect((await roomGET(new Request('http://localhost/api/room'))).status).toBe(400)
    expect((await roomGET(new Request('http://localhost/api/room?agent=../../x'))).status).toBe(400)
  })
})
