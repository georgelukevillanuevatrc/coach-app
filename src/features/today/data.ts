import { db } from '../../lib/db'
import type { Food, FoodLog, MealType } from '../../lib/types'

export const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
]

export const r1 = (n: number) => Math.round(n * 10) / 10
export const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

type FoodInput = Omit<Food, 'id'>
const f = (name: string, serving_desc: string, serving_g: number, calories: number, protein_g: number, carbs_g: number, fat_g: number): FoodInput =>
  ({ name, serving_desc, serving_g, calories, protein_g, carbs_g, fat_g, source: 'estimate', is_favorite: false })

const SEED: FoodInput[] = [
  f('White rice', '1 cup cooked', 160, 205, 4, 45, 0.4),
  f('Chicken adobo', '1 serving (thigh + sauce)', 180, 320, 26, 5, 22),
  f('Sinigang na baboy', '1 bowl', 350, 280, 20, 12, 16),
  f('Egg (fried)', '1 egg', 46, 90, 6, 0.4, 7),
  f('Egg (boiled)', '1 egg', 50, 78, 6, 0.6, 5),
  f('Tapa (beef)', '1 serving', 80, 200, 20, 6, 10),
  f('Longganisa', '2 pcs', 70, 230, 10, 8, 17),
  f('Garlic fried rice (sinangag)', '1 cup', 170, 270, 5, 45, 7),
  f('Pandesal', '1 piece', 30, 90, 3, 17, 1),
  f('Saging (banana)', '1 medium', 118, 105, 1.3, 27, 0.4),
  f('Tinola', '1 bowl', 350, 230, 24, 8, 11),
  f('Pancit canton', '1 cup', 150, 260, 7, 38, 9),
  f('Lumpiang shanghai', '4 pcs', 80, 240, 9, 18, 14),
  f('Bangus (fried milkfish)', '1 piece', 120, 230, 24, 0, 15),
  f('Whey protein shake', '1 scoop', 30, 120, 24, 3, 1.5),
  f('Pork sinigang broth + veg', '1 cup', 240, 90, 5, 8, 4),
]

export async function seedFoods() {
  try {
    if (localStorage.getItem('coach_foods_seeded')) return
  } catch { /* ignore */ }
  await db.transaction('rw', db.foods, async () => {
    if ((await db.foods.count()) === 0) await db.foods.bulkAdd(SEED.map((x) => ({ ...x })))
  })
  try { localStorage.setItem('coach_foods_seeded', '1') } catch { /* ignore */ }
}

/** Creates a FoodLog holding SNAPSHOT totals for `servings` servings. */
export async function logFood(food: Food, servings: number, meal: MealType, date: string): Promise<number> {
  const row: FoodLog = {
    date, meal_type: meal, food_id: food.id, name: food.name, servings,
    calories: Math.round(food.calories * servings),
    protein_g: r1(food.protein_g * servings),
    carbs_g: r1(food.carbs_g * servings),
    fat_g: r1(food.fat_g * servings),
    is_estimate: food.source === 'estimate',
    created_at: Date.now(),
  }
  return (await db.food_logs.add(row)) as number
}

export async function logSavedMeal(items: { food_id: number; servings: number }[], meal: MealType, date: string): Promise<number[]> {
  const ids: number[] = []
  for (const it of items) {
    const food = await db.foods.get(it.food_id)
    if (food) ids.push(await logFood(food, it.servings, meal, date))
  }
  return ids
}

export async function copyDay(from: string, to: string): Promise<number[]> {
  const logs = await db.food_logs.where('date').equals(from).toArray()
  const now = Date.now()
  const ids: number[] = []
  for (let i = 0; i < logs.length; i++) {
    const { id: _id, ...rest } = logs[i]
    void _id
    ids.push((await db.food_logs.add({ ...rest, date: to, created_at: now + i })) as number)
  }
  return ids
}
