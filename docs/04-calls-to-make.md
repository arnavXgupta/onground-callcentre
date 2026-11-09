# 04 · Plan · Calls to make

**Status:** done
**Brief:** must build ("Plan: Calls to make": leads ranked by score, expandable rows with paging)

## Goal
The agent's outgoing call list for today: leads ranked by attractiveness
score, each expandable to the context needed before dialling, with a real
**Place call** button.

## Mock reference
- Plan header band: "Today's calling plan" / "Planner" + date chip ("Mon, 9 Nov").
- Section title "Planned outgoing calls", subline "Ranked by lead
  attractiveness score: tap a lead for the full picture".
- Row: initials avatar (tinted), name, "Interested: Smart Luxe Mattress ·
  ₹13,390", score at right (green ≥ 80, amber ≥ 55, red below) over a "SCORE"
  label, chevron. Click toggles one row open at a time.
- Expanded: **Story so far** (journey steps joined with →), **Preferred
  product** | **Cross-sell** tiles, amber **EMI / financing** note, full-width
  green **Place call**.
- Pager under the list: ‹ "Page 1 of 3" ›, 2 leads per page, 5 leads total.

**Cleaner than the mock:** the header band becomes a plain page header (title +
date chip); score uses a small pill instead of colour-only text (colour plus a
number, never colour alone); the whole row head is a `<button>` with `aria-expanded`.

## Scope
- **In:** `PlanLayout` (page header + date chip + phone-only segmented tabs);
  outgoing list sorted by `score` desc; expand/collapse (one open); pager (2
  per page, prev/next disabled at the ends, the open row closes on page
  change); Place call → `useCall().place({ leadId, name, number })`; the call
  dock shows the lead's product / cross-sell / EMI while on the call.
- **Out:** "Let AI call" button (07); lead filters/search (not in brief).

## Data
`src/data/leads.json` (typed `Lead`, done). Helpers in `src/lib/format.ts`:
`formatINR(13390) → "₹13,390"`, `scoreTone(score) → 'brand' | 'warn' | 'danger'`,
`avatarTint(name)` (stable hash → one of 6 tints).

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/plan/PlanLayout.tsx` | header, date chip, phone segmented tabs, renders the tab's panel |
| `src/screens/plan/Outgoing.tsx` | list + pager |
| `src/screens/plan/LeadRow.tsx` | collapsed head + expanded detail |
| `src/screens/plan/Plan.module.css` | styles shared by the plan tabs |
| `src/components/ui/*` | first shared primitives as they're needed: `Avatar`, `Pill`, `Button`, `Pager` |
| `src/lib/format.ts` | INR, score tone, avatar tint, date chip text |

## States & edge cases
- Ringing/in-call: Place call disabled with "On a call" while a call is live.
- Device offline: Place call still clickable; the dock shows the error (from 03).
- Lead with an empty journey → "No history logged yet."
- 390px: tiles stack to one column, score pill stays right-aligned, no overflow.

## Acceptance criteria
- [x] Order: Ritu S. (96), Mukunda (90) │ Faizan A. (88), Kavitha R. (55) │ Divya P. (38)
- [x] "Page 1 of 3"; prev disabled on page 1, next disabled on page 3
- [x] Clicking a row opens it and closes any other; clicking again closes it
- [x] Expanded content matches the lead (story, product, cross-sell with price, EMI note)
- [x] Place call starts a real lead call (dock shows name + product)
- [x] 1440px and 390px both clean

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/format.test.ts` | INR formatting, score tone thresholds (80/55 edges), stable avatar tint |
| `tests/web/outgoing.test.tsx` | ranking, pager bounds + labels, expand one at a time, page change collapses, detail content, Place call calls `place()` with the lead (fake device) |

## Review
2026-11-09 · self-review against the PDF, the mock (clicked through), `flow.md` and plan 03.
- Mock tints avatars per lead by hand; a stable name hash gives the same effect with no per-lead colour data.
- Disabled-while-on-a-call matches 03's "second call blocked" rule. The dock carries the message,
  the button just reflects it.
- Row head gets `aria-controls` pointing at the detail region, as well as `aria-expanded`.
- Depends on 03's `useCall()` contract (`place({ leadId, name, number })`). If 03's review changes
  it, update this plan before building.

## Verification
2026-11-09
- `npm test`: 113/113. New: 24 format tests, 5 Calls-to-make tests (ranking + paging bounds,
  row content, one-open-at-a-time, collapse on page change, Place call → `connect({ leadId })`
  with the pitch in the dock and the button disabled during the call).
- Chrome 1440px: header + date chip, ranked rows with score badges, expanded Ritu S.
  (story, tiles, EMI note, Place call), pager.
- Chrome 390px (iframe): segmented plan tabs, tiles stacked, `scrollWidth == 390`.
- Changed during build: a 10px "SCORE" sub-label broke brand.md's 12px minimum, so it's
  back to `--fs-xs`. `PageHeader` is a `<div>`, not a `<header>`: Testing Library
  counted it as a second banner landmark.
- Live "Place call" to a real phone is covered by 03's pending live check.
