# 09 · Leads modal

**Status:** done
**Brief:** must build ("Opens from the dashboard task list · lead card with ICP score and lead intent score · collapsible buying signals · next and previous paging")

## Goal
One lead per page with everything needed to decide the next move: who they
are, how good a fit (ICP), how keen (intent), how they got here, what they
care about. Then call them for real.

## Mock reference
- Purple header "Leads" / "Lead 1 of 5 · SLA to close", close ✕.
- Pager bar: ‹ dots › (one dot per lead, current one wide). Arrows hidden at the ends.
- Status line: dot + OPEN / AGEING / COLD.
- Lead card: initials avatar, name, "Interested: Ortho GRID · ₹8,490", SLA badge
  ("2h left" green, "+3d ageing" amber, …).
- "Quote to be given to customer" with an on/off switch.
- SLA note in red when present (Kavitha: "SLA missed…").
- **ICP** bar + % · **Lead Intent Score** row with the number.
- Folds: **ICP fit breakdown** (closed; Budget fit / Need match / Decision
  stage bars), **How we got here** (closed; dated timeline with channel),
  **Where we picked up signals** (open; category icon + text per signal).
- Pre-call notes list; action row (No Interest, WhatsApp, On-ground Call, Came Back).
- Sticky footer: "● Cumulative missed: 2 · expired without close, visible to manager".

**Cleaner / different:**
- Folds are native `<details>/<summary>`: keyboard and screen-reader support for free.
- Arrows are disabled at the ends instead of hidden, so the layout doesn't jump.
  Dots are real buttons ("Go to lead 3"). ← / → keys page between leads.
- Actions: **Call {name}** (a real call; it closes the modal so the dock is
  visible) is the one primary action. No Interest / WhatsApp / Came Back are
  out of scope (not in the brief, and they'd open flows we don't build).
- Opened by URL, `?leads` or `?leads=<leadId>`, so the dashboard task and the
  AvaniBot "View lead" link both just link to it, and Back closes it.

## Data
`src/data/leads.json` (exists): `status`, `sla`, `slaNote`, `quoteRequested`,
`icp`, `intentScore`, `icpBreakdown`, `journey`, `signals`, `notes`.

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/leads/LeadsModal.tsx` | reads `?leads`, pages, renders one lead |
| `src/screens/leads/Leads.module.css` | styles |
| `src/components/shell/Shell.tsx` | renders `<LeadsModal/>` when `?leads` is present |

## States & edge cases
- Unknown `?leads=<id>` → opens at lead 1.
- Quote switch is per-lead UI state for the session (no backend).
- Call while another call is live → disabled ("On a call").
- Lead with no signals / journey → that fold is omitted.
- 390px: bottom sheet (Modal primitive), body scrolls, footer stays visible.

## Acceptance criteria
- [x] `?leads` opens "Lead 1 of 5" (Mukunda: ICP 87%, intent 91, "2h left")
- [x] Next / prev / dots / ← → page correctly; prev disabled on 1, next disabled on 5
- [x] Kavitha shows the red SLA note; Divya shows status Cold
- [x] ICP breakdown and journey closed by default, signals and pre-call notes open; all toggle
- [x] Quote switch toggles (`role=switch`, `aria-checked`)
- [x] Call → `connect({ leadId })`, modal closes, dock shows the lead
- [x] Close / Esc / backdrop remove `?leads` from the URL

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/leads-modal.test.tsx` | open by URL (default + by id + unknown id), lead content, paging (buttons, dots, arrow keys, bounds), folds, quote switch, Call → connect + closes, close removes the param |

## Review
2026-11-09 · self-review against the PDF list, the mock's `renderLeadsModalPage` and the Modal primitive.
- Missing from the first draft: the mock's pre-call notes. Added as an open fold.
- ← / → paging: focus starts on the dialog's close button, outside the body, so the key
  handler can't sit on the body. (Building it showed the dialog isn't enough either; see Verification.)
- Closing replaces the history entry (no `?leads`), so Back after closing doesn't reopen it.

## Verification
2026-11-09
- `npm test`: 8 new Leads modal tests (open by URL / by id / unknown id; content; arrows,
  dots, ← → and bounds; fold defaults + toggles; per-lead quote switch; Call closes +
  dials; close clears `?leads`).
- Fixed, found by tests: after clicking "Next" on the last lead the button disables, the
  browser drops focus to `<body>`, and ← / → stopped paging. Moved the key handler to a
  window listener while the modal is open, and removed the Modal `onKeyDown` prop.
- Chrome 1440px: purple header, pager dots, status, quote switch, ICP bar, intent score,
  folds, sticky Call footer with the cumulative-missed note.
