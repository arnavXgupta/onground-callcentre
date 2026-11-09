import { Bar, BarChart, Cell, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import s from './Dashboard.module.css'

interface Props {
  title: string
  labels: string[]
  values: number[]
  unit?: string
  /** bar colour, and the stronger shade used for today */
  color: string
  strong: string
  /** trends read better as a line; counts per day stay bars */
  line?: boolean
}

/** 7-day bar chart. The sr-only table carries the same numbers for screen readers (and tests). */
export default function WeekChart({ title, labels, values, unit = '', color, strong, line = false }: Props) {
  const data = labels.map((day, i) => ({ day, value: values[i] }))
  const last = data.length - 1
  const axis = <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-subtle)' }} />
  const labelStyle = { fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }

  return (
    <figure className={s.chart}>
      <figcaption className={s.eyebrow}>{title}</figcaption>
      {line ? (
        <LineChart responsive data={data} margin={{ top: 22, right: 16, bottom: 0, left: 16 }} style={{ width: '100%', height: 170 }} aria-hidden="true">
          {axis}
          <YAxis hide domain={['dataMin - 4', 'dataMax + 2']} />
          <Line dataKey="value" stroke={strong} strokeWidth={2.5} dot={{ r: 3, fill: 'var(--surface)', stroke: strong, strokeWidth: 2 }} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" offset={10} formatter={(v) => `${v}${unit}`} style={labelStyle} />
          </Line>
        </LineChart>
      ) : (
        <BarChart responsive data={data} margin={{ top: 22, right: 0, bottom: 0, left: 0 }} style={{ width: '100%', height: 170 }} aria-hidden="true">
          {axis}
          <Bar dataKey="value" radius={[6, 6, 2, 2]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.day} fill={i === last ? strong : color} />
            ))}
            <LabelList dataKey="value" position="top" formatter={(v) => `${v}${unit}`} style={labelStyle} />
          </Bar>
        </BarChart>
      )}
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
