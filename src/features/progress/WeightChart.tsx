import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendPoint } from '../../coach/trend'

export default function WeightChart({ points, goalKg }: { points: TrendPoint[]; goalKg?: number }) {
  if (points.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Log a couple of weigh-ins to see your chart.</p>
  }
  const data = points.map((p) => ({ date: p.date, weight: p.weight_kg, trend: p.trend }))
  const vals = data.flatMap((d) => [d.weight, d.trend ?? d.weight]).concat(goalKg != null ? [goalKg] : [])
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1)
  return (
    <div className="h-56 w-full" role="img" aria-label="Weight chart with 7 day trend line">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(d: string) => format(parseISO(d), 'MMM d')}
            minTickGap={32} stroke="var(--line)" />
          <YAxis domain={[lo, hi]} tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--line)" width={44} />
          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }}
            labelFormatter={(d) => format(parseISO(String(d)), 'EEE, MMM d')}
            formatter={(v, name) => [`${v} kg`, name === 'trend' ? '7-day trend' : 'Weight']} />
          <Line type="monotone" dataKey="weight" stroke="none" isAnimationActive={false}
            dot={{ r: 3, fill: 'var(--muted)', stroke: 'none' }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="trend" stroke="var(--accent)" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
