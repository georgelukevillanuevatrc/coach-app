import { TZDate } from '@date-fns/tz'

export type NudgeKind = 'weight' | 'workout' | 'dinner'

export interface ReminderSettings {
  weight: { on: boolean; time: string }
  workout: { on: boolean; time: string }
  dinner: { on: boolean; time: string }
  quiet: { on: boolean; start: string; end: string }
}
export interface DayFlags {
  weightLogged: boolean
  dinnerLogged: boolean
  workoutDone: boolean
  isTrainingDay: boolean
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  weight: { on: true, time: '08:00' },
  workout: { on: true, time: '17:00' },
  dinner: { on: true, time: '20:00' },
  quiet: { on: true, start: '22:00', end: '07:00' },
}

/** 'HH:mm' to minutes since midnight; null if invalid. */
export function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '')
  if (!m) return null
  const h = +m[1], min = +m[2]
  return h > 23 || min > 59 ? null : h * 60 + min
}

/** Minutes since midnight in Asia/Manila for a Date. */
export function manilaMinutes(d: Date): number {
  const z = new TZDate(d, 'Asia/Manila')
  return z.getHours() * 60 + z.getMinutes()
}

/** Quiet window may wrap past midnight (22:00-07:00). start === end means no quiet time. */
export function inQuietHours(nowMin: number, q: ReminderSettings['quiet']): boolean {
  if (!q.on) return false
  const s = toMinutes(q.start), e = toMinutes(q.end)
  if (s == null || e == null || s === e) return false
  return s < e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e
}

/**
 * Which nudges are due right now. `nowMin` = minutes since midnight (Manila).
 * A nudge is due once its time has passed today, until the task is done.
 * Nothing is due in quiet hours.
 */
export function dueNudges(nowMin: number, s: ReminderSettings, f: DayFlags): NudgeKind[] {
  if (inQuietHours(nowMin, s.quiet)) return []
  const reached = (t: string) => { const m = toMinutes(t); return m != null && nowMin >= m }
  const out: NudgeKind[] = []
  if (s.weight.on && !f.weightLogged && reached(s.weight.time)) out.push('weight')
  if (s.workout.on && f.isTrainingDay && !f.workoutDone && reached(s.workout.time)) out.push('workout')
  if (s.dinner.on && !f.dinnerLogged && reached(s.dinner.time)) out.push('dinner')
  return out
}
