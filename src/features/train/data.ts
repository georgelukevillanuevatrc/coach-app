import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { todayStr } from '../../lib/dates'
import { generatePlan, type InjuryFlag } from '../../coach/plan'
import { bestSet, est1RM, type SetLite } from '../../coach/progression'
import type { Exercise, Plan, PlanDay, Profile, SetLog, WorkoutSession } from '../../lib/types'

export type Ex = Exercise & { id: number }
export type Day = PlanDay & { id: number }

export interface TrainData {
  profile: Profile | null
  exercises: Ex[]
  plan: (Plan & { id: number }) | null
  days: Day[]
  sessions: (WorkoutSession & { id: number })[]
  flags: InjuryFlag[]
}

export function useTrain(): TrainData | undefined {
  return useLiveQuery(async () => {
    const profile = (await db.profile.get(1)) ?? null
    const exercises = (await db.exercises.toArray()) as Ex[]
    const plan = ((await db.plans.where('status').equals('active').first()) as TrainData['plan']) ?? null
    const days = plan ? (((await db.plan_days.where('plan_id').equals(plan.id).toArray()) as Day[]).sort((a, b) => a.day_index - b.day_index)) : []
    const sessions = ((await db.workout_sessions.orderBy('started_at').toArray().catch(() => db.workout_sessions.toArray())) as TrainData['sessions'])
      .filter((s) => s.finished_at).sort((a, b) => b.started_at - a.started_at)
    const flags = profile && exercises.length ? generatePlan(profile, exercises).flags : []
    return { profile, exercises, plan, days, sessions, flags }
  }, [])
}

/** Archive any active plan and create a fresh one from the profile. */
export async function createPlan(profile: Profile) {
  const exercises = await db.exercises.toArray()
  const g = generatePlan(profile, exercises, todayStr())
  await db.transaction('rw', db.plans, db.plan_days, async () => {
    await db.plans.where('status').equals('active').modify({ status: 'archived' })
    const id = (await db.plans.add(g.plan)) as number
    await db.plan_days.bulkAdd(g.days.map((d) => ({ ...d, plan_id: id })))
  })
}

export function nextDay(days: Day[], sessions: TrainData['sessions']): Day | undefined {
  if (!days.length) return undefined
  const ids = new Set(days.map((d) => d.id))
  const last = sessions.find((s) => ids.has(s.plan_day_id))
  if (!last) return days[0]
  const i = days.findIndex((d) => d.id === last.plan_day_id)
  return days[(i + 1) % days.length]
}

export interface LastInfo { date: string | null; sets: SetLite[] }

/** Sets from the latest finished session containing this exercise. */
export async function lastSession(exerciseId: number): Promise<LastInfo> {
  const logs = await db.set_logs.where('exercise_id').equals(exerciseId).toArray()
  if (!logs.length) return { date: null, sets: [] }
  const sids = [...new Set(logs.map((l) => l.session_id))]
  const sessions = (await db.workout_sessions.bulkGet(sids)).filter((s): s is WorkoutSession & { id: number } => !!s?.finished_at)
  if (!sessions.length) return { date: null, sets: [] }
  const latest = sessions.sort((a, b) => b.started_at - a.started_at)[0]
  return {
    date: latest.date,
    sets: logs.filter((l) => l.session_id === latest.id).sort((a, b) => a.set_no - b.set_no).map((l) => ({ weight_kg: l.weight_kg, reps: l.reps })),
  }
}

/** All logged sets for an exercise (finished sessions only). */
export async function allSets(exerciseId: number): Promise<SetLog[]> {
  const logs = await db.set_logs.where('exercise_id').equals(exerciseId).toArray()
  if (!logs.length) return []
  const sessions = await db.workout_sessions.bulkGet([...new Set(logs.map((l) => l.session_id))])
  const ok = new Set(sessions.filter((s) => s?.finished_at).map((s) => s!.id))
  return logs.filter((l) => ok.has(l.session_id))
}

export function usePRs() {
  return useLiveQuery(async () => {
    const logs = await db.set_logs.toArray()
    const sessions = await db.workout_sessions.toArray()
    const ok = new Map(sessions.filter((s) => s.finished_at).map((s) => [s.id!, s]))
    const by = new Map<number, (SetLog & { date: string })[]>()
    for (const l of logs) {
      const s = ok.get(l.session_id)
      if (!s) continue
      const arr = by.get(l.exercise_id) ?? []
      arr.push({ ...l, date: s.date })
      by.set(l.exercise_id, arr)
    }
    return [...by.entries()].map(([exercise_id, sets]) => {
      const b = bestSet(sets)!
      return { exercise_id, weight_kg: b.weight_kg, reps: b.reps, date: (b as SetLog & { date: string }).date, e1rm: est1RM(b.weight_kg, b.reps) }
    })
  }, [])
}

export const fmtKg = (n: number) => (n === 0 ? 'BW' : `${Number.isInteger(n) ? n : n.toFixed(1)} kg`)
export const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const
