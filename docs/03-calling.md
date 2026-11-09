# 03 · Calling: browser softphone ↔ real phone

**Status:** rev 3 built: tests + live endpoint checks pass; real calls being verified with the user
**Brief:** **required** ("CALLING FEATURE working … real call to a telephone number")

## Goal
The agent places and receives real phone calls from the browser: click a
number → a real phone rings → both people talk; a real phone dials our number →
the app rings → agent answers. Ends in a wrap-up that logs the call.

## Rev 3 · trial-compatible routing (2026-11-09, supersedes the routing below)

The user keeps the free trial (D18). A live check settled what trial allows:
a REST call from the trial account to the verified Indian phone **connected**
(CA39c5…, completed 23s). Twilio's trial page: `<Dial><Number>` and
`<Dial><Client>` are stripped, while `<Dial><Conference>` (one per account,
name replaced by the account SID, 600s cap) and `<Enqueue>` / `<Dial><Queue>`
(names namespaced) are supported, as are `<Say>`, `<Gather>`, `<Play>`,
`<Pause>`, `<Hangup>` and `<Leave>`. Only verified numbers can be called or call in.
This design also works unchanged on a paid account.

**Outbound (browser → phone): one conference, two legs**
1. Browser `connect({ leadId | To })` → TwiML App → `POST /api/voice` (From `client:agent`).
2. Server applies the same routing rules (lead → `LEAD_CALL_NUMBER`, dial pad → allowlist only), then
   REST `calls.create({ to: dest, from: TWILIO_PHONE_NUMBER, twiml: <Dial><Conference endConferenceOnExit>room</Conference></Dial>,
   statusCallback: /api/voice?leg=pstn (completed) })`.
3. Server returns the browser leg `<Dial action="/api/voice?leg=agent"><Conference endConferenceOnExit beep=false>room</Conference></Dial>`.
4. Browser `accept` = the agent joined the room → UI **Ringing**. The browser polls `GET /api/room` (1s,
   ringing only) → participants ≥ 2 → **On call**.
5. Callee busy / no-answer / failed (PSTN `statusCallback`) → server ends the conference → the browser
   leg disconnects → wrap-up "Not connected". Agent hangs up while it's still ringing (`?leg=agent`
   action) → server cancels the ringing PSTN leg.

**Inbound (phone → browser): a real queue**
1. Number → `POST /api/voice` (From a phone) → `<Say>` greeting + `<Enqueue waitUrl="/api/voice?wait=1" action="/api/voice?left=1">callers</Enqueue>`.
2. `?wait=1`: `<Say>` "please hold" + `<Pause>`; once `QueueTime` > 30s → `<Leave/>`.
3. `?left=1`: `QueueResult` = `leave` → `<Say>` "sorry we missed you, we'll call back" + `<Hangup/>`; otherwise `<Hangup/>`.
4. Browser, when **online**, polls `GET /api/queue` (2s) → `{ callers: [{ callSid, from, waitedSec }] }`.
   The first caller rings in the dock. Accept → `connect({ pickup: '1' })` → `<Dial><Queue>callers</Queue></Dial>`.
   Decline → `POST /api/queue { decline: callSid }` → server redirects that call to the apology + hangup.
   The caller vanishes from the poll before Accept → **missed** (logged).
5. While the agent is on a call, new callers simply wait in the queue (no auto-reject) and ring once
   the agent is free. That's better call-centre behaviour than the rev-2 busy-reject.

**Frontend deltas:** `PhoneDevice` drops `register` / `onIncoming` / `allowIncomingWhileBusy` (the
browser is never dialled now). "Go online" = mic permission + device + queue polling. Outbound
`accept` → RINGING, room poll → CONNECTED (machine unchanged).

**New/changed endpoints:** `api/voice.ts` (routes above), `api/room.ts` (GET participants),
`api/queue.ts` (GET waiting callers, POST decline). Pure TwiML builders stay in `server/voice.ts`.
All webhook branches keep signature validation (query string included).

**Known limits:** 10-minute calls on trial; a single agent; trial callees and callers must be verified
numbers; `/api/queue` returns caller numbers without auth (demo scope, noted in the README).

