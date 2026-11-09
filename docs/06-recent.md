# 06 · Plan · Recent

**Status:** done
**Brief:** must build ("Calls by type, time and length; tap a call to review it")

## Goal
Everything the agent dialled, answered or missed, newest first. Tap one to see
how it went: SOP adherence for reviewed calls, the agent's own wrap-up for
calls made in the app, and a call-back for missed ones.

## Mock reference
- "Recent calls", subline "Tap a call to review it against SOP".
- Row: round icon by type (incoming green, outgoing blue, missed red), name
  (+ outcome tag if logged), "10:42 AM · 4m 12s" or "Yesterday · —", chevron.
- Review modal "Call with Mukunda R." / "10:42 AM · 4m 12s": **SOP adherence on
  this call** bar + % (green ≥ 80, amber ≥ 50, red below), then 6 SOP steps
  (Opening & intent confirm, Needs discovery, Product pitch, EMI / financing
  mention, Warranty mention, Closing / callback booking), each ✓ with a quoted
  line or ✗ with a red reason and a "Missed" tag.

**Different from the mock (honest data):** the mock gives *every* call,
missed ones included, an SOP score from a rotating template. We attach SOP
reviews only to the sample calls that connected. A missed call's modal says
there was no conversation and offers **Call back**. A call made in this app
shows its wrap-up summary and outcome, plus a note that SOP scoring needs a
recording (recording is off in this demo).

## Data
Uses 05's `useCallHistory()`. SOP data lives on the sample calls in `calls.json`.

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/plan/Recent.tsx` | list |
| `src/screens/plan/CallReview.tsx` | modal: SOP / wrap-up / missed variants, footer Call back |

## States & edge cases
- Empty history (impossible with samples, but handled) → empty state.
- Long names / summaries wrap; outcome pill never pushes the chevron off-row.
- Call back from the modal closes it first, then dials.
- 390px: modal is a bottom sheet (Modal primitive).

## Acceptance criteria
- [x] 8 sample rows sorted newest first, icons by type, time · length
- [x] Mukunda review: 83% (5/6), Warranty missed with its reason
- [x] A call saved from wrap-up appears at the top with its outcome; its review shows summary + outcome
- [x] Missed call review: no SOP, Call back works

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/recent.test.tsx` | order + meta text, SOP modal (83%, missed tag, evidence), live entry with outcome + summary, missed modal Call back → `connect`, Esc / close |

## Review
2026-11-09 · self-review against the mock's `renderPlanRecent` / review modal and plan 05.
- The mock's list isn't chronological (a missed call from today sits below one from yesterday).
  A call log should be, so we sort newest first. That's a deliberate difference.
- Two mock entries say only "Yesterday" / "Mon". They get concrete sample times
  (yesterday 11:50 AM, yesterday 12:30 PM, Fri 3:20 PM) so sorting and "When" text work.
- Templates go to the connected calls whose quotes fit the lead: Mukunda (inbound) gets
  83% with warranty missed, as in the mock; Kavitha (outbound) 50%; Faizan (outbound)
  83% with EMI missed, which matches "asked about EMI" in his journey.

## Verification
2026-11-09
- `npm test`: 135/135. New: 4 Recent tests (newest-first order with type, time and length;
  SOP modal 83% with 5 ✓ and warranty missed; a live call with its outcome tops the list and
  its review shows the wrap-up and the recording note; missed → no review, Call back dials
  and closes).
- Chrome 1440px: list and Mukunda review modal (adherence bar, quoted evidence, red miss).
