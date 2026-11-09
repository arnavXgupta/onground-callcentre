import { useEffect, useRef, useState } from 'react'
import { IconBackspace, IconPhone } from '@tabler/icons-react'
import s from './Calling.module.css'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

export function Keypad({ onKey, dark }: { onKey: (key: string) => void; dark?: boolean }) {
  return (
    <div className={`${s.keypad} ${dark ? s.keypadDark : ''}`}>
      {KEYS.map((k) => (
        <button key={k} type="button" onClick={() => onKey(k)} aria-label={`Key ${k}`}>
          {k}
        </button>
      ))}
    </div>
  )
}

/** Free dialling. The server only connects numbers on its allowlist (docs/03-calling.md). */
export default function DialPad({ onCall }: { onCall: (number: string) => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Opened inside a popover: put the cursor in the number field so the agent can just type.
  useEffect(() => {
    const input = inputRef.current
    const popover = input?.closest('[popover]')
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === 'open') input?.focus()
    }
    popover?.addEventListener('toggle', onToggle)
    return () => popover?.removeEventListener('toggle', onToggle)
  }, [])

  // Loose client check for enabling the button; the server normalises to E.164 and decides.
  const valid = value.replace(/\D/g, '').length >= 10

  return (
    <form
      className={s.dialpad}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onCall(value.trim())
        setValue('')
      }}
    >
      <input
        ref={inputRef}
        className={`${s.number} tnum`}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d+*# ()-]/g, ''))}
        placeholder="+91 98450 61245"
        aria-label="Phone number"
        inputMode="tel"
        autoComplete="tel"
      />
      <Keypad onKey={(k) => setValue((v) => v + k)} />
      <div className={s.dialRow}>
        <span />
        <button type="submit" className={s.callBtn} disabled={!valid} aria-label="Call">
          <IconPhone size={22} />
        </button>
        <button type="button" className={s.backspace} onClick={() => setValue((v) => v.slice(0, -1))} disabled={!value} aria-label="Delete digit">
          <IconBackspace size={20} />
        </button>
      </div>
      <p className={s.hint}>Demo line: only approved numbers connect.</p>
    </form>
  )
}
