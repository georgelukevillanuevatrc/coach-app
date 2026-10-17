import { describe, expect, it } from 'vitest'
import { bmr, tdee, calorieTarget, computeTargets } from './calories'
import { macros } from './macros'

const male = { age: 30, sex: 'male' as const, height_cm: 180, weight_kg: 80, activity_level: 'moderate' as const, goal_type: 'lose' as const, goal_pace: 0.15 }

describe('bmr/tdee', () => {
  it('male 30y 180cm 80kg = 1780', () => expect(bmr('male', 80, 180, 30)).toBe(1780))
  it('female 28y 165cm 60kg = 1330.25', () => expect(bmr('female', 60, 165, 28)).toBeCloseTo(1330.25))
  it('tdee factors', () => {
    expect(tdee(1780, 'sedentary')).toBeCloseTo(2136)
    expect(tdee(1780, 'very_active')).toBeCloseTo(3070.5)
  })
})
describe('calorieTarget', () => {
  it('maintain = tdee', () => expect(calorieTarget({ sex: 'male', weight_kg: 80, tdee: 2759, goal_type: 'maintain', goal_pace: 0 }).calories).toBe(2759))
  it('gain 7.5%', () => expect(calorieTarget({ sex: 'male', weight_kg: 80, tdee: 2000, goal_type: 'gain', goal_pace: 0.075 }).calories).toBe(2150))
  it('lose floors at 1500 for men', () => {
    const r = calorieTarget({ sex: 'male', weight_kg: 90, tdee: 1700, goal_type: 'lose', goal_pace: 0.2 })
    expect(r.calories).toBe(1500)
    expect(r.warnings.join(' ')).toContain('1500')
  })
  it('lose floors at 1200 for women', () => {
    expect(calorieTarget({ sex: 'female', weight_kg: 50, tdee: 1300, goal_type: 'lose', goal_pace: 0.2 }).calories).toBe(1200)
  })
  it('caps weekly loss at 1% bodyweight', () => {
    const r = calorieTarget({ sex: 'male', weight_kg: 50, tdee: 3500, goal_type: 'lose', goal_pace: 0.2 })
    // max deficit = 0.01*50*7700/7 = 550
    expect(r.calories).toBe(2950)
    expect(r.warnings.length).toBe(1)
  })
})
describe('macros', () => {
  it('cutting 80kg at 2201 kcal', () => {
    const m = macros(2201, 80, 'lose')
    expect(m.protein_g).toBe(160)
    expect(m.fat_g).toBe(61)
    expect(m.carbs_g).toBe(253)
  })
  it('maintain uses 1.8 g/kg', () => expect(macros(2500, 70, 'maintain').protein_g).toBe(126))
  it('fat min 0.6 g/kg', () => expect(macros(1200, 100, 'maintain').fat_g).toBe(60))
})
describe('computeTargets', () => {
  it('worked example, male lose 15%', () => {
    const r = computeTargets(male)
    expect(r.bmr).toBe(1780)
    expect(r.tdee).toBe(2759)
    expect(r.calories).toBe(2345) // 2759*0.85 = 2345.15
    expect(r.protein_g).toBe(160)
    expect(r.warnings).toEqual([])
    expect(r.explanation.length).toBeGreaterThan(4)
  })
  it('calories reconcile with macros', () => {
    const r = computeTargets(male)
    expect(Math.abs(r.protein_g * 4 + r.carbs_g * 4 + r.fat_g * 9 - r.calories)).toBeLessThan(10)
  })
  it('flags floor', () => {
    const r = computeTargets({ ...male, sex: 'female', age: 60, height_cm: 150, weight_kg: 45, activity_level: 'sedentary', goal_pace: 0.2 })
    expect(r.calories).toBe(1200)
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})
