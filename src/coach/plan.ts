// Weekly split generator (PLAN.md section 5). Pure: takes a profile and the exercise library.
import type { Exercise, MuscleGroup, Plan, PlanDay, Profile } from '../lib/types'

type Ex = Exercise & { id: number }
type Slot = { mg: MuscleGroup; kind: 'compound' | 'iso'; lower?: boolean; re?: RegExp }

export interface InjuryFlag {
  keyword: string
  excluded: string[]
  message: string
}
export interface GeneratedPlan {
  plan: Omit<Plan, 'id'>
  days: Omit<PlanDay, 'id' | 'plan_id'>[]
  flags: InjuryFlag[]
}

export const INJURY_RULES: { keyword: string; re: RegExp }[] = [
  { keyword: 'knee', re: /squat|lunge|leg extension|leg press|step-up/i },
  { keyword: 'shoulder', re: /overhead|shoulder press|dip|pike|fly|upright|lateral raise/i },
  { keyword: 'back', re: /deadlift|barbell row|back squat|good morning/i },
  { keyword: 'wrist', re: /push-up|barbell curl|skull|plank/i },
  { keyword: 'elbow', re: /skull|pushdown|extension|close-grip|dip|curl/i },
  { keyword: 'hip', re: /hip thrust|bridge|lunge|split squat|deadlift/i },
  { keyword: 'neck', re: /overhead|shoulder press|pull-up|chin-up/i },
]

export const PRO_ADVICE = 'Check with a doctor or physio before training around an injury.'

/** Which injury rules does this note trigger? */
export function injuryRules(note: string) {
  const n = (note || '').toLowerCase()
  return INJURY_RULES.filter((r) => n.includes(r.keyword))
}
/** Does the note flag this exercise name? */
export function isFlagged(name: string, note: string): boolean {
  return injuryRules(note).some((r) => r.re.test(name))
}

const ALLOWED: Record<Profile['equipment'], Exercise['equipment'][]> = {
  gym: ['barbell', 'machine', 'cable'],
  home: ['bodyweight', 'dumbbell'],
  dumbbells: ['dumbbell', 'bodyweight'],
}
export const equipmentAllows = (eq: Profile['equipment'], ex: Exercise) => ALLOWED[eq].includes(ex.equipment)

const C = (mg: MuscleGroup, lower = false): Slot => ({ mg, kind: 'compound', lower })
const I = (mg: MuscleGroup, re?: RegExp): Slot => ({ mg, kind: 'iso', re })
const BI = /curl/i
const TRI = /tricep|skull|pushdown/i

const FULL: Slot[] = [C('legs', true), C('chest'), C('back'), C('legs', true), C('shoulders'), I('arms', BI), I('core')]
const UPPER: Slot[] = [C('chest'), C('back'), C('shoulders'), C('back'), I('arms', BI), I('arms', TRI)]
const LOWER: Slot[] = [C('legs', true), C('legs', true), C('legs', true), I('legs'), I('legs'), I('core')]
const PUSH: Slot[] = [C('chest'), C('shoulders'), C('chest'), I('shoulders'), I('arms', TRI), I('arms', TRI)]
const PULL: Slot[] = [C('back'), C('back'), C('back'), I('shoulders'), I('arms', BI), I('arms', BI)]

const TEMPLATES: Record<number, { name: string; slots: Slot[]; variant: number }[]> = {
  2: [{ name: 'Full Body A', slots: FULL, variant: 0 }, { name: 'Full Body B', slots: FULL, variant: 1 }],
  3: [{ name: 'Full Body A', slots: FULL, variant: 0 }, { name: 'Full Body B', slots: FULL, variant: 1 }, { name: 'Full Body A', slots: FULL, variant: 0 }],
  4: [
    { name: 'Upper A', slots: UPPER, variant: 0 }, { name: 'Lower A', slots: LOWER, variant: 0 },
    { name: 'Upper B', slots: UPPER, variant: 1 }, { name: 'Lower B', slots: LOWER, variant: 1 },
  ],
  5: [
    { name: 'Push', slots: PUSH, variant: 0 }, { name: 'Pull', slots: PULL, variant: 0 }, { name: 'Legs', slots: LOWER, variant: 0 },
    { name: 'Upper', slots: UPPER, variant: 1 }, { name: 'Lower', slots: LOWER, variant: 1 },
  ],
}

function pick(pool: Ex[], slot: Slot, used: Set<number>, variant: number): Ex | undefined {
  const inGroup = pool.filter((e) => e.muscle_group === slot.mg && !used.has(e.id) && (!slot.re || slot.re.test(e.name)))
  let c = inGroup.filter((e) => (slot.kind === 'compound') === e.is_compound)
  if (slot.lower !== undefined && slot.kind === 'compound') c = c.filter((e) => e.is_lower === slot.lower)
  if (c.length === 0 && !slot.re) c = inGroup // relax the compound/iso preference
  if (c.length === 0) return undefined
  return c[variant % c.length]
}

function prescription(profile: Profile, slot: Slot, isFirstCompound: boolean) {
  if (profile.experience === 'beginner') {
    return slot.kind === 'compound' ? { sets: 3, rep_min: 8, rep_max: 12 } : { sets: 2, rep_min: 10, rep_max: 15 }
  }
  if (slot.kind === 'compound') return isFirstCompound ? { sets: 4, rep_min: 5, rep_max: 8 } : { sets: 3, rep_min: 8, rep_max: 12 }
  return { sets: 3, rep_min: 10, rep_max: 15 }
}

export function generatePlan(profile: Profile, exercises: Exercise[], startDate = ''): GeneratedPlan {
  const all = exercises.filter((e): e is Ex => e.id != null)
  const eqPool = all.filter((e) => equipmentAllows(profile.equipment, e))
  const rules = injuryRules(profile.limits_note)
  const flags: InjuryFlag[] = rules.map((r) => ({
    keyword: r.keyword,
    excluded: eqPool.filter((e) => r.re.test(e.name)).map((e) => e.name),
    message: `Your notes mention "${r.keyword}", so we left out exercises that commonly stress it. ${PRO_ADVICE}`,
  }))
  const pool = eqPool.filter((e) => !rules.some((r) => r.re.test(e.name)))

  const tpl = TEMPLATES[profile.training_days] ?? TEMPLATES[3]
  const days = tpl.map((t, i) => {
    const used = new Set<number>()
    let firstCompoundDone = false
    const out: PlanDay['exercises'] = []
    for (const slot of t.slots) {
      const ex = pick(pool, slot, used, t.variant)
      if (!ex) continue
      used.add(ex.id)
      const first = slot.kind === 'compound' && !firstCompoundDone
      if (slot.kind === 'compound') firstCompoundDone = true
      out.push({ exercise_id: ex.id, ...prescription(profile, slot, first) })
    }
    return { day_index: i, name: t.name, exercises: out }
  })
  return {
    plan: { name: `${profile.training_days}-day ${profile.experience} plan`, start_date: startDate, weeks: 5, status: 'active' },
    days,
    flags,
  }
}
