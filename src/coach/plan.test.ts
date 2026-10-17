import { describe, expect, it } from 'vitest'
import { generatePlan, isFlagged } from './plan'
import { SEED_EXERCISES } from '../features/train/seed'
import type { Profile } from '../lib/types'

const lib = SEED_EXERCISES.map((e, i) => ({ ...e, id: i + 1 }))
const byId = new Map(lib.map((e) => [e.id, e]))
const profile = (o: Partial<Profile> = {}): Profile => ({
  id: 1, age: 30, sex: 'male', height_cm: 175, weight_kg: 75, activity_level: 'moderate', goal_type: 'gain',
  goal_weight_kg: 80, goal_pace: 0.07, training_days: 3, equipment: 'gym', experience: 'beginner', limits_note: '', ...o,
})
const names = (p: ReturnType<typeof generatePlan>) => p.days.map((d) => d.exercises.map((e) => byId.get(e.exercise_id)!.name))

describe('generatePlan', () => {
  it('seeds about 60 exercises', () => expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(55))
  it('builds the right split per days/week', () => {
    const n = (d: 2 | 3 | 4 | 5) => generatePlan(profile({ training_days: d }), lib).days.map((x) => x.name)
    expect(n(2)).toEqual(['Full Body A', 'Full Body B'])
    expect(n(3)).toEqual(['Full Body A', 'Full Body B', 'Full Body A'])
    expect(n(4)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
    expect(n(5)).toEqual(['Push', 'Pull', 'Legs', 'Upper', 'Lower'])
  })
  it('respects equipment', () => {
    for (const [eq, allowed] of [['gym', ['barbell', 'machine', 'cable']], ['home', ['bodyweight', 'dumbbell']], ['dumbbells', ['dumbbell', 'bodyweight']]] as const) {
      const p = generatePlan(profile({ equipment: eq, training_days: 5, experience: 'intermediate' }), lib)
      for (const d of p.days) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(4)
        for (const e of d.exercises) expect(allowed).toContain(byId.get(e.exercise_id)!.equipment)
      }
    }
  })
  it('has no duplicate exercises within a day', () => {
    for (const d of generatePlan(profile({ training_days: 5 }), lib).days) {
      const ids = d.exercises.map((e) => e.exercise_id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('A and B days differ', () => {
    const n = names(generatePlan(profile({ training_days: 2 }), lib))
    expect(n[0]).not.toEqual(n[1])
  })
  it('beginner: 2-3 sets, 8-12 compounds', () => {
    const p = generatePlan(profile(), lib)
    for (const d of p.days) for (const e of d.exercises) {
      expect(e.sets).toBeGreaterThanOrEqual(2); expect(e.sets).toBeLessThanOrEqual(3)
      if (byId.get(e.exercise_id)!.is_compound) expect([e.rep_min, e.rep_max]).toEqual([8, 12])
    }
  })
  it('intermediate: 3-4 sets with 5-8 and 8-15 ranges', () => {
    const p = generatePlan(profile({ experience: 'intermediate' }), lib)
    const ex = p.days.flatMap((d) => d.exercises)
    ex.forEach((e) => { expect(e.sets).toBeGreaterThanOrEqual(3); expect(e.sets).toBeLessThanOrEqual(4) })
    expect(ex.some((e) => e.rep_min === 5 && e.rep_max === 8)).toBe(true)
    expect(ex.some((e) => e.rep_max === 15)).toBe(true)
  })
  it('knee note excludes squats/lunges and returns a flag', () => {
    const p = generatePlan(profile({ limits_note: 'Bad left knee', training_days: 4 }), lib)
    for (const n of names(p).flat()) expect(n).not.toMatch(/squat|lunge|leg press|leg extension/i)
    expect(p.flags[0].keyword).toBe('knee')
    expect(p.flags[0].excluded).toContain('Barbell Back Squat')
    expect(p.flags[0].message).toMatch(/doctor or physio/)
  })
  it('shoulder note excludes overhead press', () => {
    const p = generatePlan(profile({ limits_note: 'shoulder impingement', training_days: 5 }), lib)
    expect(names(p).flat()).not.toContain('Overhead Press')
    expect(isFlagged('Overhead Press', 'shoulder')).toBe(true)
    expect(isFlagged('Barbell Curl', 'shoulder')).toBe(false)
  })
  it('no flags without a note', () => expect(generatePlan(profile(), lib).flags).toEqual([]))
})
