# 10 · Pulse home

**Status:** done
**Brief:** must build ("Pulse home: AvaniBot, role and task agents, Channels and Kudos")

## Goal
The agent's team inbox: an always-on assistant (AvaniBot), the AI agents
assigned to them (role and task agents with their metric), team channels, DMs
and recognition (Kudos). Each row opens its conversation (11).

## Mock reference
- Purple header band "Pulse · The Sleep Company · Koramangala".
- Search "Ask AvaniBot or search Pulse…".
- **AvaniBot** card (purple, ALWAYS ON): "Ask me about anything happening in
  Pulse…", buttons **Daily Brief** and **Ask a question**.
- **Custom Agents** fold ("Set up by your manager, already live"):
  - **Role agents** ("run a team"): #callcentre-agent, Call Centre Agent.
  - **Task agents** ("move one metric"): #cross-sell-agent (Attach rate 24% ▲2),
    #sop-agent (SOP adherence 81% ▲2), #lead-conversion-agent, #capture-agent
    (Capture coverage 78% ▲1), each with an items badge.
- **General**: customer-discussions (relayed via WhatsApp Business, 2).
- **Kudos** banner (amber): "3 NEW", latest quote, "12 ALL-TIME".
- **Channels**: callcentre-team (@ mention), all-stores 4, avani-coaching 1,
  manage-shipment 1, quotation-tickets 1, new-hire-onboarding: preview, time, unread.
- **Direct messages**: Sunita Rao (MGR), Priya Krishnan, Raju Kumar.

**Cleaner / different:** one white card per section instead of the mock's
stack of differently coloured blocks. AvaniBot is the only coloured card.
Search really filters (channel names, DM names and message text), and Enter
asks AvaniBot. The "+" create menu is dropped (no flow behind it). Kudos opens
a small modal with the incoming kudos rather than an overlay screen.

## Data
`src/data/pulse.json`: `channels[]` (id, kind `channel|dm|agent|bot|customer`,
title, subtitle, preview, time, unread, mention, messages, asks), `agents[]`
(metric card per agent for Arvind), `kudos`.
`src/pulse/store.ts`: localStorage-backed `sent`, `answered`, `read`, plus
`usePulse()` and derived helpers (`unreadFor`, `openAsks`).

## Files
| File | Responsibility |
|------|----------------|
| `src/data/pulse.json`, `src/data/types.ts` | channels, agents, kudos |
| `src/pulse/store.ts` | runtime state + hooks (shared with 11 and the dashboard) |
| `src/screens/pulse/PulseHome.tsx` | search, AvaniBot card, agents fold, sections, kudos |
| `src/screens/pulse/Pulse.module.css` | styles for 10 and 11 |

## States & edge cases
- Search with no hits → "Nothing matches '…'".
- Unread badge clears once the channel has been opened (read set persists).
- Badge = unread + open "Needs your input" asks.
- 390px: single column, rows full width.

## Acceptance criteria
- [x] All mock sections present with mock data; agents fold toggles
- [x] Daily Brief opens AvaniBot and posts the brief; Ask a question opens it with the composer focused
- [x] Search filters rows live; Enter sends the query to AvaniBot
- [x] Kudos opens a list of kudos
- [x] Opening a channel clears its unread badge

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/pulse-home.test.tsx` | sections + data, agents fold, search filter + empty state + Enter → AvaniBot, Daily Brief, Kudos modal, unread clears after visiting |

## Review
2026-11-09 · self-review against the PDF list and the mock's Pulse home + overlays.
- The store needs `reset()` so tests (and a demo) can start clean.
- Badges = unread (until opened) + open asks, so answering a card is visible from home too.
- AvaniBot's "hot leads" card is answered in its DM, while the dashboard task opens the
  Leads modal (D12). Both read the same `answered` state.

## Verification
2026-11-09
- `npm test`: 169/169. New: 3 AvaniBot routing tests and 8 Pulse home tests (all sections
  with mock data, agents fold, live search across names and message text, empty state + Enter
  → AvaniBot, Daily Brief with typing indicator, Ask a question focuses the composer,
  Kudos modal, unread clears after a visit).
- Found while testing: Node 25's experimental global `localStorage` shadows jsdom's in Vitest,
  so every store's persistence was silently a no-op in tests. `tests/setup.ts` now installs an
  in-memory Storage, and persistence is really exercised.
- Chrome 1440px: home and agent channel. 390px: fixed an overflow where long single-line
  previews widened the grid column past the screen (`minmax(0, 1fr)`).
- Copy fix: lower-casing metric names produced "sop adherence"; `lowerFirst` keeps acronyms.
