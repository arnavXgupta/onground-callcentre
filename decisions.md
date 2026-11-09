# Decisions

Append-only log. Each entry: what we chose, why, what we passed on. If a
decision is reversed, add a new entry that supersedes the old one; don't edit it.

---

### D1 · Stack: React 19 + Vite + TypeScript
**Why:** The brief prefers React or Angular. Vite gives the fastest dev loop and
Vercel deploys it with no config. TypeScript because the data shapes (leads,
calls, channels) are the backbone of every screen.
**Passed on:** Next.js. SSR buys nothing for an app an agent keeps open all
shift, and Vercel `api/` functions give us the backend anyway.

### D2 · Human-to-human calling: Twilio Programmable Voice + Voice JS SDK
**Why:** The browser becomes a real softphone (WebRTC to Twilio, PSTN out to any
number), and the same TwiML webhook handles inbound calls ringing in the app.
Trial credit is enough; trial accounts can only dial verified numbers, which is
fine for the demo.
**Passed on:** Exotel (India-native but KYC takes longer than the deadline),
Plivo (similar SDK, less familiar).

### D3 · AI-to-human calling: Pipecat voice bot
**Why:** Same architecture already running in production in our gethelpdeskai
codebase (Twilio media stream → Pipecat STT → LLM → TTS), so it's proven and we
can explain every part of it. Lead context (name, product, objections) is passed
into the bot so the AI pitches that lead specifically.
**Passed on:** Twilio `<Gather>` + LLM HTTP loop (robotic turn-taking),
hosted agents like Vapi/Retell (works, but "how you got calling working" would
just be "configured a SaaS").

### D4 · Hosting: Vercel for the app and its API
**Why:** One deploy for the React build plus `api/` serverless functions
(token, TwiML, AI-call trigger), all plain HTTP. The Pipecat bot needs a
long-lived websocket, so it runs on its own host (see the AI-calling plan).
Local dev reaches Twilio through ngrok.

### D5 · Styling: CSS Modules + CSS custom-property tokens
**Why:** `brand.md` tokens map 1:1 to `:root` variables; CSS Modules keep each
component's styles next to it with no extra dependency. Reviewers read plain CSS.
**Passed on:** Tailwind (faster to type, but the long class strings make it
harder to show the deliberate type and colour scale).

### D6 · Tests: Vitest + Testing Library, pytest for the bot, all under `tests/`
**Why:** Vitest shares Vite's config and is fast. Testing Library tests what the
agent sees and clicks, not implementation details. One top-level `tests/`
folder, as the user asked.

### D7 · Data: static JSON + client state + localStorage
**Why:** The brief says sample data from local JSON. Runtime changes (messages
sent, cards answered, calls logged) persist in localStorage so the demo survives
a reload. No database: nothing in the brief needs one.

### D8 · Mock HTML and PDF stay out of git
**Why:** The brief says "do not save the mock page or copy its source". They
sit in the working folder for reference only and are git-ignored.

### D9 · Commit after each verified feature
**Why:** The reviewers read the history. The user authorised one local commit
per feature once its tests and visual check pass. Never push without asking.

### D10 · Icons: Tabler (`@tabler/icons-react`); charts: Recharts
**Why:** Tabler is the icon family the mock uses, so the look carries over.
Recharts is the "charts with a library you like" bonus. It's declarative and
React-native, and two bar charts don't justify anything heavier.

### D11 · Look: same identity as the mock, cleaned up
**Why:** User direction: the mock's look is rough, keep it similar but cleaner
and more finished. `brand.md` holds the tightened system (6 type sizes, 4 radii,
2 gradients).

### D12 · "2 hot leads" opens the Leads modal directly
**Why:** The PDF says the Leads modal "opens from the dashboard task list". In
the mock that task routes through an AvaniBot thread first. We open the modal
directly from the task; the other two tasks open their Pulse channels with the
"Needs your input" card, as in the mock.

### D13 · AI bot runs on Pipecat Cloud; Vercel only triggers the call
**Why:** Research on our production setup (`docs/07-ai-calling.md`): the
outbound AI call is a single Twilio `calls.create` with inline TwiML that
streams to `wss://api.pipecat.daily.co/ws/twilio`. Pipecat Cloud hosts the
websocket and the bot, so everything we host stays plain HTTP on Vercel. This
settles the "bot runs on its own host" open point in D4.

