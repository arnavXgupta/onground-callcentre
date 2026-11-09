import { useEffect, useState } from 'react'

/** Current time, re-rendering every `everyMs` while `ticking` (call timer, queue waits). */
export function useNow(ticking = true, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ticking) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [ticking, everyMs])
  return now
}