**Rev 3 review (independent subagent, 2026-11-09): approve with fixes, all applied:**
- BLOCKER: a `<Dial action>` isn't reliably requested when the agent hangs up first, and it
  carries no `DialCallSid` for conferences. Cleanup now hangs on the **agent's own conference
  entry**: `statusCallback=${BASE}/api/voice?leg=room&agent=<CallSid>&pstn=<sid>`,
  `statusCallbackEvent="leave end"`. On `participant-leave` / `conference-end`, end both calls.
  The SIDs ride in the signed URL; no lookups.
- BLOCKER: end calls with `status: 'completed'` (also ends an answered leg), not `canceled`.
  Otherwise a callee who answered at the last second sits alone in the account's single room.
- Every callback URL is absolute (`PUBLIC_BASE_URL`). Query branches are checked before `From`.
  The PSTN leg's `statusCallback=${BASE}/api/voice?leg=pstn&agent=<CallSid>` (default event
  `completed`) ends the agent's call.
- waitUrl is **one** document (`<Say>` + `<Pause length=25>` + `<Leave/>`): each waitUrl fetch is a
  trial "hop" (max 10). `?left=1`: `QueueResult=leave` → apology; anything else → empty `<Response/>`.
- `/api/room?agent=<CallSid>`: in-progress conferences → participants. Connected only if the
  agent's own CallSid is in the list and there are ≥ 2 participants (stale rooms ignored).
- `/api/queue`: `queues.list()` → `callers` or `callers-<AccountSid>`. Members have no From, so
  `calls(callSid).fetch()` each. Pickup only if `currentSize > 0`, else `<Say>` + `<Hangup/>`.
  Decline only works on a call that is currently a member (no hanging up arbitrary calls).
- Trial plays a "press any key" notice to the callee before our TwiML: participant count is the
  right "connected" signal. Budget: 75 voice-minutes total, 5s TwiML timeout (`calls.create` is
  well inside it). Polling pauses when the tab is hidden; Token `incomingAllow: false`.
- Confirmed in the SDK source: an outbound call's `parameters.CallSid` is set before `accept` fires.

## Mock reference
- Place call / Call back → (consent sheet) → **in-call card**: "CALL IN
  PROGRESS", name, mm:ss timer, sentiment bar, mute / hold / end, with an AI
  Assist column beside it.
- **Incoming**: orange banner "INCOMING CALL", name, intent + masked number,
  decline (red) / accept (green).
- **Dial pad**: floating button → keypad sheet 1–9 * 0 # with a green call button.
- **Wrap-up** after end: "Call with X · 00:20 · just now", editable summary,
  outcome chips (Interested, Follow-up needed, Requested callback, Resolved,
  Not interested), Skip / Save to CRM.

**What we do differently (and why):**
- The call UI is a **global dock** rendered by the shell, not a card inside
  Plan. Calls start from Plan, the Leads modal and the dial pad, and the agent
  can keep navigating mid-call.
- **No Hold button.** The Voice SDK has no hold (it needs a conference bridge),
  and a fake one is worse than none. Mute is real.
- **No consent sheet, sentiment bar or AI Assist column.** They're decorative in
  the mock. The dock shows lead context instead (04).
- Dial pad opens from a **phone button in the top bar**, not a floating blob.
- **"Go online" button** instead of always-on registration (see below).

