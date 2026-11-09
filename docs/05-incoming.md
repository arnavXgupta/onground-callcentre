# 05 · Plan · Incoming

**Status:** done
**Brief:** must build ("Missed calls with value at stake; Call back on every row")

## Goal
Missed inbound calls, ranked by what they're worth, so the agent calls back the
most valuable first. Every row has a real **Call back**.

## Mock reference
- Section "Missed calls", subline "Ranked by expected value: call the
  highest-value leads back first".
- Summary strip: **5** MISSED TODAY │ **₹81,860** EXPECTED VALUE AT STAKE.
- Rows: red missed-call icon, name, "Missed Today 10:05 AM · Visited store / in
  CRM"; right side "₹24,990 expected" in green + small green **Call back** button.
  Unknown caller: "New contact", "No prior record".
- Signal text from the lead's ICP: ≥ 80 "Visited store / in CRM", ≥ 55 "Warm
  lead", else "Cold lead"; no lead → "No prior record".
- Order: Faizan ₹24,990, Kavitha ₹24,990, Divya ₹18,490, Ritu ₹13,390, Unknown.

**Beyond the mock (real workflow):**
- Real missed calls (inbound not answered, declined, or rejected while busy;
  from 03's call log) appear here with the sample ones.
- After a call-back (a later outgoing call to the same lead or number), the row
  shows a **Called back** pill and drops out of "value at stake".

## Data
- `src/data/calls.json`: sample call history, 8 entries as in the mock, each
  `{ id, name, leadId?, number, direction, daysAgo, time: "HH:MM", durationSec, outcome?, sop? }`.
- `src/calling/history.ts`: `useCallHistory()` = live log + samples (dated
  relative to today), newest first; `missedCalls(history)` → rows with
  `{ call, lead?, value, signal, calledBack }`, sorted by value (ties: most recent first).

## Files
| File | Responsibility |
|------|----------------|
| `src/data/calls.json`, `src/data/types.ts` | sample history + `SampleCall`, `SopItem` |
| `src/calling/history.ts` | merge + derive (pure functions + the hook) |
| `src/screens/plan/Incoming.tsx` | summary strip + rows |

## States & edge cases
- No missed calls → empty state "No missed calls. You're all caught up."
- Unknown caller → Call back dials `To` (server allowlist decides; a sample
  unknown number is politely refused by `/api/voice`, a real missed call from
  the demo phone connects).
- Call back disabled while a call is live.
- 390px: value + button stack under the name.

## Acceptance criteria
- [x] Summary shows 5 and ₹81,860 for the sample data
- [x] Order and signal text match the mock
- [x] Call back on a lead row → `connect({ leadId })`; on Unknown → `connect({ To })`
- [x] A real missed call (log) shows up; after calling back it shows "Called back" and leaves the total

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/history.test.ts` | sample dating, merge order, missed ranking + ties, signal thresholds, called-back detection |
| `tests/web/incoming.test.tsx` | summary numbers, row order + text, Call back wiring, live missed call appears, called-back pill |

## Review
2026-11-09 · self-review against the mock's `renderPlanIncoming` and plan 03.
- The mock's "MISSED TODAY" counts yesterday's calls too. We label it "Missed" with the
  same count (5), so the number is true.
- Ties (Faizan / Kavitha, both ₹24,990) fall back to most recent first, which reproduces
  the mock's order.
- A call back to an unknown sample number is refused by the server allowlist (it has
  to be; that number isn't real). Real missed calls come from the demo phone, which is
  allowlisted, so those call backs connect.

## Verification
2026-11-09
- `npm test`: 135/135. New: 10 history tests (dating, no-future samples, merge order, ranking +
  ties, signal thresholds, called-back by lead / by number / not-before) and 6 Incoming UI tests.
- Chrome 1440px: summary 5 · ₹81,860, rows in mock order, value + Call back on every row.
- Found by tests, fixed in data: my invented time for Kavitha's sample outgoing call fell after
  her missed call, so she correctly showed as "Called back" and the totals drifted from the mock.
  The outgoing call is now earlier that day.
- Found by tests, fixed in code: sample calls dated "today" but later than the current time
  (an early-morning demo) showed future times and broke call-back ordering. They now move
  back a day. UI tests pin the clock (Date only) so they're deterministic.
