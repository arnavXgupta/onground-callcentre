// Checks (and with --apply, fixes) everything the calling feature needs on the Twilio account.
//
//   npm run twilio:check   read-only report: what's ready, what's missing, how to fix it
//   npm run twilio:setup   also: creates/updates the TwiML App, points the number at it,
//                          allows calls to India, and writes the SIDs into .env
//
// Re-run twilio:setup whenever PUBLIC_BASE_URL changes (new ngrok URL, Vercel deploy):
// the number follows the TwiML App, so only the app's URL has to move.
// Never prints secrets. Never buys anything (numbers and upgrades are your call, in the console).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import twilio from 'twilio'

const ENV_FILE = existsSync('.env.local') ? '.env.local' : '.env'
process.loadEnvFile(ENV_FILE)
const env = process.env
const APPLY = process.argv.includes('--apply')
const APP_NAME = 'OnGround Call Centre'

let problems = 0
const ok = (m: string) => console.log(`  ✓ ${m}`)
const todo = (m: string, fix: string) => {
  problems++
  console.log(`  ✗ ${m}\n      → ${fix}`)
}
const note = (m: string) => console.log(`  · ${m}`)
const isE164 = (n?: string) => !!n && /^\+[1-9]\d{7,14}$/.test(n)

/** Set KEY=value in the env file, keeping every other line as it is. */
function writeEnv(key: string, value: string) {
  const text = readFileSync(ENV_FILE, 'utf8')
  const line = `${key}=${value}`
  const next = new RegExp(`^${key}=.*$`, 'm').test(text)
    ? text.replace(new RegExp(`^${key}=.*$`, 'm'), line)
    : `${text.trimEnd()}\n${line}\n`
  writeFileSync(ENV_FILE, next)
  env[key] = value
  note(`wrote ${key} to ${ENV_FILE}`)
}

