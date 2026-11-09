# 03 · Calling: browser softphone ↔ real phone

**Status:** built: automated + browser checks pass; live phone calls pending Twilio credentials
**Brief:** **required** ("CALLING FEATURE working … real call to a telephone number")

## Goal
The agent places and receives real phone calls from the browser: click a
number → a real phone rings → both people talk; a real phone dials our number →
the app rings → agent answers. Ends in a wrap-up that logs the call.

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

**Pending (needs the user's Twilio setup):** real outbound, lead routing, inbound
ring/accept/missed, DTMF and mute on a live call, the 390px dock.
