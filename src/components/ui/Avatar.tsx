import { avatarTint } from '../../lib/format'
import s from './ui.module.css'

export default function Avatar({ name, initials, size }: { name: string; initials?: string; size?: number }) {
  const text = initials ?? name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className={s.avatar} data-tint={avatarTint(name)} style={size ? { width: size, height: size } : undefined} aria-hidden="true">
      {text}
    </span>
  )
}
