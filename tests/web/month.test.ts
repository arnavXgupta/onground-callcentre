import { describe, expect, it } from 'vitest'
import { datedEvents, monthGrid, sameDay, shiftMonth } from '../../src/screens/calendar/month'

const rows = (cells: unknown[]) => Math.ceil(cells.length / 7)

describe('monthGrid', () => {
  it('Nov 2026 starts on Sunday: no blanks, 30 days, 5 rows', () => {
    const g = monthGrid(2026, 10)
    expect(g[0]?.getDate()).toBe(1)
    expect(g.filter(Boolean)).toHaveLength(30)
    expect(rows(g)).toBe(5)
  })

  it('Feb 2026 fills exactly 4 rows', () => {
    const g = monthGrid(2026, 1)
    expect(g).toHaveLength(28)
    expect(rows(g)).toBe(4)
  })

  it('Aug 2026 starts on Saturday: 6 blanks, 6 rows', () => {
    const g = monthGrid(2026, 7)
    expect(g.slice(0, 6)).toEqual(Array(6).fill(null))
    expect(g[6]?.getDate()).toBe(1)
    expect(rows(g)).toBe(6)
  })
})

describe('shiftMonth', () => {
  it.each([
    [{ year: 2026, month: 10 }, 1, { year: 2026, month: 11 }],
    [{ year: 2026, month: 11 }, 1, { year: 2027, month: 0 }],
    [{ year: 2026, month: 0 }, -1, { year: 2025, month: 11 }],
  ])('%o %+d → %o', (from, delta, to) => expect(shiftMonth(from, delta)).toEqual(to))
})

describe('datedEvents', () => {
  it('dates the sample events relative to today, in time order', () => {
    const events = datedEvents(new Date(2026, 10, 9, 9, 0))
    expect(events.map((e) => [e.title, e.at.getDate(), e.at.getHours()])).toEqual([
      ['Callback · Priya Iyer', 9, 16],
      ['SOP coaching session', 10, 11],
      ['Warranty pitch refresher', 12, 14],
      ['Weekly team huddle', 14, 10],
    ])
  })

  it('crosses month ends', () => {
    const events = datedEvents(new Date(2026, 10, 28))
    expect(events.at(-1)?.at).toEqual(new Date(2026, 11, 3, 10, 0))
  })

  it('sameDay ignores the time', () => {
    expect(sameDay(new Date(2026, 10, 9, 1), new Date(2026, 10, 9, 23))).toBe(true)
    expect(sameDay(new Date(2026, 10, 9), new Date(2026, 9, 9))).toBe(false)
  })
})
