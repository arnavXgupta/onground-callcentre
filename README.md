# On-Ground Call Centre

A rebuild of On-Ground.ai's call-centre agent app, with real telephone calling.
An agent can call a real phone from the browser, and take calls from real
phones, through Twilio.

**Live:** _added after deploy_ · **Demo video:** _added after recording_

## Run it

Needs Node 24 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 228 tests (Vitest + Testing Library)
npm run build      # typecheck + production build
```

Every screen works without any setup. Calling needs a Twilio account (the free
trial is enough):

1. **Twilio Console:** verify the phone you'll call (Phone Numbers → Verified
   Caller IDs), take the free trial number, and create a **Standard** API key.
   (A Restricted key can't sign browser-phone tokens.)
2. Copy `.env.example` to `.env` and fill in the account SID, auth token, API key,
   your Twilio number, and the verified phone as `LEAD_CALL_NUMBER` and
   `DIAL_ALLOWLIST`.
3. Expose the dev server: `ngrok http 3000`. Put the https URL in
   `PUBLIC_BASE_URL`.
4. `npm run twilio:setup` creates the TwiML App, points your number at it and
   enables calling India. It never buys anything or prints secrets.
   `npm run twilio:check` re-checks everything without changing it.

Then open the app, go to **Plan → Calls to make**, open a lead and press
**Place call**, and your phone rings. To receive a call, press **Go online** in the
top bar and call your Twilio number.

## What's built

Everything the brief lists as must-build, plus every bonus.

| Area | What works |
|------|------------|
| **Calling** | Browser ↔ real phone, both directions. Ringing, on call, mute, keypad (DTMF), live timer, end, wrap-up with outcome and summary, saved to Recent. Dial pad in the top bar. One call at a time. |
| App shell | Sidebar, top bar with availability, dial pad, notifications and profile menus. A bottom tab bar on phones. |
| Dashboard | KPIs that change with the period, progress, live "who's waiting", earnings against the slab, tasks from open Pulse asks, and two 7-day charts (Recharts). |
| Plan · Calls to make | Leads ranked by score, expandable rows with the pitch, paging, Place call. |
| Plan · Incoming | Missed calls with value at stake, called-back state, Call back. |
| Plan · Recent | Call log by type, time and length, plus a call review modal with SOP feedback. Real calls you make are added here. |
| Plan · Practise | Practise a call with scripted customers and SOP feedback (bonus). |
| Leads modal | ICP and intent scores, collapsible signals, paging with buttons or ← →. |
| Calendar | Month grid with event dots, month switcher, Today. Pick a day to filter the list. |
| Pulse | Home with AvaniBot and agents, channel chat, sending messages (bonus), and answering "Needs your input" cards (bonus). Answers update the dashboard's task count. |
| Phone width | Every screen works at 390px (bonus). |

Data is the brief's local JSON in `src/data/`. What you do (calls, messages,
answers) is kept in localStorage, so a reload keeps the demo's history.

## How calling works

Twilio's free trial blocks dialling a browser and a phone straight into each
other (`<Dial><Number>` and `<Dial><Client>`). So the app uses the two things the
trial does allow, which are also how a real call centre is built:

- **Outbound: a conference room.** The browser connects through the Twilio Voice
  SDK. The `/api/voice` webhook puts the agent in a private conference and has
  Twilio ring the phone into the same room. The browser shows "Ringing…" and
  polls `/api/room` until the callee joins, then "On call". When either side
  leaves, a conference callback hangs up both legs.
- **Inbound: a call queue.** A customer calling the Twilio number hears a
  greeting and waits in a queue. An agent who is online polls `/api/queue`, sees
  the caller (named from the CRM when the number matches a lead) and presses
  Accept, which bridges them with `<Dial><Queue>`. Decline sends the caller an
  apology. A caller nobody picks up within about 30 seconds hears "we'll call
  you back", and the call shows under Incoming as missed.

The server is a few Vercel-style functions in `api/` (Web `Request → Response`),
with shared code in `server/`. In development, a small Vite plugin serves them.

- `GET /api/token`: a short-lived Voice access token for the browser.
- `POST /api/voice`: the one Twilio webhook. It returns TwiML for browser calls,
  phone calls and every callback.
- `GET/POST /api/queue`: who is waiting; decline a caller.
- `GET /api/room`: has the callee joined yet.

**Safety:** every webhook checks Twilio's signature against `PUBLIC_BASE_URL`, so
forged requests get a 403. The sample leads have made-up numbers, so "Place call"
on any lead rings `LEAD_CALL_NUMBER`. The dial pad only calls numbers in
`DIAL_ALLOWLIST`, so a public demo link can't ring arbitrary phones. Secrets stay
on the server.

Sequence diagrams are in [`flow.md`](flow.md) §3, and the full plan and review
are in [`docs/03-calling.md`](docs/03-calling.md).

## Not done, and why

- **AI-to-human calling.** The brief asks for it "where possible". On the Twilio
  trial it isn't: trial strips `<Stream>`, which is how call audio reaches a voice
  bot. The design (a Pipecat bot on Pipecat Cloud, started with `calls.create` +
  `<Connect><Stream>`) is researched in [`docs/07-ai-calling.md`](docs/07-ai-calling.md)
  and would need a paid account.
- **Trial limits.** It can only call verified numbers. Callers first hear Twilio's
  "press any key" notice, and calls cap at 10 minutes. On a paid account the same
  code runs without these.
- **No backend data.** Leads, calls and Pulse are local JSON plus localStorage, as
  the brief allows. Only calling uses a server.

## Stack and why

- **React 19 + TypeScript + Vite.** The brief prefers React. Vite keeps dev and
  build fast, and there's no server rendering to justify Next.js.
- **React Router.** Real URLs for every tab and channel, and `?leads` for the
  Leads modal.
- **CSS Modules + CSS custom properties.** Design tokens live in one place
  ([`brand.md`](brand.md)), with no CSS framework to fight. Native `<dialog>`,
  `popover` and `<details>` handle modals, menus and folds without a UI library.
- **Recharts** for the two charts. **Tabler** icons.
- **Twilio Programmable Voice** with the Voice JS SDK in the browser. The Voice SDK
  and Recharts are lazy-loaded.
- **Vercel functions** for the API. The handlers are plain Web `Request →
  Response`, so they also run under the dev server.
- **Vitest + Testing Library** for 228 tests, under `tests/`:
  - `tests/web`: screens, the call state machine, and the softphone against a
    fake Twilio device.
  - `tests/api`: TwiML, routing rules, signature checks and the REST wrappers.

## AI tools

- **Claude Code** (Anthropic's coding agent, running Claude Opus) was used
  throughout:
  - writing the plans in `docs/`, `decisions.md`, `flow.md` and `brand.md`;
  - implementing the features and writing the tests;
  - independent reviewer subagents for the calling design;
  - the Twilio setup script, and debugging the live calls.
- I directed the work: I set the workflow (every feature is planned, reviewed,
  built, tested and verified), chose Twilio, Vercel and Pipecat, decided to stay
  on the free trial, and made the live test calls.

No code was copied from the reference mock. It was read for behaviour and sample
data only.

## Repo map

```
src/        React app. src/calling = softphone + call state machine, src/data = sample JSON
api/        Vercel functions (token, voice webhook, queue, room)
server/     Shared server code: TwiML builders, Twilio REST wrappers, env, signatures
scripts/    twilio-setup.ts (check / apply)
tests/      All tests (web + api)
docs/       One plan per feature, each with review and verification notes
decisions.md · flow.md · brand.md · CLAUDE.md
```
