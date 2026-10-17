// Macro split (PLAN.md section 5). 4/4/9 kcal per gram.
import type { GoalType } from '../lib/types'

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 }
export const PROTEIN_G_PER_KG = { min: 1.6, max: 2.2, default: 1.8, cutting: 2.0 }
export const FAT_KCAL_PCT = 0.25
export const FAT_MIN_G_PER_KG = 0.6

export interface Macros { protein_g: number; carbs_g: number; fat_g: number; notes: string[] }

export function macros(calories: number, weightKg: number, goal: GoalType): Macros {
  const notes: string[] = []
  const perKg = goal === 'lose' ? PROTEIN_G_PER_KG.cutting : PROTEIN_G_PER_KG.default
  const protein = Math.round(Math.min(PROTEIN_G_PER_KG.max, Math.max(PROTEIN_G_PER_KG.min, perKg)) * weightKg)
  let fat = (calories * FAT_KCAL_PCT) / KCAL_PER_G.fat
  const fatMin = FAT_MIN_G_PER_KG * weightKg
  if (fat < fatMin) { fat = fatMin; notes.push('Fat raised to the 0.6 g/kg minimum.') }
  fat = Math.round(fat)
  const carbs = Math.max(0, Math.round((calories - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs))
  return { protein_g: protein, carbs_g: carbs, fat_g: fat, notes }
}
