import { db } from '../../lib/db'
import type { Exercise, MuscleGroup } from '../../lib/types'
import { ROWS as UPPER } from './exercises/upper'
import { ROWS as LOWER } from './exercises/lower'
import { ROWS as MORE } from './exercises/more'

type Eq = Exercise['equipment']
// [name, group, equipment, compound, lower, substitutes]
type Row = [string, MuscleGroup, Eq, boolean, boolean, string[]]
const R = (name: string, g: MuscleGroup, eq: Eq, c: boolean, lower: boolean, subs: string[]): Row => [name, g, eq, c, lower, subs]

const ROWS: Row[] = [
  // legs (compounds alternate squat / hinge so day slots get variety)
  R('Barbell Back Squat', 'legs', 'barbell', true, true, ['Leg Press', 'Goblet Squat', 'Bulgarian Split Squat']),
  R('Romanian Deadlift', 'legs', 'barbell', true, true, ['Dumbbell Romanian Deadlift', 'Hip Thrust', 'Lying Leg Curl']),
  R('Leg Press', 'legs', 'machine', true, true, ['Barbell Back Squat', 'Goblet Squat', 'Walking Lunge']),
  R('Hip Thrust', 'legs', 'barbell', true, true, ['Glute Bridge', 'Romanian Deadlift']),
  R('Goblet Squat', 'legs', 'dumbbell', true, true, ['Bodyweight Squat', 'Leg Press', 'Bulgarian Split Squat']),
  R('Dumbbell Romanian Deadlift', 'legs', 'dumbbell', true, true, ['Romanian Deadlift', 'Glute Bridge']),
  R('Walking Lunge', 'legs', 'dumbbell', true, true, ['Bulgarian Split Squat', 'Step-Up', 'Leg Press']),
  R('Bulgarian Split Squat', 'legs', 'dumbbell', true, true, ['Walking Lunge', 'Goblet Squat', 'Step-Up']),
  R('Step-Up', 'legs', 'dumbbell', true, true, ['Walking Lunge', 'Bulgarian Split Squat']),
  R('Bodyweight Squat', 'legs', 'bodyweight', true, true, ['Goblet Squat', 'Step-Up']),
  R('Glute Bridge', 'legs', 'bodyweight', true, true, ['Hip Thrust', 'Dumbbell Romanian Deadlift']),
  R('Leg Extension', 'legs', 'machine', false, true, ['Bodyweight Squat', 'Step-Up']),
  R('Lying Leg Curl', 'legs', 'machine', false, true, ['Seated Leg Curl', 'Romanian Deadlift']),
  R('Seated Leg Curl', 'legs', 'machine', false, true, ['Lying Leg Curl']),
  R('Standing Calf Raise', 'legs', 'machine', false, true, ['Single-Leg Calf Raise']),
  R('Single-Leg Calf Raise', 'legs', 'bodyweight', false, true, ['Standing Calf Raise']),
  // chest
  R('Barbell Bench Press', 'chest', 'barbell', true, false, ['Dumbbell Bench Press', 'Machine Chest Press', 'Push-Up']),
  R('Incline Barbell Bench Press', 'chest', 'barbell', true, false, ['Incline Dumbbell Press', 'Machine Chest Press']),
  R('Machine Chest Press', 'chest', 'machine', true, false, ['Barbell Bench Press', 'Dumbbell Bench Press']),
  R('Dumbbell Bench Press', 'chest', 'dumbbell', true, false, ['Barbell Bench Press', 'Push-Up', 'Incline Dumbbell Press']),
  R('Incline Dumbbell Press', 'chest', 'dumbbell', true, false, ['Incline Barbell Bench Press', 'Dumbbell Bench Press']),
  R('Push-Up', 'chest', 'bodyweight', true, false, ['Dumbbell Bench Press', 'Machine Chest Press']),
  R('Dip', 'chest', 'bodyweight', true, false, ['Close-Grip Bench Press', 'Push-Up']),
  R('Cable Fly', 'chest', 'cable', false, false, ['Pec Deck', 'Dumbbell Fly']),
  R('Pec Deck', 'chest', 'machine', false, false, ['Cable Fly', 'Dumbbell Fly']),
  R('Dumbbell Fly', 'chest', 'dumbbell', false, false, ['Cable Fly', 'Pec Deck']),
  // back
  R('Barbell Row', 'back', 'barbell', true, false, ['One-Arm Dumbbell Row', 'Seated Cable Row']),
  R('Lat Pulldown', 'back', 'cable', true, false, ['Pull-Up', 'Chin-Up']),
  R('Seated Cable Row', 'back', 'cable', true, false, ['Chest-Supported Machine Row', 'Barbell Row']),
  R('Chest-Supported Machine Row', 'back', 'machine', true, false, ['Seated Cable Row', 'One-Arm Dumbbell Row']),
  R('One-Arm Dumbbell Row', 'back', 'dumbbell', true, false, ['Barbell Row', 'Inverted Row']),
  R('Pull-Up', 'back', 'bodyweight', true, false, ['Lat Pulldown', 'Chin-Up']),
  R('Chin-Up', 'back', 'bodyweight', true, false, ['Lat Pulldown', 'Pull-Up']),
  R('Inverted Row', 'back', 'bodyweight', true, false, ['One-Arm Dumbbell Row', 'Seated Cable Row']),
  R('Deadlift', 'back', 'barbell', true, true, ['Romanian Deadlift', 'Hip Thrust']),
  R('Straight-Arm Pulldown', 'back', 'cable', false, false, ['Lat Pulldown']),
  // shoulders
  R('Overhead Press', 'shoulders', 'barbell', true, false, ['Dumbbell Shoulder Press', 'Machine Shoulder Press']),
  R('Machine Shoulder Press', 'shoulders', 'machine', true, false, ['Overhead Press', 'Dumbbell Shoulder Press']),
  R('Dumbbell Shoulder Press', 'shoulders', 'dumbbell', true, false, ['Overhead Press', 'Pike Push-Up']),
  R('Pike Push-Up', 'shoulders', 'bodyweight', true, false, ['Dumbbell Shoulder Press']),
  R('Cable Lateral Raise', 'shoulders', 'cable', false, false, ['Dumbbell Lateral Raise']),
  R('Dumbbell Lateral Raise', 'shoulders', 'dumbbell', false, false, ['Cable Lateral Raise']),
  R('Face Pull', 'shoulders', 'cable', false, false, ['Rear Delt Fly']),
  R('Rear Delt Fly', 'shoulders', 'dumbbell', false, false, ['Face Pull']),
  // arms
  R('Close-Grip Bench Press', 'arms', 'barbell', true, false, ['Dip', 'Triceps Pushdown']),
  R('Barbell Curl', 'arms', 'barbell', false, false, ['Dumbbell Curl', 'Cable Curl']),
  R('Cable Curl', 'arms', 'cable', false, false, ['Dumbbell Curl', 'Barbell Curl']),
  R('Dumbbell Curl', 'arms', 'dumbbell', false, false, ['Hammer Curl', 'Cable Curl']),
  R('Hammer Curl', 'arms', 'dumbbell', false, false, ['Dumbbell Curl']),
  R('Triceps Pushdown', 'arms', 'cable', false, false, ['Overhead Triceps Extension', 'Skull Crusher']),
  R('Skull Crusher', 'arms', 'barbell', false, false, ['Triceps Pushdown', 'Overhead Triceps Extension']),
  R('Overhead Triceps Extension', 'arms', 'dumbbell', false, false, ['Triceps Pushdown', 'Skull Crusher']),
  R('Diamond Push-Up', 'arms', 'bodyweight', false, false, ['Overhead Triceps Extension', 'Dip']),
  // core
  R('Plank', 'core', 'bodyweight', false, false, ['Dead Bug', 'Cable Crunch']),
  R('Dead Bug', 'core', 'bodyweight', false, false, ['Plank']),
  R('Hanging Leg Raise', 'core', 'bodyweight', false, false, ['Cable Crunch', 'Crunch']),
  R('Cable Crunch', 'core', 'cable', false, false, ['Crunch', 'Hanging Leg Raise']),
  R('Crunch', 'core', 'bodyweight', false, false, ['Cable Crunch', 'Plank']),
  R('Russian Twist', 'core', 'bodyweight', false, false, ['Plank', 'Crunch']),
]

const names = new Set<string>()
export const SEED_EXERCISES: Exercise[] = [...ROWS, ...UPPER, ...LOWER, ...MORE]
  .filter((r) => !names.has(r[0].toLowerCase()) && !!names.add(r[0].toLowerCase()))
  .map(([name, muscle_group, equipment, is_compound, is_lower, substitutes]) => ({
  name, muscle_group, equipment, is_compound, is_lower, substitutes,
}))

let seeding: Promise<void> | null = null
/** Seeds the exercise library, adding any built-in exercise whose name is not there yet (keeps ids of existing ones). */
export function seedExercises(): Promise<void> {
  seeding ??= db.transaction('rw', db.exercises, async () => {
    const have = new Set((await db.exercises.toArray()).map((e) => e.name.toLowerCase()))
    const missing = SEED_EXERCISES.filter((e) => !have.has(e.name.toLowerCase()))
    if (missing.length) await db.exercises.bulkAdd(missing)
  }).catch(() => { seeding = null })
  return seeding
}
