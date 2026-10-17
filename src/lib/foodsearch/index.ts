import { mapOffProduct, mapUsdaFood, type OffProduct, type SearchFood, type UsdaFood } from './map'

export * from './map'

export const USDA_KEY_STORAGE = 'usda_key'
const OFF = 'https://world.openfoodfacts.org'

export function getUsdaKey(): string {
  try { return localStorage.getItem(USDA_KEY_STORAGE)?.trim() ?? '' } catch { return '' }
}
export function setUsdaKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(USDA_KEY_STORAGE, key.trim())
    else localStorage.removeItem(USDA_KEY_STORAGE)
  } catch { /* ignore */ }
}

export function offSearchUrl(q: string): string {
  const p = new URLSearchParams({
    search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '20',
    fields: 'code,product_name,brands,serving_size,serving_quantity,nutriments',
  })
  return `${OFF}/cgi/search.pl?${p.toString()}`
}
export const offProductUrl = (code: string) =>
  `${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,serving_size,serving_quantity,nutriments`

export function usdaSearchUrl(q: string, key: string): string {
  const p = new URLSearchParams({ query: q, pageSize: '20', api_key: key })
  return `https://api.nal.usda.gov/fdc/v1/foods/search?${p.toString()}`
}

export function mapOffSearch(json: { products?: OffProduct[] }): SearchFood[] {
  return (json.products ?? []).map(mapOffProduct).filter((x): x is SearchFood => x != null)
}
export function mapUsdaSearch(json: { foods?: UsdaFood[] }): SearchFood[] {
  return (json.foods ?? []).map(mapUsdaFood).filter((x): x is SearchFood => x != null)
}

export async function searchOff(q: string, signal?: AbortSignal): Promise<SearchFood[]> {
  const res = await fetch(offSearchUrl(q), { signal })
  if (!res.ok) throw new Error(`OFF ${res.status}`)
  return mapOffSearch(await res.json())
}
export async function searchUsda(q: string, key: string, signal?: AbortSignal): Promise<SearchFood[]> {
  const res = await fetch(usdaSearchUrl(q, key), { signal })
  if (!res.ok) throw new Error(`USDA ${res.status}`)
  return mapUsdaSearch(await res.json())
}

/** Returns null when the barcode is not in Open Food Facts (or has no usable nutrition). */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<SearchFood | null> {
  const res = await fetch(offProductUrl(code.trim()), { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`OFF ${res.status}`)
  return mapOffBarcode(await res.json())
}
export function mapOffBarcode(json: { status?: number; product?: OffProduct }): SearchFood | null {
  if (json.status === 0 || !json.product) return null
  return mapOffProduct(json.product)
}