### D14 · Paid Twilio account with a US number (supersedes "trial is enough" in D2)
**Why:** Twilio trial accounts replace `<Dial><Number>`, `<Dial><Client>` and
`<Stream>` with a "not available on trial accounts" message. That kills browser →
phone, inbound-to-browser and the Pipecat media stream. Twilio places calls to
India only from international numbers, so we use a US number. Found by the
independent plan review, then confirmed on Twilio's trial docs.

### D15 · Server code layout: `api/` handlers, shared logic in `server/`, dev via a Vite plugin
**Why:** Vercel now recommends keeping shared code outside `api/`. Handlers use
the Web `Request → Response` signature, so tests call them directly with no
mocks. In dev, a ~30-line Vite plugin serves the same handlers, so
`npm run dev` + ngrok is the whole local setup. **Passed on:** `vercel dev`,
which needs a CLI login and project link before anything runs locally.

### D16 · "Go online" before receiving calls
**Why:** Twilio recommends registering the device from a user gesture (browser
audio/autoplay rules), and it puts the mic prompt up front rather than in the
middle of answering a call. It also stops every visitor on the public link from
silently registering as the agent and ringing on inbound calls.

### D17 · Dashboard numbers are live where the app has the data
**Why:** The mock's dashboard is a picture: its date filter relabels itself and
its tasks are fixed. Ours reads real state wherever the app owns it: the queue
pill is the softphone's registration, the task list is the open Pulse asks,
"Leads called" counts calls placed in the app, and the period switch changes
the numbers. Static sample values stay only where a backend would supply them
(OG score, earnings, 7-day history).

### D18 · Stay on the Twilio free trial: conference + queue routing (supersedes D14)
**Why:** The user won't pay for an assignment, which is reasonable. Trial strips `<Dial><Number>`
and `<Dial><Client>` but supports `<Dial><Conference>` and `<Enqueue>`/`<Dial><Queue>`, and a live
test confirmed the trial account can ring the verified Indian phone. Outbound becomes "browser
and phone join one conference" (the server rings the phone into it). Inbound becomes a real
call queue the agent picks up from, which is how call centres work anyway and feeds "Who's
waiting". It runs unchanged on a paid account. **Cost:** callees/callers must be verified
numbers, calls cap at 10 minutes, and a ringing callee is detected by polling the conference.

### D19 · Soft UI (neumorphism) restyle, no gradients
**Why:** The user asked for a cleaner, more premium look in solid colours with
neumorphism. Canvas, cards and shell now share one cool grey (`#e6eaf0`); depth
comes from paired light/dark shadows (`--shadow-card`, `--shadow-raise`,
`--shadow-press`), not borders or gradients. The dark green shell went light; the
palette moved to slate + deep teal (brand), muted indigo (AI), amber, brick red.
The dashboard hero and in-call card are one solid ink slab instead of gradients.
**Rule that keeps it usable:** raised = clickable (buttons, task rows, chips,
calendar days on hover), inset = information or input (stats, queue rows, text
fields, the active nav item, a selected chip). Text and accents keep AA contrast
on the grey; neumorphism's usual low-contrast failure is avoided by never relying
on shadow alone to show state. **Kept:** the score ring is a hard-stop conic fill,
a solid two-colour ring, not a visible gradient.

### D20 · Lighter "hybrid" soft UI and a one-accent palette (refines D19)
**Why:** The user found D19's neumorphism too heavy and asked for a palette and UI
based on current dashboard practice. What the research said: full neumorphism
fails on data-dense dashboards because shadow-on-same-colour edges fall well
under WCAG's 3:1 non-text contrast, so use a hybrid (soft shadows **plus**
hairline borders, state shown by colour, not shadow alone). The best 2026 SaaS
dashboards use **one accent** for actions and keep green/amber/red for status
only ("red means broken, not look here"). Size, not colour blocks, sets KPI
hierarchy. Trends are lines; per-day counts are bars.
**What changed:** surfaces `#f8f9fb` sit a shade above the `#eef1f5` canvas with
a 1px border and short shadows. Accent is royal indigo `#3b5bdb` (buttons,
links, nav, selection). `--brand` stays the accent; a new `--ok` green carries
live/positive/pass/on-target. Money and score numbers are ink, not brand colour.
The dark hero and the purple AvaniBot, chat and modal headers became neutral
surfaces with coloured icon tiles. CSAT trend is a line chart. Calendar event
dots use the accent instead of red. The call dock stays dark, since it floats
over everything and must stand out.
Sources: setproduct.com/blog/neumorphism-design-guide,
925studios.co/blog/saas-dashboard-design-examples-2026, dev.to/thekitbase
"SaaS dashboard design trends in 2026", adminlte.io/blog/best-admin-dashboard-color-schemes.
