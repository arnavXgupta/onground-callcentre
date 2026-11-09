# Flows

How a user moves through the app, and how a call moves through the system.
Update this when a feature changes a flow.

## 1. Screen map

```mermaid
flowchart LR
  Shell[App shell: sidebar + top bar] --> Dash[Dashboard]
  Shell --> Plan
  Shell --> Cal[Calendar]
  Shell --> Pulse[Pulse home]

  Plan --> Out[Calls to make]
  Plan --> In[Incoming]
  Plan --> Rec[Recent]
  Plan --> Prac[Practise a call]

  Dash -- "Who's waiting → Open planner" --> Out
  Dash -- "My Tasks row" --> Chan[Pulse channel with Needs-your-input]
  Dash -- "2 hot leads" --> Leads[Leads modal]
  Pulse --> Chan
  Chan -- "View lead" --> Leads

  Out -- "Place call" --> Call[In-call screen]
  In -- "Call back" --> Call
  Leads -- "Call" --> Call
  Dial[Dial pad] --> Call
  Rec -- "tap row" --> Review[Call review modal]
  Call -- "End" --> Wrap[Wrap-up sheet] -- "Save" --> Rec
```

Routes: `/dashboard` (default), `/plan/outgoing`, `/plan/incoming`,
`/plan/recent`, `/plan/practise`, `/calendar`, `/pulse`, `/pulse/:channel`.
Modals (leads, call review, wrap-up, dial pad) are overlays on the current route.

## 2. Call lifecycle (one state machine for every call)

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> connecting: Place call / Call back / Dial
  connecting --> ringing: callee's phone rings (answerOnBridge)
  ringing --> in_call: callee answers
  connecting --> ended: failed / not connected
  ringing --> ended: busy / no answer ("Not connected")
  idle --> incoming: inbound call arrives
  incoming --> in_call: Accept
  incoming --> idle: Decline / caller hangs up (logged as missed)
  in_call --> ended: either side hangs up
  ended --> wrap_up
  wrap_up --> idle: Save (logged to Recent) / Skip
```

Before any of this, the agent clicks **Go online** (mic permission + device
registration from a user gesture). Offline agents can still place calls, since
registration only matters for inbound.

In `in_call`: mute, keypad (DTMF), live timer, end. One call at a time: a second
outbound is blocked with a message; an inbound call while busy is rejected and
logged as missed.

Call modes, same UI and state machine:

| Mode | Who talks to the customer | Trigger |
|------|---------------------------|---------|
| **Agent call** (human-to-human) | The agent, through the browser mic | Place call, Call back, dial pad |
| **AI call** (AI-to-human) | Pipecat voice bot, with the lead's context | "Let AI call" on a lead |
| **Inbound** | The agent | A customer dials our Twilio number |

## 3. System flow: agent call (browser → real phone)

```mermaid
sequenceDiagram
  participant B as Browser (Twilio Voice SDK)
  participant V as Vercel /api
  participant T as Twilio
  participant P as Customer phone
  B->>V: GET /api/token
  V-->>B: Access token (VoiceGrant, identity=agent)
  B->>T: device.connect({ params: { leadId } or { To } })
  T->>V: POST /api/voice (signed, From=client:agent)
  V->>V: verify signature, route: leadId → LEAD_CALL_NUMBER, To → only if allowlisted
  V-->>T: <Dial callerId=OUR_US_NUMBER answerOnBridge><Number>…</Number></Dial>
  T->>P: PSTN call rings (browser gets "ringing")
  P-->>B: answered: audio bridged both ways ("accept")
```

**Inbound:** the same webhook. When `From` is a phone (not `client:…`),
`/api/voice` answers `<Dial action=/api/voice?dialed=1 timeout=20><Client>agent</Client></Dial>`
and every online browser gets an `incoming` event. The action callback plays
"we'll call you back" only if nobody answered.

## 4. System flow: AI call (AI → real phone)

```mermaid
sequenceDiagram
  participant B as Browser
  participant V as Vercel /api/ai-call
  participant T as Twilio
  participant P as Customer phone
  participant Bot as Pipecat bot (STT → LLM → TTS)
  B->>V: POST { leadId, to }
  V->>T: calls.create(to, TwiML: <Connect><Stream url=bot>) + lead context
  T->>P: PSTN call rings
  T->>Bot: media stream websocket (8 kHz μ-law)
  Bot-->>P: speaks the pitch, listens, answers
  Bot-->>T: hangs up when done
```

Bot hosting and the exact stream URL are settled in `docs/` for the AI-calling
feature (see `decisions.md`).

## 5. Pulse "Needs your input"

Dashboard task row → opens its channel → pinned card at top with 2–3 answer
buttons + free-text reply → answering posts "You: <answer>" in the thread,
removes the card, decrements the channel badge and the dashboard task count.

## 6. Data

Sample data is static JSON in `src/data/`. Runtime changes (sent messages,
answered cards, saved call outcomes, real calls placed) live in client state and
`localStorage`, so a reload keeps the demo's history. No database.
