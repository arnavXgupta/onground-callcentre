import events from '../../data/calendar.json'

export interface CalendarEvent {
  id: string
  at: Date
  title: string
  with: string
  via?: string
}

/** Leading blanks (null) for the weekday the month starts on (Sunday first), then each day. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  return [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ]
}

/** Move a {year, month} by delta months, wrapping the year. */
export function shiftMonth({ year, month }: { year: number; month: number }, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Sample events, dated relative to `today` so the demo always has something coming up. */
export function datedEvents(today = new Date()): CalendarEvent[] {
  return events
    .map(({ offsetDays, time, ...e }) => {
      const [h, m] = time.split(':').map(Number)
      return { ...e, at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays, h, m) }
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}
