import { Bar, BarChart, Cell, LabelList, XAxis } from 'recharts'
import s from './Dashboard.module.css'

interface Props {
  title: string
  labels: string[]
  values: number[]
  unit?: string
  /** bar colour, and the stronger shade used for today */
  color: string
  strong: string
}

/** 7-day bar chart. The sr-only table carries the same numbers for screen readers (and tests). */
export default function WeekChart({ title, labels, values, unit = '', color, strong }: Props) {
  const data = labels.map((day, i) => ({ day, value: values[i] }))
  const last = data.length - 1

  return (
    <figure className={s.chart}>
      <figcaption className={s.eyebrow}>{title}</figcaption>
      <BarChart responsive data={data} margin={{ top: 22, right: 0, bottom: 0, left: 0 }} style={{ width: '100%', height: 170 }} aria-hidden="true">
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-subtle)' }} />
        <Bar dataKey="value" radius={[6, 6, 2, 2]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.day} fill={i === last ? strong : color} />
          ))}
          <LabelList dataKey="value" position="top" formatter={(v) => `${v}${unit}`} style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }} />
        </Bar>
      </BarChart>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>
                {d.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