async function main() {
  console.log(`Twilio setup ${APPLY ? '(apply)' : '(check only)'} · reading ${ENV_FILE}\n`)

  // 1 · credentials + account type
  console.log('Account')
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token } = env
  if (!sid || !token) {
    todo('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing', 'Console home → "Account Info" box → copy both into .env')
    return
  }
  const client = twilio(sid, token)
  const account = await client.api.v2010.accounts(sid).fetch()
  ok(`signed in as "${account.friendlyName}" (${account.status})`)
  // Trial is supported (D18: conference + queue routing); it only limits who can be called.
  if (account.type === 'Trial') note('Trial account: verified numbers only, callers hear a "press any key" notice first')
  else ok('account is upgraded (Full)')

  // 2 · API key used by /api/token
  if (!env.TWILIO_API_KEY_SID || !env.TWILIO_API_KEY_SECRET) {
    todo('API key missing', 'Console → Admin → API keys & tokens → Create API key (Standard) → copy SID + Secret into .env')
  } else {
    try {
      // Standard keys can't read the Account resource itself, so probe an endpoint they can use.
      await twilio(env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, { accountSid: sid }).applications.list({ limit: 1 })
      ok('API key works (Standard)')
    } catch (e) {
      // 8021 = authenticated but missing a permission: a Restricted key. Twilio can't sign
      // client-SDK Access Tokens with Restricted keys, so the browser phone would never connect.
      if ((e as { code?: number }).code === 8021) {
        todo("this API key is a Restricted key: Twilio can't sign browser-phone tokens with it", 'Console → Admin → API keys & tokens → Create API key → Key type: Standard → paste the new SID + Secret')
      } else {
        todo('API key is rejected (wrong SID or secret)', 'Create a new Standard API key and paste its SID (SK…) and Secret again')
      }
    }
  }

  // 3 · phone number
  console.log('\nPhone number')
  const numbers = (await client.incomingPhoneNumbers.list({ limit: 50 })).filter((n) => n.capabilities?.voice)
  if (!env.TWILIO_PHONE_NUMBER && numbers.length === 1 && APPLY) writeEnv('TWILIO_PHONE_NUMBER', numbers[0].phoneNumber)
  const number = numbers.find((n) => n.phoneNumber === env.TWILIO_PHONE_NUMBER)
  if (!numbers.length) {
    todo('no voice-capable number on the account', 'Console → Phone Numbers → Manage → Buy a number → Country: United States, Voice ✓ → Buy')
  } else if (!number) {
    todo(
      `TWILIO_PHONE_NUMBER doesn't match a number you own (you own: ${numbers.map((n) => n.phoneNumber).join(', ')})`,
      'Put one of those in TWILIO_PHONE_NUMBER (E.164, e.g. +14155550100)',
    )
  } else {
    ok(`using ${number.phoneNumber}`)
    if (number.phoneNumber.startsWith('+91')) {
      todo('this is an Indian number: Twilio only calls India from international numbers', 'Buy a US number instead')
    }
  }

  // 4 · where Twilio should send calls
  console.log('\nPublic URL')
  const base = env.PUBLIC_BASE_URL?.replace(/\/+$/, '')
  const voiceUrl = base ? `${base}/api/voice` : ''
  if (!base || !base.startsWith('https://')) {
    todo('PUBLIC_BASE_URL is not an https URL', 'Run `npm run dev` and `ngrok http 3000`, put the https URL ngrok prints into PUBLIC_BASE_URL')
  } else {
    ok(`webhooks will go to ${voiceUrl}`)
    try {
      const res = await fetch(`${base}/api/token`, { headers: { 'ngrok-skip-browser-warning': '1' } })
      if (res.ok) ok('app is reachable at that URL and issues tokens')
      else todo(`${base}/api/token answered HTTP ${res.status}`, 'Check the dev server is running and .env is complete, then restart `npm run dev`')
    } catch {
      todo(`can't reach ${base}`, 'Is ngrok running and pointing at port 3000?')
    }
  }

  // 5 · TwiML App: browser calls hit its Voice URL
  console.log('\nTwiML App')
  let app = env.TWILIO_TWIML_APP_SID
    ? await client.applications(env.TWILIO_TWIML_APP_SID).fetch().catch(() => undefined)
    : (await client.applications.list({ friendlyName: APP_NAME, limit: 1 }))[0]
  if (app && voiceUrl && (app.voiceUrl !== voiceUrl || app.voiceMethod !== 'POST') && APPLY) {
    app = await client.applications(app.sid).update({ voiceUrl, voiceMethod: 'POST' })
    note(`pointed "${app.friendlyName}" at ${voiceUrl}`)
  }
  if (!app && voiceUrl && APPLY) {
    app = await client.applications.create({ friendlyName: APP_NAME, voiceUrl, voiceMethod: 'POST' })
    note(`created TwiML App "${APP_NAME}"`)
  }
  if (app && APPLY && env.TWILIO_TWIML_APP_SID !== app.sid) writeEnv('TWILIO_TWIML_APP_SID', app.sid)
  if (!app) todo('no TwiML App yet', 'Fix the public URL, then run `npm run twilio:setup` to create it')
  else if (app.voiceUrl !== voiceUrl) todo(`"${app.friendlyName}" points at ${app.voiceUrl || 'nothing'}`, 'Run `npm run twilio:setup`')
  else ok(`"${app.friendlyName}" → ${app.voiceUrl}`)

  // 6 · inbound: the number rings whatever the TwiML App says
  console.log('\nInbound calls')
  if (number && app) {
    if (number.voiceApplicationSid !== app.sid && APPLY) {
      await client.incomingPhoneNumbers(number.sid).update({ voiceApplicationSid: app.sid })
      note(`${number.phoneNumber} now uses "${app.friendlyName}" for incoming calls`)
    } else if (number.voiceApplicationSid !== app.sid) {
      todo(`${number.phoneNumber} isn't using the TwiML App for incoming calls`, 'Run `npm run twilio:setup`')
    } else ok(`${number.phoneNumber} → "${app.friendlyName}"`)
  } else note('waiting on the number and the TwiML App')

  // 7 · geo permissions: allow dialling India
  console.log('\nCalling India')
  const india = await client.voice.v1.dialingPermissions.countries.list({ isoCode: 'IN', limit: 1 })
  if (india[0]?.lowRiskNumbersEnabled) ok('voice geo permission for India is on')
  else if (APPLY) {
    await client.voice.v1.dialingPermissions.bulkCountryUpdates.create({
      updateRequest: JSON.stringify([{ iso_code: 'IN', low_risk_numbers_enabled: 'true' }]),
    })
    note('turned on voice geo permission for India')
  } else todo('calls to India are not allowed yet', 'Run `npm run twilio:setup` (or Console → Voice → Settings → Geo permissions → India)')

  // 8 · who the demo may call
  console.log('\nDemo phones')
  if (isE164(env.LEAD_CALL_NUMBER)) ok(`"Place call" on any lead rings ${env.LEAD_CALL_NUMBER}`)
  else todo('LEAD_CALL_NUMBER not set', 'Your mobile in E.164, e.g. +919812345678: every lead call rings this phone')
  const allow = (env.DIAL_ALLOWLIST ?? '').split(',').map((n) => n.trim()).filter(Boolean)
  if (allow.length && allow.every(isE164)) ok(`dial pad may call: ${allow.join(', ')}`)
  else todo('DIAL_ALLOWLIST not set (or not E.164)', 'Comma-separated numbers the dial pad may call, e.g. +919812345678,+919876500000')

  console.log(problems ? `\n${problems} thing(s) left to do.` : '\nAll set. Click "Go online" in the app and place a call.')
  process.exitCode = problems ? 1 : 0
}

main().catch((e) => {
  console.error(`\nTwilio said: ${e.message ?? e}`)
  process.exitCode = 1
})
