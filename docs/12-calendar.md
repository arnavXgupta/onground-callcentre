# 12 · Calendar

**Status:** done
**Brief:** must build ("Month grid with event dots · Today button and month switcher")

## Goal
See the month at a glance, spot the days with something on, and jump back to
today. Pick a day to see what's on it.

## Mock reference
- Title "Calendar", subline "Mirrored from your mailbox: invites created here
  land there too"; info banner "Store visits, coaching sessions, and meeting
  invites all show up here, and in your mailbox."
- Card: ‹ "October 2026" [Today] ›, weekday row S M T W T F S, 7-column grid of
  day tiles; today has a blue ring; event days have a red dot; clicking a day
  selects it (click again to clear). Dots only appear in the real current month.
- "Upcoming" list under the grid: time column, title, meta ("With Sunita Rao
  (Manager) · via #callcentre-team"), share button. Selecting a day filters
  it; an empty day shows a placeholder.
- Events on fixed days 23, 26, 28 of the current month.

**Cleaner / different:**
- Events are dated **relative to today** (today, +1, +3, +5 days), so the demo
  never shows a month of past events, and they show in whichever month they
  fall (the mock only shows dots in the current month). Today's event is the
  4:30pm callback with Priya Iyer, the same callback as the dashboard task.
- Each day tile is a real button with a full label ("Monday 9 November 2026,
  today, 1 event") and `aria-pressed` for the selection.
- Invite sharing is out of scope: not in the brief, and there's no mailbox
  behind it.

## Data
`src/data/calendar.json`: `[{ id, offsetDays, time: "HH:MM", title, with, via? }]`.

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/calendar/Calendar.tsx` | month state, grid, selection, list |
| `src/screens/calendar/month.ts` | pure helpers: `monthGrid(year, month)` (leading blanks + days), `eventsOn(date)`, `sameDay` |
| `src/screens/calendar/Calendar.module.css` | styles |

## States & edge cases
- Month nav wraps the year (Dec → Jan, Jan → Dec).
- Months starting on Saturday need 6 rows; February in non-leap years has 28 days.
- Selection clears on month change; Today selects today in the current month.
- Viewed month with no events → "Nothing scheduled this month."
- 390px: tiles shrink (aspect 1), dots still visible, list full width.

## Acceptance criteria
- [x] Opens on the current month, today highlighted
- [x] ‹ › change month (wrapping the year); Today returns and selects today
- [x] Dots on days with events, in whichever month they fall
- [x] Selecting a day filters the list; again clears it; empty day → placeholder
- [x] Upcoming lists the month's events in time order

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/month.test.ts` | grid offsets and lengths (Nov 2026 starts Sunday: 5 rows; Feb 2026 starts Sunday with 28 days: exactly 4 rows; Aug 2026 starts Saturday: 6 rows), year wrap |
| `tests/web/calendar.test.tsx` | current month + today label, nav + wrap, Today, dots, select/deselect filter, empty day, upcoming order |

## Review
2026-11-09 · self-review against the PDF list and the mock's calendar code.
- Checked the edge months with real dates (node): Feb 2026 fills exactly 4 rows and Aug 2026
  needs 6, so the grid must not assume 5 rows.
- Today's event reuses the dashboard's 4:30pm callback, so screens agree with each other.
- Sharing invites stays out (no mailbox behind it; not in the brief).

## Verification
2026-11-09
- `npm test`: 198/198. New: 9 month-helper tests (Nov/Feb/Aug grids, year wrap both ways,
  relative dating incl. crossing a month end, sameDay) and 6 calendar UI tests (opens on this
  month with today + dots, upcoming order, month nav + year wrap, select/deselect filter,
  empty day, Today).
- Chrome 1440px and 390px (`scrollWidth == clientWidth`): today ring, red dots, Today pill.
