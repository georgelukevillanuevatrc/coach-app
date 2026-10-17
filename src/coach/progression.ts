// Double progression, PR detection and deload helpers. Pure functions, no I/O.
export interface SetLite { weight_kg: number; reps: number }

export interface Target {
  /** Suggested working weight in kg (0 = no history, user picks). */
  weight_kg: number
  /** Suggested reps per set. */
  reps: number
  /** True when the weight is going up this time. */
  increase: boolean
  hint: string
}

export const INCREMENT_UPPER = 2.5
export const INCREMENT_LOWER = 5

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Double progression: all sets at rep_max -> add weight and reset to rep_min; else same weight, more reps. */
export function nextTarget(lastSets: SetLite[], repMin: number, repMax: number, isLower: boolean): Target {
  const sets = lastSets.filter((s) => s.reps > 0)
  if (sets.length === 0) {
    return {
      weight_kg: 0, reps: repMin, increase: false,
      hint: `First time: pick a weight you can lift ${repMin}-${repMax} times with 1-2 reps in reserve.`,
    }
  }
  const weight = Math.max(...sets.map((s) => s.weight_kg))
  const atWeight = sets.filter((s) => s.weight_kg === weight)
  const minReps = Math.min(...atWeight.map((s) => s.reps))
  const inc = isLower ? INCREMENT_LOWER : INCREMENT_UPPER
  if (weight > 0 && atWeight.every((s) => s.reps >= repMax)) {
    return {
      weight_kg: weight + inc, reps: repMin, increase: true,
      hint: `Hit ${atWeight.length}x${repMax} last time, try +${fmt(inc)} kg today`,
    }
  }
  const reps = Math.min(repMax, minReps + 1)
  const bw = weight === 0
  return {
    weight_kg: weight, reps, increase: false,
    hint: bw
      ? `Last time: ${atWeight.map((s) => s.reps).join('/')} reps. Aim for ${reps} reps per set today.`
      : `Last time: ${fmt(weight)} kg x ${atWeight.map((s) => s.reps).join('/')}. Keep ${fmt(weight)} kg and aim for ${reps} reps per set.`,
  }
}

/** Epley estimated one-rep max. */
export const est1RM = (weight: number, reps: number) => (reps <= 0 ? 0 : weight * (1 + reps / 30))

/**
 * A set is a PR when its estimated 1RM beats everything logged before (history + earlier sets this session).
 * The very first time an exercise is logged sets the baseline and is not flagged.
 */
export function isPR(set: SetLite, previous: SetLite[]): boolean {
  if (set.reps <= 0 || set.weight_kg <= 0 || previous.length === 0) return false
  const best = Math.max(...previous.map((p) => est1RM(p.weight_kg, p.reps)))
  return est1RM(set.weight_kg, set.reps) > best + 1e-9
}

/** Best set by estimated 1RM, or undefined. */
export function bestSet<T extends SetLite>(sets: T[]): T | undefined {
  let best: T | undefined
  for (const s of sets) if (s.reps > 0 && (!best || est1RM(s.weight_kg, s.reps) > est1RM(best.weight_kg, best.reps))) best = s
  return best
}

export const DELOAD_VOLUME = 0.6

/** Zero-based week number of a block, from plan start (yyyy-MM-dd) to a date. */
export function weekIndex(startDate: string, today: string): number {
  const ms = Date.parse(today + 'T00:00:00Z') - Date.parse(startDate + 'T00:00:00Z')
  return Math.max(0, Math.floor(ms / (7 * 86400000)))
}

/** Deload on the last week of each block (block length 4-6 weeks; default 5). */
export function isDeloadWeek(weekIdx: number, blockWeeks = 5): boolean {
  const b = Math.min(6, Math.max(4, blockWeeks))
  return (weekIdx + 1) % b === 0
}

/** About 60% of the volume, never below 1 set. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets * DELOAD_VOLUME))
}
