/**
 * The URL Twilio signed. Built from PUBLIC_BASE_URL because behind ngrok/Vercel the
 * request's own scheme/host can differ from what Twilio called. Query string included.
 */
export function publicUrl(request: Request, base: string): string {
  const { pathname, search } = new URL(request.url)
  return base.replace(/\/+$/, '') + pathname + search
}

/** Twilio webhooks are form-encoded. Only the body counts as params (never the query). */
export async function readForm(request: Request): Promise<Record<string, string>> {
  return Object.fromEntries(new URLSearchParams(await request.text()))
}
