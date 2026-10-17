import type { Food } from '../types'

export type SearchFood = Omit<Food, 'id'>

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}
const r1 = (n: number) => Math.round(n * 10) / 10

export interface OffProduct {
  code?: string
  product_name?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

/** Maps an Open Food Facts product to a Food. Returns null when there is no usable calorie value. */
export function mapOffProduct(p: OffProduct): SearchFood | null {
  const name = (p.product_name ?? '').trim()
  if (!name) return null
  const n = p.nutriments ?? {}
  let kcal100 = num(n['energy-kcal_100g'])
  if (kcal100 == null) {
    const kj = num(n['energy_100g'])
    if (kj != null) kcal100 = kj / 4.184
  }
  const p100 = num(n['proteins_100g'])
  const c100 = num(n['carbohydrates_100g'])
  const f100 = num(n['fat_100g'])
  const brand = (p.brands ?? '').split(',')[0].trim()
  const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name

  const qty = num(p.serving_quantity)
  if (qty && qty > 0) {
    const kS = num(n['energy-kcal_serving']) ?? (kcal100 != null ? (kcal100 * qty) / 100 : null)
    if (kS != null) {
      const sizeText = (p.serving_size ?? '').trim()
      return {
        name: fullName,
        serving_desc: sizeText || `${r1(qty)} g`,
        serving_g: r1(qty),
        calories: Math.round(kS),
        protein_g: r1(num(n['proteins_serving']) ?? ((p100 ?? 0) * qty) / 100),
        carbs_g: r1(num(n['carbohydrates_serving']) ?? ((c100 ?? 0) * qty) / 100),
        fat_g: r1(num(n['fat_serving']) ?? ((f100 ?? 0) * qty) / 100),
        source: 'OFF', is_favorite: false,
      }
    }
  }
  if (kcal100 == null) return null
  return {
    name: fullName, serving_desc: 'per 100 g', serving_g: 100,
    calories: Math.round(kcal100), protein_g: r1(p100 ?? 0), carbs_g: r1(c100 ?? 0), fat_g: r1(f100 ?? 0),
    source: 'OFF', is_favorite: false,
  }
}

export interface UsdaFood {
  fdcId?: number
  description?: string
  brandName?: string
  brandOwner?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodNutrients?: { nutrientId?: number; nutrientNumber?: string | number; nutrientName?: string; value?: number }[]
}

/** Maps a USDA FoodData Central search hit (nutrients are per 100 g) to a Food. */
export function mapUsdaFood(u: UsdaFood): SearchFood | null {
  const name = (u.description ?? '').trim()
  if (!name) return null
  const get = (num_: string, id: number): number | null => {
    const hit = (u.foodNutrients ?? []).find((x) => String(x.nutrientNumber) === num_ || x.nutrientId === id)
    return hit ? num(hit.value) : null
  }
  const kcal = get('208', 1008)
  if (kcal == null) return null
  const p = get('203', 1003) ?? 0
  const c = get('205', 1005) ?? 0
  const f = get('204', 1004) ?? 0
  const title = name.toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase())
  const brand = (u.brandName ?? u.brandOwner ?? '').trim()
  const fullName = brand ? `${title} (${brand})` : title
  const unit = (u.servingSizeUnit ?? '').toLowerCase()
  const size = num(u.servingSize)
  if (size && size > 0 && (unit === 'g' || unit === 'grm')) {
    const k = size / 100
    const desc = u.householdServingFullText ? `${u.householdServingFullText} (${r1(size)} g)` : `${r1(size)} g serving`
    return {
      name: fullName, serving_desc: desc, serving_g: r1(size),
      calories: Math.round(kcal * k), protein_g: r1(p * k), carbs_g: r1(c * k), fat_g: r1(f * k),
      source: 'USDA', is_favorite: false,
    }
  }
  return {
    name: fullName, serving_desc: 'per 100 g', serving_g: 100,
    calories: Math.round(kcal), protein_g: r1(p), carbs_g: r1(c), fat_g: r1(f),
    source: 'USDA', is_favorite: false,
  }
}
