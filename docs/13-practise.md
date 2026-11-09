# 13 · Practise a call

**Status:** done
**Brief:** bonus ("The Practise a call and Call back screens"; Call back is done in 05/06)

## Goal
A safe rehearsal before a real call: pick a customer scenario, run the call
against a scripted customer, tick the SOP steps as you cover them, and get
feedback on what you missed.

## Mock reference
"Practise a call" (Plan sub-item) fires a simulated incoming call on the
Planner screen: orange "INCOMING CALL · Faizan A. · Intent 85", accept →
in-call card + AI Assist column with a live SOP checklist and a suggested next
line. No scenario choice, and no feedback at the end.

**Ours:** a practice drill that stays out of the real call path (no
telephony, nothing logged as a call):
1. **Pick** one of three scenarios built from real leads: Ritu S. (hot lead,
   delivery question), Kavitha R. (price objection, SLA missed), Faizan A.
   (EMI close).
2. **Live**: timer, the customer's current line in a bubble, **Next line**
   to advance the script, and the six SOP steps from the call review (06) as a
   checklist the agent ticks. A hint shows the line that would cover the next
   unticked step.
3. **Feedback**: % of steps covered (same tone thresholds as the SOP review),
   duration, and each missed step with a coaching tip. **Practise again** /
   **Pick another**.

AI-voiced practice by phone (the AI plays the customer) belongs to 07 and
reuses the same scenarios.

## Data
`src/data/practise.json`: `steps[]` (`{ step, hint, tip }`), `scenarios[]`
(`{ id, leadId, title, brief, lines[] }`).

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/plan/Practise.tsx` | pick → live → feedback |
| `src/screens/plan/Plan.module.css` | + practise styles |

## States & edge cases
- Next line on the last line → "End of script", Next disabled.
- Ending with nothing ticked → 0% with every step listed as missed.
- Leaving the tab mid-practice simply drops it (nothing to save).
- 390px: checklist stacks under the customer bubble.

## Acceptance criteria
- [x] Three scenario cards with the lead's name, situation and product
- [x] Live: timer runs; Next line advances and stops at the end; ticking steps updates the hint
- [x] End → feedback with %, duration, missed steps + tips; again / another work
- [x] No call is placed and nothing is logged to Recent

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/practise.test.tsx` | scenario list, start, script advance + end, tick/untick + hint, feedback (% and missed tips), practise again / pick another, nothing logged and no device call |

## Review
2026-11-09 · self-review against the PDF bonus line and the mock's simulated call.
- Kept out of `CallProvider` on purpose: a practice must never reach Twilio or the call log,
  and a separate panel makes that structural, not a flag.
- The SOP steps match the call review (06), so the same mental model runs through
  practice → real call → review.

## Verification
2026-11-09
- `npm test`: 205/205. New: 7 practise tests (three scenarios, script advance and end, timer,
  personalised hint follows the first unticked step, feedback 67% with missed steps + tips,
  again / another, never dials or logs).
- Chrome 1440px: scenario cards; live practice with timer, customer line, hint and checklist.
- Test-suite health (found here): the long calling test took 15s in the full run but 0.4s
  alone. On this 16-core machine Vitest's default ~15 workers, each with jsdom, oversubscribed.
  `maxWorkers: 4` takes the suite from 37s to 8.7s with no slow tests, so the 15s
  `testTimeout` added in 08 was only hiding this and is removed.
