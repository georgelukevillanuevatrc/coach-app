// Shared data model (PLAN.md section 6). All dates are 'yyyy-MM-dd' strings in Asia/Manila.
export type Sex = 'male' | 'female'
export type GoalType = 'lose' | 'gain' | 'maintain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active'
export type Equipment = 'gym' | 'home' | 'dumbbells'
export type SplitType = 'auto' | 'full_body' | 'upper_lower' | 'ppl' | 'bro' | 'arnold'
export type Experience = 'beginner' | 'intermediate'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'manual' | 'OFF' | 'USDA' | 'estimate'

export interface Profile {
  id: 1
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  goal_type: GoalType
  goal_weight_kg: number
  /** Fraction of TDEE: lose = 0.10-0.20 deficit, gain = 0.05-0.10 surplus. */
  goal_pace: number
  training_days: 2 | 3 | 4 | 5 | 6
  /** Workout split style; undefined or 'auto' picks by training_days. */
  split_type?: SplitType
  equipment: Equipment
  experience: Experience
  limits_note: string
}
export interface Targets {
  id?: number
  effective_from: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  reason: 'onboarding' | 'check-in'
}
export interface Food {
  id?: number
  name: string
  serving_desc: string
  serving_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source: FoodSource
  is_favorite: boolean
}
export interface SavedMeal {
  id?: number
  name: string
  items: { food_id: number; servings: number }[]
}
export interface FoodLog {
  id?: number
  date: string
  meal_type: MealType
  food_id?: number
  name: string
  servings: number
  /** Snapshot totals for `servings` servings; never rewritten when the food is edited. */
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  is_estimate: boolean
  created_at: number
}
export interface WeightLog {
  id?: number
  date: string
  weight_kg: number
  waist_cm?: number
  note?: string
}
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core'
export interface Exercise {
  id?: number
  name: string
  muscle_group: MuscleGroup
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable'
  is_compound: boolean
  is_lower: boolean
  /** names of substitute exercises */
  substitutes: string[]
}
export interface Plan {
  id?: number
  name: string
  start_date: string
  weeks: number
  status: 'active' | 'archived'
}
export interface PlanDay {
  id?: number
  plan_id: number
  day_index: number
  name: string
  exercises: { exercise_id: number; sets: number; rep_min: number; rep_max: number }[]
}
export interface WorkoutSession {
  id?: number
  plan_day_id: number
  date: string
  started_at: number
  finished_at?: number
  notes?: string
}
export interface SetLog {
  id?: number
  session_id: number
  exercise_id: number
  set_no: number
  weight_kg: number
  reps: number
  is_pr: boolean
}
export interface Checkin {
  id?: number
  week_start: string
  trend_kg: number
  adherence: number
  suggestion: string
  accepted: boolean
}
