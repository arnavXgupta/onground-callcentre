# Roadmap

Built risk-first: real calling is the pass/fail item, so it lands right after
the shell, before the screens that hang off it.

| # | Feature | Brief | Plan | Status |
|---|---------|-------|------|--------|
| 01 | Foundation: scaffold, tokens, routing skeleton, test harness | – | [01](01-foundation.md) | done |
| 02 | App shell: sidebar, top bar, phone tab bar | must | 02 | – |
| 03 | Calling: browser softphone ↔ real phone, inbound ring, in-call, dial pad, wrap-up | **required** | 03 | – |
| 04 | Plan · Calls to make: ranked leads, expandable rows, paging, Place call | must | 04 | – |
| 05 | Plan · Incoming: missed calls, value at stake, Call back | must | 05 | – |
| 06 | Plan · Recent: call log by type/time/length, review modal | must | 06 | – |
| 07 | AI calling: Pipecat bot phones a lead | **required** (where possible) | [07](07-ai-calling.md) | researched |
| 08 | Dashboard: KPIs, progress, who's waiting, earnings, tasks, 7-day charts | must + bonus charts | 08 | – |
| 09 | Leads modal: ICP + intent scores, collapsible signals, paging | must | 09 | – |
| 10 | Pulse home: AvaniBot, role/task agents, channels, Kudos | must | 10 | – |
| 11 | Pulse channel: chat, send message, Needs-your-input card | must + 2 bonuses | 11 | – |
| 12 | Calendar: month grid, event dots, Today, month switcher | must | 12 | – |
| 13 | Practise a call | bonus | 13 | – |
| 14 | Deploy, README, demo recording | **required** | 14 | – |

Phone width (bonus) is part of every feature's acceptance criteria rather than
a feature of its own.

## Needed from the user (blocking 03 and 07)

**Twilio** (for 03):
- Account SID, an API Key SID + Secret
- A Twilio phone number with voice
- A TwiML App (its Voice URL gets pointed at our `/api/voice`)
- Verified caller IDs for the phones we'll call in the demo (trial accounts only dial verified numbers)
- Geo permissions: India enabled for voice

**Pipecat bot** (for 07): a Pipecat Cloud org + agent, and keys for Deepgram,
OpenAI and Cartesia (see `07-ai-calling.md` for the exact names).

## Deadline

12 hours from the assignment email's sent time (IST). Hold back time for
deploy + recording (feature 14).
