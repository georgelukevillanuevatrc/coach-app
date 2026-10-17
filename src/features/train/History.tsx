import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { Trophy } from 'lucide-react'
import { db } from '../../lib/db'
import { card } from './ui'
import { fmtKg, usePRs, type Day, type Ex, type TrainData } from './data'

export default function History({ sessions, exercises }: { sessions: TrainData['sessions']; exercises: Ex[] }) {
  const prs = usePRs()
  const name = (id: number) => exercises.find((e) => e.id === id)?.name ?? 'Exercise'
  const logs = useLiveQuery(() => db.set_logs.toArray(), [])
  const dayNames = useLiveQuery(async () => new Map(((await db.plan_days.toArray()) as Day[]).map((d) => [d.id, d.name])), [])
  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase text-muted">Personal records</h2>
        {prs && prs.length > 0 ? (
          <ul className={`${card} divide-y divide-line`}>
            {[...prs].sort((a, b) => b.e1rm - a.e1rm).map((p) => (
              <li key={p.exercise_id} className="flex min-h-14 items-center justify-between px-4 py-2">
                <span><span className="block">{name(p.exercise_id)}</span><span className="text-xs text-muted">{format(parseISO(p.date), 'MMM d, yyyy')}</span></span>
                <span className="font-semibold tabular-nums">{fmtKg(p.weight_kg)} x {p.reps}</span>
              </li>
            ))}
          </ul>
        ) : <p className={`${card} p-4 text-sm text-muted`}>Finish a workout and your best sets show up here.</p>}
      </section>
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase text-muted">Sessions</h2>
        {sessions.length === 0 && <p className={`${card} p-4 text-sm text-muted`}>No finished sessions yet.</p>}
        <ul className="space-y-3">
          {sessions.map((s) => {
            const sl = (logs ?? []).filter((l) => l.session_id === s.id)
            const volume = sl.reduce((a, l) => a + l.weight_kg * l.reps, 0)
            const byEx = [...new Set(sl.map((l) => l.exercise_id))]
            const mins = Math.max(1, Math.round(((s.finished_at ?? s.started_at) - s.started_at) / 60000))
            return (
              <li key={s.id} className={`${card} p-4`}>
                <div className="flex items-baseline justify-between">
                  <b>{dayNames?.get(s.plan_day_id) ?? 'Workout'}</b>
                  <span className="text-xs text-muted">{format(parseISO(s.date), 'EEE, MMM d')}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{sl.length} sets · {Math.round(volume).toLocaleString()} kg volume · {mins} min</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {byEx.map((id) => {
                    const es = sl.filter((l) => l.exercise_id === id)
                    return (
                      <li key={id} className="flex justify-between gap-2">
                        <span className="truncate">{name(id)}</span>
                        <span className="flex shrink-0 items-center gap-1 text-muted tabular-nums">
                          {es.some((l) => l.is_pr) && <Trophy size={14} className="text-fat" aria-label="PR" />}
                          {es.map((l) => `${l.weight_kg}x${l.reps}`).join('  ')}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
