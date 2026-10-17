// Coaching math: BMR, TDEE and calorie target (PLAN.md section 5). Pure functions, no I/O.
import type { ActivityLevel, GoalType, Profile, Sex } from '../lib/types'
import { macros } from './macros'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725,
}
export const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 }
/** Approximate energy in 1 kg of body fat. */
export const KCAL_PER_KG_FAT = 7700
export const MAX_LOSS_PCT_PER_WEEK = 0.01

export const LOSE_PACE = { min: 0.10, max: 0.20, default: 0.15 }
export const GAIN_PACE = { min: 0.05, max: 0.10, default: 0.075 }

/** Mifflin-St Jeor. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}
export function tdee(bmrValue: number, level: ActivityLevel): number {
  return bmrValue * ACTIVITY_FACTORS[level]
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export interface CalorieInput {
  sex: Sex
  weight_kg: number
  tdee: number
  goal_type: GoalType
  goal_pace: number
}
export interface CalorieResult {
  calories: number
  /** Pace actually applied, as a fraction of TDEE (negative = deficit). */
  applied_pace: number
  warnings: string[]
  notes: string[]
}

export function calorieTarget(i: CalorieInput): CalorieResult {
  const warnings: string[] = []
  const notes: string[] = []
  if (i.goal_type === 'maintain') {
    return { calories: Math.round(i.tdee), applied_pace: 0, warnings, notes: ['Maintain: eat at your estimated daily burn.'] }
  }
  if (i.goal_type === 'gain') {
    const p = clamp(i.goal_pace || GAIN_PACE.default, GAIN_PACE.min, GAIN_PACE.max)
    if (p !== i.goal_pace) notes.push(`Surplus adjusted to ${Math.round(p * 100)}% (allowed range is 5-10%).`)
    return { calories: Math.round(i.tdee * (1 + p)), applied_pace: p, warnings, notes }
  }
  // lose
  let p = clamp(i.goal_pace || LOSE_PACE.default, LOSE_PACE.min, LOSE_PACE.max)
  if (p !== i.goal_pace) notes.push(`Deficit adjusted to ${Math.round(p * 100)}% (allowed range is 10-20%).`)
  const maxDeficit = (MAX_LOSS_PCT_PER_WEEK * i.weight_kg * KCAL_PER_KG_FAT) / 7
  let deficit = i.tdee * p
  if (deficit > maxDeficit) {
    deficit = maxDeficit
    p = deficit / i.tdee
    warnings.push('Your chosen pace would lose more than about 1% of body weight per week, so it was slowed down to stay in a sustainable range.')
  }
  let calories = i.tdee - deficit
  const floor = CALORIE_FLOOR[i.sex]
  if (calories < floor) {
    calories = floor
    p = (i.tdee - floor) / i.tdee
    warnings.push(`Your target was raised to ${floor} kcal, the minimum this app suggests. A slower pace is a better fit for your numbers. If you want to go lower, please talk to a doctor or dietitian first.`)
  }
  return { calories: Math.round(calories), applied_pace: p, warnings, notes }
}

export interface ComputedTargets {
  bmr: number
  tdee: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  warnings: string[]
  explanation: string[]
}
export type TargetInput = Pick<Profile, 'age' | 'sex' | 'height_cm' | 'weight_kg' | 'activity_level' | 'goal_type' | 'goal_pace'>

const LEVEL_LABEL = { sedentary: 'sedentary', light: 'lightly active', moderate: 'moderately active', very_active: 'very active' }

export function computeTargets(p: TargetInput): ComputedTargets {
  const b = Math.round(bmr(p.sex, p.weight_kg, p.height_cm, p.age))
  const t = Math.round(tdee(bmr(p.sex, p.weight_kg, p.height_cm, p.age), p.activity_level))
  const c = calorieTarget({ sex: p.sex, weight_kg: p.weight_kg, tdee: t, goal_type: p.goal_type, goal_pace: p.goal_pace })
  const m = macros(c.calories, p.weight_kg, p.goal_type)
  const explanation = [
    `Resting burn (Mifflin-St Jeor): 10 x ${p.weight_kg} kg + 6.25 x ${p.height_cm} cm - 5 x ${p.age} ${p.sex === 'male' ? '+ 5' : '- 161'} = ${b} kcal.`,
    `Daily burn: ${b} x ${({ sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725 })[p.activity_level]} (${LEVEL_LABEL[p.activity_level]}) = ${t} kcal.`,
    p.goal_type === 'maintain'
      ? `Goal is to maintain, so calories = ${c.calories} kcal.`
      : p.goal_type === 'lose'
        ? `Goal is fat loss: ${t} minus ${Math.round(c.applied_pace * 100)}% = ${c.calories} kcal.`
        : `Goal is muscle gain: ${t} plus ${Math.round(c.applied_pace * 100)}% = ${c.calories} kcal.`,
    ...c.notes,
    `Protein: ${m.protein_g} g (${(m.protein_g / p.weight_kg).toFixed(1)} g per kg) to support muscle.`,
    `Fat: ${m.fat_g} g (about 25% of calories, never under 0.6 g per kg).`,
    `Carbs: ${m.carbs_g} g, the remaining calories.`,
    ...m.notes,
  ]
  return { bmr: b, tdee: t, calories: c.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g, warnings: c.warnings, explanation }
}
