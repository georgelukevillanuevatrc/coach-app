import { describe, expect, it } from 'vitest'
import { LOCAL_FOODS, searchLocal } from './localFoods'
import { ROWS as ALCOHOL_ROWS } from './rows/alcohol'

const alc = new Set(ALCOHOL_ROWS.map((r) => r[0]).concat('Beer'))

describe('local food search', () => {
  it('has a sizeable library with sane macros', () => {
    expect(LOCAL_FOODS.length).toBeGreaterThan(1000)
    for (const f of LOCAL_FOODS) {
      if (alc.has(f.name)) continue // alcohol kcal are not in the macros
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
  it('forgives typos', () => {
    expect(searchLocal('quesodilla').map((f) => f.name)).toContain('Cheese quesadilla')
    expect(searchLocal('chiken adobo')[0].name).toBe('Chicken adobo')
    expect(searchLocal('pandesl')[0].name).toBe('Pandesal')
    expect(searchLocal('hamburgr').length).toBeGreaterThan(0)
  })
  it('does not match nonsense', () => {
    expect(searchLocal('qwxzv')).toEqual([])
  })
})
