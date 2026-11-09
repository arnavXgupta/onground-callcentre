# 11 · Pulse channel

**Status:** done
**Brief:** must build ("a channel chat": back button and header, pinned Needs-your-input card with two buttons and a reply box, chat bubbles: others left, agent right, with times) + bonuses ("Send a message in a channel", "Answer the Needs your input card")

## Goal
A working conversation: read the thread, answer what's pinned for you, and
send messages that stay.

## Mock reference
- Purple header: ← back, "#callcentre-team", (✨ search in channel).
- **Needs your input** (pinned, amber, collapsible, count badge): per ask a
  question, context line, option buttons ("Confirmed" / "Reschedule"), and "Or
  type your answer" + **Send**. Empty text shows "Type an answer first".
  Answering removes the card, posts "You: <answer>" with "✓ Task done ·
  removed from your tasks", decrements the count, and removes the dashboard task.
- Date divider "Today · Call Centre Team".
- Bubbles: others left (avatar initials, name, time), mine right ("You", time,
  green bubble). Manager posts use bold labels (STAKEHOLDERS / ISSUE
  DEFINITION / SUGGESTED RESOLUTION) and an @mention.
- Bot cards (shipment, quotation, onboarding): title, badge, key/value
  fields, action buttons ("View lead" opens the Leads modal).
- Composer "Message #callcentre-team…", emoji button, send.
- AvaniBot DM replies to questions (action items by person, daily brief).
- Agent channels (#cross-sell-agent …): the agent's read on you: metric vs
  target and delta, going well, to improve, who to follow up.

## Scope
- **In:** all of the above for every channel in `pulse.json`; Enter sends,
  Shift+Enter adds a newline; empty or whitespace-only messages are not sent;
  messages and answers persist (localStorage); AvaniBot answers after a short
  typing delay; card actions that navigate (`?leads=…`, `/plan/…`).
- **Out:** emoji picker (the OS emoji keyboard works in the textarea), in-channel
  search, threads and reactions. None are in the brief.

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/pulse/Channel.tsx` | header, pinned asks, thread, composer |
| `src/screens/pulse/NeedsInput.tsx` | the pinned card |
| `src/screens/pulse/AgentCard.tsx` | the agent channel's metric card |
| `src/pulse/avanibot.ts` | pure `reply(question) → text` |

## States & edge cases
- Unknown channel id → redirect to `/pulse`.
- Thread scrolls to the newest message on open and on send.
- Long messages wrap; bubbles max 72% width (90% on phone).
- Typed answer with empty text → inline error, nothing sent.

## Acceptance criteria
- [x] #callcentre-team shows the 5 mock messages, left/right by sender, with times
- [x] Pinned card: option button and typed answer both work; card leaves; count drops; reply appears with "Task done"
- [x] Sending a message appends a right-aligned "You" bubble; survives a reload
- [x] AvaniBot answers "what are my action items from Sunita"
- [x] Quotation card "View lead" opens the Leads modal at Mukunda
- [x] Agent channel shows the metric card

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/avanibot.test.ts` | reply routing (person, brief, fallback) |
| `tests/web/pulse-channel.test.tsx` | thread rendering + alignment, send (button, Enter, Shift+Enter, empty), needs-input (option, typed, empty error, count), persistence across remount, AvaniBot reply, card action → Leads modal, agent card, unknown channel redirect |

## Review
2026-11-09 · self-review: covered together with 10 (shared store); see 10's review.

## Verification
2026-11-09
- `npm test`: 11 channel tests (thread alignment, times, `@mention` mark; back; send by button
  and Enter, Shift+Enter newline, blank never sent; persistence across remount and in
  storage; AvaniBot reply; option and typed answers, empty-answer error, count drops,
  collapse; quotation card → Leads modal at Mukunda; agent read-out; unknown channel → home).
- Chrome 1440px: #callcentre-team with pinned card, #cross-sell-agent card. 390px: AvaniBot DM
  fits; pinned asks scroll within 46% of the height.
- `<header>` inside `<main>` was counted as a second banner by Testing Library (same as in 04).
  Chat and agent headers are `<div>`s.
