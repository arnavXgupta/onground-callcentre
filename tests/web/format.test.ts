import { describe, expect, it } from 'vitest'
import { avatarTint, clock, duration, formatINR, formatWhen, scoreTone, todayChip } from '../../src/lib/format'

describe('formatINR', () => {
  it.each([
    [13390, '₹13,390'],
    [81860, '₹81,860'],
    [181860, '₹1,81,860'],
    [0, '₹0'],
  ])('%d → %s', (n, out) => expect(formatINR(n)).toBe(out))
})

describe('clock / duration', () => {
  it.each([
    [0, '00:00'],
    [17, '00:17'],
    [65, '01:05'],
    [3600, '60:00'],
  ])('clock(%d) → %s', (n, out) => expect(clock(n)).toBe(out))

  it.each([
    [0, '—'],
    [40, '40s'],
    [125, '2m 05s'],
    [252, '4m 12s'],
  ])('duration(%d) → %s', (n, out) => expect(duration(n)).toBe(out))
})

describe('scoreTone', () => {
  it.each([
    [96, 'brand'],
    [80, 'brand'],
    [79, 'warn'],
    [55, 'warn'],
    [54, 'danger'],
    [38, 'danger'],
  ])('%d → %s', (score, tone) => expect(scoreTone(score)).toBe(tone))
})

describe('avatarTint', () => {
  it('is stable per name and within the 6 tints', () => {
    expect(avatarTint('Ritu S.')).toBe(avatarTint('Ritu S.'))
    for (const n of ['Ritu S.', 'Mukunda', 'Faizan A.', 'Kavitha R.', 'Divya P.', '']) {
      expect(avatarTint(n)).toBeGreaterThanOrEqual(0)
      expect(avatarTint(n)).toBeLessThan(6)
    }
  })
})

describe('dates', () => {
  const now = new Date(2026, 10, 9, 15, 0).getTime() // Mon 9 Nov 2026, 3pm

  it('formats the header chip', () => expect(todayChip(new Date(now))).toBe('Mon, 9 Nov'))

  it.each([
    [new Date(2026, 10, 9, 10, 42), 'Today 10:42 AM'],
    [new Date(2026, 10, 8, 16, 40), 'Yesterday 4:40 PM'],
    [new Date(2026, 10, 5, 14, 15), 'Thu 2:15 PM'],
    [new Date(2026, 9, 30, 9, 0), '30 Oct'],
  ])('formatWhen(%s)', (d, out) => expect(formatWhen(d.getTime(), now)).toBe(out))
})
