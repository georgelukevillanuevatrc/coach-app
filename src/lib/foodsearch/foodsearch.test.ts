import { describe, expect, it } from 'vitest'
import { mapOffBarcode, mapOffProduct, mapOffSearch, mapUsdaSearch, offSearchUrl } from './index'

const withServing = {
  code: '111', product_name: 'Choco Bar', brands: 'Fake Brand,Other', serving_size: '40 g', serving_quantity: '40',
  nutriments: { 'energy-kcal_100g': 500, proteins_100g: 10, carbohydrates_100g: 50, fat_100g: 25,
    'energy-kcal_serving': 200, proteins_serving: 4, carbohydrates_serving: 20, fat_serving: 10 },
}
const per100only = {
  code: '222', product_name: 'Plain Oats', brands: '',
  nutriments: { 'energy-kcal_100g': 370, proteins_100g: 13.5, carbohydrates_100g: 60, fat_100g: 7 },
}

describe('mapOffProduct', () => {
  it('uses per-serving values when serving data exists', () => {
    const f = mapOffProduct(withServing)!
    expect(f).toMatchObject({ calories: 200, protein_g: 4, carbs_g: 20, fat_g: 10, serving_g: 40, source: 'OFF' })
    expect(f.serving_desc).toContain('40 g')
    expect(f.name).toBe('Choco Bar (Fake Brand)')
  })
  it('derives per-serving from 100 g when serving fields are missing', () => {
    const f = mapOffProduct({ ...withServing, nutriments: { 'energy-kcal_100g': 500, proteins_100g: 10, carbohydrates_100g: 50, fat_100g: 25 } })!
    expect(f.calories).toBe(200)
    expect(f.protein_g).toBe(4)
  })
  it('falls back to per 100 g', () => {
    const f = mapOffProduct(per100only)!
    expect(f).toMatchObject({ serving_desc: 'per 100 g', serving_g: 100, calories: 370, protein_g: 13.5 })
  })
  it('converts kJ when kcal is missing', () => {
    const f = mapOffProduct({ product_name: 'X', nutriments: { energy_100g: 418.4 } })!
    expect(f.calories).toBe(100)
  })
  it('skips products without name or energy', () => {
    expect(mapOffProduct({ product_name: '', nutriments: {} })).toBeNull()
    expect(mapOffProduct({ product_name: 'No data', nutriments: {} })).toBeNull()
  })
})

describe('search/barcode wrappers', () => {
  it('filters unusable products', () => {
    expect(mapOffSearch({ products: [withServing, { product_name: 'bad' }, per100only] })).toHaveLength(2)
    expect(mapOffSearch({})).toEqual([])
  })
  it('handles barcode responses', () => {
    expect(mapOffBarcode({ status: 0 })).toBeNull()
    expect(mapOffBarcode({ status: 1, product: per100only })?.calories).toBe(370)
  })
  it('builds the OFF url', () => {
    const u = offSearchUrl('chicken & rice')
    expect(u).toContain('search_terms=chicken+%26+rice')
    expect(u).toContain('page_size=20')
  })
})

describe('mapUsdaSearch', () => {
  const foods = [
    { description: 'CHICKEN BREAST, RAW', foodNutrients: [
      { nutrientNumber: '208', value: 120 }, { nutrientNumber: '203', value: 22.5 },
      { nutrientNumber: '205', value: 0 }, { nutrientNumber: '204', value: 2.6 }] },
    { description: 'Granola', brandName: 'Fake Co', servingSize: 50, servingSizeUnit: 'g', foodNutrients: [
      { nutrientNumber: '208', value: 400 }, { nutrientNumber: '203', value: 10 },
      { nutrientNumber: '205', value: 60 }, { nutrientNumber: '204', value: 12 }] },
    { description: 'No energy', foodNutrients: [] },
  ]
  it('maps per 100 g and per serving', () => {
    const out = mapUsdaSearch({ foods })
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ name: 'Chicken Breast, Raw', serving_desc: 'per 100 g', calories: 120, source: 'USDA' })
    expect(out[1]).toMatchObject({ calories: 200, protein_g: 5, carbs_g: 30, fat_g: 6, serving_g: 50 })
  })
})
