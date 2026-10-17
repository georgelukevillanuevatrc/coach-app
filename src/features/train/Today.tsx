import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { todayStr } from '../../lib/dates'
import { isDeloadWeek, weekIndex } from '../../coach/progression'
import { loadDraft } from './Logger'
import { btnPrimary, card } from './ui'
import { nextDay, type TrainData } from './data'

export default function TodayTab({ data }: { data: TrainData }) {
  const { days, sessions, exercises, plan } = data
  const draft = loadDraft()
  const resume = draft ? days.find((d) => d.id === draft.dayId) : undefined
  const day = resume ?? nextDay(days, sessions)
  if (!day) return <p className={`${card} p-4 text-muted`}>No plan yet.</p>
  const name = (id: number) => exercises.find((e) => e.id === id)?.name ?? 'Exercise'
  const doneToday = sessions.some((s) => s.date === todayStr())
  const deload = !!plan && isDeloadWeek(weekIndex(plan.start_date, todayStr()))
  return (
    <div className="space-y-3">
      {deload && <p className="rounded-2xl bg-carbs/15 p-4 text-sm">Deload week. You will do about 60% of the usual sets. Keep the weights, move well, recover.</p>}
      <section className={`${card} p-4`}>
        <p className="text-xs font-semibold uppercase text-muted">{resume ? 'In progress' : doneToday ? 'Done today. Next up' : "Today's session"}</p>
        <h2 className="mt-1 text-2xl font-bold">{day.name}</h2>
        <ul className="mt-3 divide-y divide-line">
          {day.exercises.map((e, i) => (
            <li key={i} className="flex min-h-11 items-center justify-between gap-2 text-sm"><span className="truncate">{name(e.exercise_id)}</span><span className="shrink-0 text-muted tabular-nums">{e.sets} x {e.rep_min}-{e.rep_max}</span></li>
          ))}
        </ul>
        <Link to={`workout/${day.id}`} className={`${btnPrimary} mt-4 flex w-full items-center justify-center gap-2`}><Play size={18} />{resume ? 'Resume workout' : 'Start workout'}</Link>
      </section>
    </div>
  )
}