## Account precondition: paid Twilio, non-Indian number (decision D14)
Trial accounts replace `<Dial><Number>`, `<Dial><Client>` and `<Stream>` with
"not available on trial accounts", so neither this feature nor 07 can work on
trial ([Twilio trial docs](https://www.twilio.com/docs/usage/trials/try-out-voice)).
Needs an **upgraded account** plus a **US (non-Indian) number**: Twilio only
places calls to India from international numbers. The inbound demo means an
ISD call from an Indian phone to that US number.

## Architecture (flow.md §2–3)

```
Browser ── Device.connect({ params: { leadId | To } }) ──► Twilio ──► POST /api/voice ──► <Dial answerOnBridge> PSTN
   ▲   GET /api/token (AccessToken + VoiceGrant)                         │
   └─── inbound: <Dial action=…?dialed=1 timeout=20><Client>agent ◄──────┘  (From is a phone, not "client:…")
```

### Routing and trust boundary (public demo link)
`/api/voice` **never dials a number the browser chose freely**:
- `From` starts with `client:` → outbound from our app:
  - `leadId` present → dial `LEAD_CALL_NUMBER` (our demo phone). The UI shows
    the lead's sample number; the README explains the routing.
  - else `To` (normalised to E.164) must be in `DIAL_ALLOWLIST` → dial it;
    otherwise `<Say>` "This demo can only call approved numbers" + `<Hangup/>`.
  - Always `<Dial callerId=TWILIO_PHONE_NUMBER answerOnBridge="true">` so the
    browser gets `ringing` while the callee's phone rings and `accept` on answer.
- `From` is a phone → inbound: `<Dial action="/api/voice?dialed=1" timeout="20"
  answerOnBridge="true"><Client>agent</Client></Dial>`.
- `?dialed=1` (the Dial action callback): `DialCallStatus` is `no-answer` /
  `busy` / `failed` → `<Say>` "Sorry we missed you, we'll call you back" +
  hangup; otherwise just `<Hangup/>`, so the apology never plays after a real
  conversation.
- Every request: `X-Twilio-Signature` validated with
  `twilio.validateRequest(authToken, sig, PUBLIC_BASE_URL + pathname + search, bodyParams)`.
  The URL comes from `PUBLIC_BASE_URL` (the raw scheme is `http` behind ngrok).
  Params come from the form body only, never the query. Mismatch → 403.
- The TwiML App and the number point at the **production** domain (Vercel's
  Standard Protection blocks preview URLs).
- Tokens are unauthenticated, which is acceptable: all outbound goes through the
  TwiML App, so the routing above holds. Remaining risk: someone looping calls to
  the allowlisted phone. Mitigated by a Twilio usage trigger (account setting),
  noted in the README.

### Backend: Vercel functions, Web `Request → Response`, ESM
| File | Responsibility |
|------|----------------|
| `api/token.ts` | `GET` → `{ token, identity }`: AccessToken (API key + secret), VoiceGrant `{ outgoingApplicationSid, incomingAllow: true }`, identity `agent`, ttl 3600 |
| `api/voice.ts` | `POST` → signature check → `routeCall()` → `text/xml` |
| `server/env.ts` | read + validate env; 500 naming the missing variable |
| `server/voice.ts` | pure `routeCall(params, query, env) → string` built with `twilio.twiml.VoiceResponse`; `toE164()` |
| `server/http.ts` | `publicUrl(req, env)`, form-body parsing |

Shared code lives in `server/`, outside `api/` (Vercel's current guidance).
Relative imports carry `.js` extensions (Node ESM on Vercel). `@types/node` is added.

Local dev: a ~30-line Vite plugin (`dev/api-plugin.ts`) mounts `api/*.ts` under
`/api` using the same Web-handler signature. ngrok exposes it to Twilio, and
`server.allowedHosts` includes ngrok domains. (`vercel dev` would also work but
needs the Vercel CLI login and project link before anything runs locally.)

### Frontend
| File | Responsibility |
|------|----------------|
| `src/calling/machine.ts` | pure reducer: `idle → connecting → ringing → in_call → ended → wrap_up → idle`; `idle → incoming → in_call` / `missed`; `error` |
| `src/calling/device.ts` | `PhoneDevice` interface + `createTwilioDevice()`: token fetch, `register()`, `connect({ params })`, `incoming`, `tokenWillExpire → updateToken`, `allowIncomingWhileBusy: true`, `closeProtection: true`, `destroy()` |
| `src/calling/CallProvider.tsx` | context: device + reducer + 1s timer; `useCall()` → `status` (`offline / connecting / online / error`), `call`, `goOnline / goOffline / place / accept / decline / hangup / toggleMute / digits / saveWrapUp / skipWrapUp`. Tests swap the device via `vi.mock` of `device.ts` (no prop seam needed). Destroys the device on unmount (StrictMode-safe) |
| `src/calling/callLog.ts` | localStorage log + `useCallLog()` (`useSyncExternalStore`); Recent (06) and Incoming (05) read it |
| `src/calling/CallDock.tsx` | incoming / connecting / ringing / in-call / not-connected / error UI; fixed bottom-right, bottom sheet above the tab bar on phone |
| `src/calling/DialPad.tsx` | keypad + number field; idle → dials (E.164 hint), in call → DTMF |
| `src/calling/WrapUp.tsx` | modal: summary (prefilled template), outcome chips, Skip / Save |
| `src/components/shell/TopBar.tsx` | + dial-pad button; + **Go online** pill: the click is the user gesture that runs `getUserMedia({ audio: true })` (tracks stopped right away) then `device.register()`. Shows Offline / Connecting / Online / Mic blocked |

**Go online** exists because Twilio recommends registering from a user gesture
(browser autoplay rules). It also means the mic prompt happens up front, not
while accepting a call, and visitors on the public link don't silently register
and ring.

## States & edge cases
- Mic denied (`getUserMedia` NotAllowedError or SDK error `31401`) → pill "Mic
  blocked"; dock explains how to allow it. Nothing logged.
- Token 500 (missing env) → pill "Offline" with tooltip; Place call opens the dock with the error.
- `disconnect` without a prior `accept` → **"Not connected"** (the browser can't
  tell busy from no-answer); wrap-up still offered, the agent picks the outcome.
- Second outbound while a call is live → blocked ("Finish the current call first").
- Inbound while busy → `allowIncomingWhileBusy: true` lets us see it, then
  `call.reject()` + log as missed (otherwise the SDK drops it silently).
- Caller hangs up before accept (`cancel`) → missed. Known limit: with two tabs
  online, the tab that didn't answer also logs a missed call. The demo uses one tab.
- Token expiry → `tokenWillExpire` → refetch → `device.updateToken()`.
- Reload mid-call → `closeProtection` asks first.
- DTMF only while `in_call`: 0–9 * #.
- Outbound to India from a US number may show an odd caller ID on the handset.
  Don't rely on it in the demo.

## Acceptance criteria
- [ ] Go online prompts for the mic once and the pill turns Online
- [ ] Real outbound: dial pad → allowlisted phone rings (dock shows Ringing) → two-way audio → hang up from either side
- [ ] Real lead call: `leadId` routes to `LEAD_CALL_NUMBER`
- [ ] Real inbound: calling the Twilio number rings the app; accept → talk; decline / caller hangup → missed in the log; no apology after a completed call
- [ ] Non-allowlisted `To` refused server-side; bad signature → 403
- [ ] Timer, mute and DTMF work during a call
- [ ] End → wrap-up → Save logs contact, direction, duration, outcome, summary; Skip logs without an outcome
- [ ] 390px: dock is a bottom sheet above the tab bar

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/call-machine.test.ts` | every legal transition; illegal ones are no-ops; not-connected, missed, busy-reject, error paths |
| `tests/api/voice.test.ts` | lead call → `LEAD_CALL_NUMBER`; allowlisted `To` (incl. un-normalised "098450 61245"-style input) → Dial with callerId + answerOnBridge; other `To` → refusal; inbound → `<Client>agent` with action URL; action callback: `completed` → Hangup, `no-answer`/`busy` → Say; signature valid with `PUBLIC_BASE_URL` + query string; bad/missing signature → 403; missing env → 500 |
| `tests/api/token.test.ts` | JWT identity `agent`, voice grant (app SID, incoming allowed), ttl |
| `tests/web/calling.test.tsx` | fake device: Go online; place → connecting → ringing → in call (timer) → mute → digits → end → wrap-up → save → log entry; disconnect-before-accept → not connected; incoming accept; incoming cancel → missed; incoming while busy → rejected + missed; mic denied; second call blocked |
| manual (in Verification) | real call each way on a real phone |

## Needs from the user
`npm run twilio:check` reports what's missing, read-only, with the fix for each item.
`npm run twilio:setup` does the rest: creates/updates the TwiML App, points the number at it,
turns on India geo permission, and writes the SIDs into `.env`. Re-run it whenever
`PUBLIC_BASE_URL` changes.

Only these need a human in the Twilio Console (money or credentials):
1. **Upgrade** the account (Trial banner → Upgrade, or search "Upgrade"; add the starting balance)
2. **Buy a US number** with Voice (search "Buy a number" → United States, Voice ✓)
3. **Standard API key** (Settings → Account settings → API keys & auth tokens → Create API key →
   type **Standard**). A Restricted key authenticates, but Twilio can't sign client-SDK Access
   Tokens with it (found by `twilio:check` on 2026-11-09; Twilio's Restricted-keys docs confirm).
4. Your phone(s) in `.env`: `LEAD_CALL_NUMBER`, `DIAL_ALLOWLIST` (E.164)

## Review
**2026-11-09 · rev 1 → independent reviewer subagent** (checked against Twilio
and Vercel docs and the `@twilio/voice-sdk` 2.18.5 typings). Verdict: approve
with fixes. All applied above:
- BLOCKER: trial blocks `<Dial><Number>/<Client>` and `<Stream>`. Now a paid
  account + US number (D14). I confirmed this myself on the Twilio trial page.
- `enableRingingState` was removed in v2; ringing is always on with `answerOnBridge`.
- Busy inbound is dropped silently by default, so `allowIncomingWhileBusy` + explicit reject.
- Inbound `<Dial>` without an `action` would play the apology after every call,
  so there's now an action callback that branches on `DialCallStatus`.
- Browser can't see busy vs no-answer, so one "Not connected" state.
- Signature URL from `PUBLIC_BASE_URL` (ngrok scheme), body-only params, prod domain only.
- Register from a user gesture → "Go online"; destroy the device on cleanup (StrictMode, multi-tab).
- ESM `.js` imports, shared code in `server/`, `@types/node`.
- `VoiceResponse` builder instead of hand-written XML; E.164 normalisation;
  `closeProtection`; extra tests for the action branch, signature URL, busy-reject.
- flow.md drift (connect params, routing, ringing/ended states) is fixed in flow.md.

## Verification
2026-11-09 · automated
- `npm test`: 84/84. 29 API tests (routing, E.164, signature incl. query string +
  proxy origin + tampered body, Dial action branch, token claims, missing env),
  17 state-machine tests, 12 UI tests driving a fake Twilio device through
  every path (outbound lifecycle, timer, not connected, hang-up while dialling,
  pre-connect failure, second call blocked, go online/offline, mic blocked,
  inbound accept/cancel/decline, busy reject).
- Lint and build clean; the Twilio SDK is a lazy 178 kB chunk, not in the main bundle.

2026-11-09 · Chrome (no credentials yet)
- Dev API plugin: `/api/token` → 500 naming the 4 missing vars; unknown `/api/*` → 404
  (it fell through to `index.html` with 200 before the fix).
- Dial pad: opens from the top bar, typed number → Enter → toast with the server's
  missing-env message. Nothing fails silently.
- Fixed: focus stayed on the dial button when the popover opened, so typing a space
  closed it again. The input now takes focus on the popover's `toggle` event.
- Fixed: `.dialPop` width lost to `.popover` (same specificity, later rule).

2026-11-09 · rev 3 (trial-compatible)
- `npm test`: 228/228. Server: TwiML builders, every webhook branch (lead → ring into room, refused,
  Twilio refusal → spoken reason, pickup with/without callers, inbound → queue, PSTN leg done →
  agent freed, room leave/end → both legs ended, join ignored, non-SID query ignored, wait/left,
  forged/missing/tampered-query signatures → 403), /api/queue (list, decline only queued calls,
  bad body, Twilio failure → 502), /api/room. Browser: room polling (ringing → on call, stops once
  connected), queue polling (ring, pickup not counted as missed, caller leaves → missed, decline →
  server + not re-rung, busy agent → caller waits then rings).
- Live, through ngrok against the real trial account: REST call to the verified Indian phone
  answered (23s); signed callback → TwiML, forged → 403; /api/queue and /api/room read the real
  account; `twilio:check` all green except "Trial", which is now by design.

**Previously pending (needs the user's Twilio setup):** real outbound, lead routing, inbound
ring/accept/missed, DTMF and mute on a live call, the 390px dock.
