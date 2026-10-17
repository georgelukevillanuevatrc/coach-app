import { describe, expect, it } from 'vitest'
import { LOCAL_FOODS, searchLocal } from './localFoods'

describe('local food search', () => {
  it('has a sizeable library with sane macros', () => {
    expect(LOCAL_FOODS.length).toBeGreaterThan(100)
    for (const f of LOCAL_FOODS) {
      if (f.name === 'Beer') continue // alcohol kcal are not in the macros
      const kcal = f.protein_g * 4 + f.carbs_g * 4 + f.fat_g * 9
      expect(f.calories).toBeGreaterThanOrEqual(0)
      expect(Math.abs(kcal - f.calories)).toBeLessThanOrEqual(Math.max(45, f.calories * 0.3))
    }
  })
  it('finds foods by name, Filipino alias and multi-word queries', () => {
    expect(searchLocal('adobo').map((f) => f.name)).toContain('Chicken adobo')
    expect(searchLocal('kanin')[0].name).toBe('White rice (cooked)')
    expect(searchLocal('chicken adobo')[0].name).toBe('Chicken adobo')
    expect(searchLocal('zzzz')).toEqual([])
  })
})
