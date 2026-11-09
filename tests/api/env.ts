import { afterEach, beforeEach } from 'vitest'

export const TEST_ENV = {
  TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
  TWILIO_AUTH_TOKEN: 'test-auth-token',
  TWILIO_API_KEY_SID: 'SK00000000000000000000000000000000',
  TWILIO_API_KEY_SECRET: 'test-api-secret',
  TWILIO_TWIML_APP_SID: 'AP00000000000000000000000000000000',
  TWILIO_PHONE_NUMBER: '+14155550100',
  PUBLIC_BASE_URL: 'https://demo.example.com',
  LEAD_CALL_NUMBER: '+919800000001',
  DIAL_ALLOWLIST: '+919800000002, 98000 00003',
}

/** Install TEST_ENV for each test and restore the real env afterwards. */
export function useTestEnv() {
  const saved = { ...process.env }
  beforeEach(() => {
    Object.assign(process.env, TEST_ENV)
  })
  afterEach(() => {
    process.env = { ...saved }
  })
}
