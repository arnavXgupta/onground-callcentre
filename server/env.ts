/** Read required env vars, failing with the names (never values) of any that are missing. */
export class MissingEnvError extends Error {}

export function requireEnv<K extends string>(keys: readonly K[], source: NodeJS.ProcessEnv = process.env): Record<K, string> {
  const missing = keys.filter((k) => !source[k])
  if (missing.length) throw new MissingEnvError(`Server is missing env: ${missing.join(', ')}`)
  return Object.fromEntries(keys.map((k) => [k, source[k]!])) as Record<K, string>
}
