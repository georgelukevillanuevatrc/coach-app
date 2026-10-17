import Dexie, { type EntityTable } from 'dexie'
import type * as T from './types'

export const db = new Dexie('coach') as Dexie & {
  profile: EntityTable<T.Profile, 'id'>
  targets: EntityTable<T.Targets, 'id'>
  foods: EntityTable<T.Food, 'id'>
  saved_meals: EntityTable<T.SavedMeal, 'id'>
  food_logs: EntityTable<T.FoodLog, 'id'>
  weight_logs: EntityTable<T.WeightLog, 'id'>
  exercises: EntityTable<T.Exercise, 'id'>
  plans: EntityTable<T.Plan, 'id'>
  plan_days: EntityTable<T.PlanDay, 'id'>
  workout_sessions: EntityTable<T.WorkoutSession, 'id'>
  set_logs: EntityTable<T.SetLog, 'id'>
  checkins: EntityTable<T.Checkin, 'id'>
}

db.version(1).stores({
  profile: 'id',
  targets: '++id, effective_from',
  foods: '++id, name, is_favorite',
  saved_meals: '++id, name',
  food_logs: '++id, date, meal_type',
  weight_logs: '++id, &date',
  exercises: '++id, &name, muscle_group',
  plans: '++id, status',
  plan_days: '++id, plan_id',
  workout_sessions: '++id, date, plan_day_id',
  set_logs: '++id, session_id, exercise_id',
  checkins: '++id, week_start',
})

export const TABLES = [
  'profile', 'targets', 'foods', 'saved_meals', 'food_logs', 'weight_logs',
  'exercises', 'plans', 'plan_days', 'workout_sessions', 'set_logs', 'checkins',
] as const
