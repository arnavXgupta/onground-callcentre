import { describe, expect, it } from 'vitest'
import { DAILY_BRIEF, FALLBACK, reply } from '../../src/pulse/avanibot'

describe('AvaniBot', () => {
  it.each([
    ['what are my action items from Sunita', 'Approve your quote for Mukunda'],
    ['anything from priya?', 'Cover her 3pm slot'],
    ['RAJU', 'Nothing open'],
  ])('answers action items for a teammate: %s', (q, expected) => {
    expect(reply(q)).toContain(expected)
    expect(reply(q)).toMatch(/^Action items from /)
  })

  it.each(['Give me my daily brief', 'summary please', "what's on today"])('gives the daily brief: %s', (q) => {
    expect(reply(q)).toBe(DAILY_BRIEF)
  })

  it('falls back with a hint', () => {
    expect(reply('hello')).toBe(FALLBACK)
  })
})
