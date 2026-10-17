import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO, startOfISOWeek, subDays } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { db } from '../../lib/db'
import { todayStr } from '../../lib/dates'
import type { WeightLog } from '../../lib/types'
import { goalProgress, movingAverage, projectGoalDate, trendAt, weeklyRate } from '../../coach/trend'
import { isDeloadWeek, weekIndex } from '../../coach/progression'
import { countWeeksOffTarget, suggestCheckin, targetWeeklyRate } from '../../coach/checkin'
import WeightSheet from './WeightSheet'
import WeightChart from './WeightChart'
import CheckinCard from './CheckinCard'
import PhotosSection from './PhotosSection'

const fmtDate = (d: string, f = 'MMM d') => format(parseISO(d), f)

export default function Progress() {
  const today = todayStr()
  const [sheet, setSheet] = useState<{ open: boolean; entry?: WeightLog }>({ open: false })

  const data = useLiveQuery(async () => {
    const [weights, profile, targets, foodLogs, sessions, checkins, plan] = await Promise.all([
      db.weight_logs.orderBy('date').toArray(),
      db.profile.get(1),
      db.targets.orderBy('effective_from').toArray(),
      db.food_logs.where('date').between(format(subDays(parseISO(today), 6), 'yyyy-MM-dd'), today, true).toArray(),
      db.workout_sessions.where('date').between(format(subDays(parseISO(today), 6), 'yyyy-MM-dd'), today, true).toArray(),
      db.checkins.orderBy('week_start').toArray(),
      db.plans.where('status').equals('active').first(),
    ])
    return { weights, profile, targets, foodLogs, sessions, checkins, plan }
  }, [today])

  const calc = useMemo(() => {
    if (!data) return null
    const { weights, profile, targets, foodLogs, sessions, checkins, plan } = data
    const points = movingAverage(weights)
    const latestTrendPt = [...points].reverse().find((p) => p.trend != null)
    const trendNow = latestTrendPt?.trend ?? null
    const rate = weeklyRate(points)
    const goalKg = profile?.goal_weight_kg
    const eta = goalKg != null ? projectGoalDate(trendNow, goalKg, rate, today) : null
    const startKg = weights[0]?.weight_kg ?? profile?.weight_kg
    const nowKg = trendNow ?? weights[weights.length - 1]?.weight_kg
    const progress = goalKg != null && startKg != null && nowKg != null ? goalProgress(startKg, nowKg, goalKg) : null
    // latest targets in effect (ties by id)
    const eff = targets.filter((t) => t.effective_from <= today)
    const cur = (eff.length ? eff : targets).slice().sort((a, b) => a.effective_from.localeCompare(b.effective_from) || (a.id ?? 0) - (b.id ?? 0)).pop()
    // adherence, last 7 days
    const daysLogged = new Set(foodLogs.map((f) => f.date)).size
    const workouts = new Set(sessions.filter((s) => s.finished_at).map((s) => s.date)).size
    const protByDay = new Map<string, number>()
    foodLogs.forEach((f) => protByDay.set(f.date, (protByDay.get(f.date) ?? 0) + f.protein_g))
    const proteinDays = cur ? [...protByDay.values()].filter((p) => p >= cur.protein_g * 0.9).length : 0
    const trainDays = profile?.training_days ?? 3
    const adherence = (daysLogged / 7 + proteinDays / 7 + Math.min(1, workouts / trainDays)) / 3
    // check-in
    const weekStart = format(startOfISOWeek(parseISO(today)), 'yyyy-MM-dd')
    const doneThisWeek = checkins.find((c) => c.week_start === weekStart)
    let suggestion = null
    let prevTrend: number | null = null
    if (profile && cur) {
      const weekly = [0, 7, 14, 21].map((d) => trendAt(points, format(subDays(parseISO(today), d), 'yyyy-MM-dd')))
      prevTrend = weekly[1]
      const target = targetWeeklyRate(profile.goal_type, profile.goal_pace, cur.calories)
      suggestion = suggestCheckin({
        trendNow: weekly[0], trendPrev: weekly[1], goalType: profile.goal_type, goalPace: profile.goal_pace,
        weightKg: nowKg ?? profile.weight_kg, currentCalories: cur.calories, adherence,
        weeksOffTarget: countWeeksOffTarget(weekly, target),
        deloadDue: plan ? isDeloadWeek(weekIndex(plan.start_date, today)) : false,
      })
    }
    const due = !!suggestion && trendNow != null && prevTrend != null && !doneThisWeek
    return { points, trendNow, rate, goalKg, eta, progress, cur, daysLogged, workouts, proteinDays, adherence, weekStart, suggestion, due, doneThisWeek, trainDays }
  }, [data, today])

  if (!data || !calc) return <div className="p-4 text-muted">Loading...</div>
  const { weights, profile } = data
  const last = weights[weights.length - 1]
  const chartPts = calc.points.slice(-60)
  const sorted = weights.slice().reverse()

  const remove = async (w: WeightLog) => {
    if (w.id != null && window.confirm(`Delete the ${fmtDate(w.date)} entry?`)) await db.weight_logs.delete(w.id)
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Progress</h1>
        <button type="button" onClick={() => setSheet({ open: true })}
          className="flex min-h-11 items-center gap-1 rounded-full bg-accent px-4 font-semibold text-white">
          <Plus size={18} /> Weight
        </button>
      </div>

      {!profile && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <p className="text-sm">Set up your profile and goal to see progress toward your goal weight.</p>
          <Link to="/me" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 font-semibold text-white">Go to Me</Link>
        </section>
      )}

      {calc.due && calc.suggestion && calc.trendNow != null && (
        <CheckinCard key={calc.weekStart} suggestion={calc.suggestion} weekStart={calc.weekStart} today={today}
          trendNow={calc.trendNow} adherence={calc.adherence} targets={calc.cur} />
      )}
      {calc.doneThisWeek && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
          This week's check-in is {calc.doneThisWeek.accepted ? 'done' : 'set aside for now'}. Next one is due Monday.
        </p>
      )}

      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Trend" value={calc.trendNow != null ? `${calc.trendNow.toFixed(1)} kg` : 'n/a'} />
          <Stat label="Per week" value={calc.rate != null ? `${calc.rate > 0 ? '+' : ''}${calc.rate.toFixed(2)} kg` : 'n/a'} />
          <Stat label="Goal ETA" value={calc.eta ? fmtDate(calc.eta, 'MMM d, yy') : 'n/a'} />
        </div>
        {calc.trendNow == null && <p className="mt-2 text-center text-xs text-muted">The trend appears after 4 weigh-ins within a week.</p>}
        {profile && calc.progress != null && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{last ? `${last.weight_kg} kg now` : ''}</span><span>Goal {profile.goal_weight_kg} kg</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(calc.progress * 100)}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-muted">{Math.round(calc.progress * 100)}% of the way</p>
          </div>
        )}
        <div className="mt-3"><WeightChart points={chartPts} goalKg={profile?.goal_weight_kg} /></div>
        <p className="text-center text-xs text-muted">Dots are daily weights. The blue line is your 7-day trend.</p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-semibold">Last 7 days</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Days logged" value={`${calc.daysLogged}/7`} />
          <Stat label="Workouts" value={`${calc.workouts}/${calc.trainDays}`} />
          <Stat label="Protein hit" value={calc.cur ? `${calc.proteinDays}/7` : 'n/a'} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card">
        <h2 className="px-4 pt-4 text-base font-semibold">Entries</h2>
        {sorted.length === 0 && <p className="p-4 text-sm text-muted">No weigh-ins yet. Tap Weight to add your first one.</p>}
        <ul className="divide-y divide-line">
          {sorted.slice(0, 60).map((w) => (
            <li key={w.id} className="flex items-center gap-2 px-4 py-1">
              <div className="min-w-0 flex-1 py-2">
                <div className="font-medium tabular-nums">{w.weight_kg} kg
                  {w.waist_cm != null && <span className="ml-2 text-sm text-muted">waist {w.waist_cm} cm</span>}</div>
                <div className="truncate text-xs text-muted">{fmtDate(w.date, 'EEE, MMM d')}{w.note ? ` - ${w.note}` : ''}</div>
              </div>
              <button type="button" aria-label="Edit entry" onClick={() => setSheet({ open: true, entry: w })}
                className="flex size-11 items-center justify-center rounded-full text-muted"><Pencil size={18} /></button>
              <button type="button" aria-label="Delete entry" onClick={() => remove(w)}
                className="flex size-11 items-center justify-center rounded-full text-muted"><Trash2 size={18} /></button>
            </li>
          ))}
        </ul>
      </section>

      <PhotosSection />

      <WeightSheet open={sheet.open} entry={sheet.entry} date={today} defaultKg={last?.weight_kg ?? profile?.weight_kg}
        onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
