import type { GoalType } from '../lib/types'

export type CheckinAction = 'keep' | 'adjust' | 'deload'

export interface CheckinInput {
  trendNow: number | null
  trendPrev: number | null
  goalType: GoalType
  /** Fraction of TDEE (deficit for lose, surplus for gain). */
  goalPace: number
  weightKg: number
  currentCalories: number
  /** 0..1 share of the week the plan was followed (days logged, workouts, protein). */
  adherence: number
  /** Consecutive weeks (including this one) the trend was off target pace. */
  weeksOffTarget: number
  /** Set when the training plan says a deload week is due. */
  deloadDue?: boolean
}
export interface CheckinSuggestion {
  action: CheckinAction
  calorieDelta: number
  newCalories: number
  rate: number | null
  targetRate: number
  message: string
}

const KCAL_PER_KG = 7700
/** Allowed miss in kg/week; tighter for slow targets such as lean gaining. */
export const rateTolerance = (target: number) =>
  target === 0 ? 0.25 : Math.min(0.2, Math.max(0.07, 0.4 * Math.abs(target)))
export const MIN_STEP = 100
export const MAX_STEP = 150

/** Target weekly weight change in kg/week (negative = losing). */
export function targetWeeklyRate(goalType: GoalType, goalPace: number, currentCalories: number): number {
  if (goalType === 'maintain') return 0
  const tdee = goalType === 'lose' ? currentCalories / (1 - goalPace) : currentCalories / (1 + goalPace)
  const perWeek = (tdee * goalPace * 7) / KCAL_PER_KG
  return Math.round(perWeek * 100) / 100 * (goalType === 'lose' ? -1 : 1)
}

/** Positive = weight moving too high vs target pace, negative = too low, 0 = on target. */
export function paceDeviation(rate: number | null, target: number): number {
  if (rate == null) return 0
  const diff = rate - target
  return Math.abs(diff) <= rateTolerance(target) ? 0 : diff
}

/** How many consecutive weeks (latest first) the weekly rate was off target. Input: weekly trend values, latest first. */
export function countWeeksOffTarget(weeklyTrends: (number | null)[], target: number): number {
  let n = 0
  for (let i = 0; i + 1 < weeklyTrends.length; i++) {
    const a = weeklyTrends[i], b = weeklyTrends[i + 1]
    if (a == null || b == null) break
    if (paceDeviation(a - b, target) === 0) break
    n++
  }
  return n
}

const CONFIRM = 'Want me to apply this? Nothing changes until you confirm.'

export function suggestCheckin(i: CheckinInput): CheckinSuggestion {
  const targetRate = targetWeeklyRate(i.goalType, i.goalPace, i.currentCalories)
  const rate = i.trendNow != null && i.trendPrev != null ? Math.round((i.trendNow - i.trendPrev) * 100) / 100 : null
  const base = { calorieDelta: 0, newCalories: i.currentCalories, rate, targetRate }
  const done = (action: CheckinAction, body: string, delta = 0): CheckinSuggestion => ({
    ...base, action, calorieDelta: delta, newCalories: i.currentCalories + delta, message: `${body} ${CONFIRM}`,
  })

  if (i.deloadDue) {
    return done('deload', 'A lighter week (about 60% of your usual sets, same weights) will help you recover and come back stronger. Calories stay the same.')
  }
  if (rate == null) {
    return done('keep', 'I need a few more weigh-ins this week to read your trend. Keep going, and log when you can. No change to your targets.')
  }
  const dev = paceDeviation(rate, targetRate)
  if (dev === 0) {
    return done('keep', 'Your trend is right on pace. Keep going as you are. No change to your targets.')
  }
  if (i.weeksOffTarget < 2) {
    return done('keep', 'Your trend is a little off pace, but one week is normal noise. Keep going and we will look again next week. No change to your targets.')
  }
  if (i.adherence < 0.5) {
    return done('keep', 'Your trend is off pace for a second week, though it was a busy week for logging. Let us get a steadier week in first, then adjust if needed. No change to your targets.')
  }
  // Moving too high -> eat less; too low -> eat more. Larger miss gets the larger step; never beyond 150.
  const step = Math.abs(dev) > 2 * rateTolerance(targetRate) ? MAX_STEP : MIN_STEP
  const delta = dev > 0 ? -step : step
  const dir = delta < 0 ? 'down' : 'up'
  const why = i.goalType === 'maintain'
    ? 'Your weight has been drifting for two weeks.'
    : i.goalType === 'lose'
      ? (dev > 0 ? 'Your trend has been slower than planned for two weeks.' : 'Your trend has been faster than planned for two weeks, so a bit more fuel will protect your muscle and energy.')
      : (dev > 0 ? 'Your trend has been faster than planned for two weeks.' : 'Your trend has been slower than planned for two weeks.')
  return done('adjust', `${why} A small step of ${step} kcal ${dir}, to ${i.currentCalories + delta} kcal a day, should help.`, delta)
}
