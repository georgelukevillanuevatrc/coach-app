// Weekly split generator (PLAN.md section 5). Pure: takes a profile and the exercise library.
import type { Exercise, MuscleGroup, Plan, PlanDay, Profile, SplitType } from '../lib/types'

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

const SHOULDERS: Slot[] = [C('shoulders'), C('shoulders'), I('shoulders'), I('shoulders'), I('core')]
const CHEST: Slot[] = [C('chest'), C('chest'), C('chest'), I('chest'), I('arms', TRI)]
const BACK: Slot[] = [C('back'), C('back'), C('back'), I('back'), I('arms', BI)]
const ARMS: Slot[] = [I('arms', BI), I('arms', TRI), I('arms', BI), I('arms', TRI), I('core')]
const CHEST_BACK: Slot[] = [C('chest'), C('back'), C('chest'), C('back'), I('chest'), I('back')]
const SHOULDERS_ARMS: Slot[] = [C('shoulders'), I('shoulders'), I('arms', BI), I('arms', TRI), I('arms', BI), I('arms', TRI)]

type Day_ = { name: string; slots: Slot[]; variant: number }
const D = (name: string, slots: Slot[], variant = 0): Day_ => ({ name, slots, variant })

export interface SplitInfo {
  id: SplitType
  label: string
  blurb: string
  /** allowed days per week; first is the default */
  days: number[]
  build: (n: number) => Day_[]
}

const fullBody = (n: number) => Array.from({ length: n }, (_, i) => D(`Full Body ${i % 2 ? 'B' : 'A'}`, FULL, i % 2))
const upperLower = (n: number) => {
  const out: Day_[] = []
  for (let i = 0; i < n; i++) out.push(i % 2 === 0 ? D(`Upper ${i < 2 ? 'A' : 'B'}`, UPPER, i < 2 ? 0 : 1) : D(`Lower ${i < 2 ? 'A' : 'B'}`, LOWER, i < 2 ? 0 : 1))
  return out
}
const ppl = (n: number) => {
  const one = [D('Push', PUSH), D('Pull', PULL), D('Legs', LOWER)]
  return n >= 6 ? [...one, D('Push 2', PUSH, 1), D('Pull 2', PULL, 1), D('Legs 2', LOWER, 1)] : one
}
const auto = (n: number): Day_[] => {
  if (n <= 3) return fullBody(n)
  if (n === 4) return upperLower(4)
  if (n === 5) return [D('Push', PUSH), D('Pull', PULL), D('Legs', LOWER), D('Upper', UPPER, 1), D('Lower', LOWER, 1)]
  return ppl(6)
}

export const SPLITS: SplitInfo[] = [
  { id: 'auto', label: 'Recommended', blurb: 'Picks the best split for your training days.', days: [3], build: auto },
  { id: 'full_body', label: 'Full body', blurb: 'Every session trains the whole body. Great for beginners and 2-3 days a week.', days: [3, 2, 4], build: fullBody },
  { id: 'upper_lower', label: 'Upper / Lower', blurb: 'Alternates upper and lower body. Each muscle is trained twice a week.', days: [4], build: upperLower },
  { id: 'ppl', label: 'Push / Pull / Legs', blurb: 'Push muscles, pull muscles, then legs. Run it once (3 days) or twice (6 days) a week.', days: [3, 6], build: ppl },
  { id: 'bro', label: 'Body-part (bro) split', blurb: 'One muscle group a day: chest, back, shoulders, legs, arms. Best for intermediates with 5 days.', days: [5], build: () => [D('Chest', CHEST), D('Back', BACK), D('Shoulders', SHOULDERS), D('Legs', LOWER), D('Arms', ARMS)] },
  { id: 'arnold', label: 'Arnold split', blurb: 'Chest + back, shoulders + arms, legs, repeated twice. 6 days, high volume.', days: [6], build: () => [D('Chest + Back', CHEST_BACK), D('Shoulders + Arms', SHOULDERS_ARMS), D('Legs', LOWER), D('Chest + Back 2', CHEST_BACK, 1), D('Shoulders + Arms 2', SHOULDERS_ARMS, 1), D('Legs 2', LOWER, 1)] },
]
export const splitInfo = (id: SplitType | undefined) => SPLITS.find((s) => s.id === (id ?? 'auto')) ?? SPLITS[0]
/** Days per week to use when switching to a split, keeping the current choice when allowed. */
export const daysForSplit = (id: SplitType, current: number) => (id === 'auto' || splitInfo(id).days.includes(current) ? current : splitInfo(id).days[0])

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

  const info = splitInfo(profile.split_type)
  const tpl = info.build(info.id === 'auto' || info.days.includes(profile.training_days) ? profile.training_days : info.days[0])
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
    plan: { name: `${tpl.length}-day ${info.id === 'auto' ? '' : info.label + ' '}${profile.experience} plan`, start_date: startDate, weeks: 5, status: 'active' },
    days,
    flags,
  }
}
