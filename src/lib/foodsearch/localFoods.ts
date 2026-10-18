import type { SearchFood } from './map'

// Built-in estimates so search works instantly and offline. Values are typical, not lab-exact.
import { ROWS as CORE } from './rows/core'
import { ROWS as PH } from './rows/ph'
import { ROWS as CHAINS } from './rows/chains'
import { ROWS as GENERAL } from './rows/general'
import { ROWS as ALCOHOL } from './rows/alcohol'

const seen = new Set<string>()
const ROWS = [...CORE, ...PH, ...CHAINS, ...GENERAL, ...ALCOHOL].filter((r) => {
  const k = r[0].toLowerCase()
  if (seen.has(k)) return false
  seen.add(k)
  return true
})

export const LOCAL_FOODS: SearchFood[] = ROWS.map(([name, serving, g, kcal, p, c, f, extra]) => ({
  name, serving_desc: `${serving} (${g} g)`, serving_g: g, calories: kcal, protein_g: p, carbs_g: c, fat_g: f,
  source: 'estimate', is_favorite: false, ...(extra ? { search: extra } : {}),
} as SearchFood & { search?: string }))

const keys = new Map<SearchFood, string>(
  ROWS.map((r, i) => [LOCAL_FOODS[i], `${r[0]} ${r[7] ?? ''}`.toLowerCase()]),
)

/** Edit distance, giving up early once it exceeds `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return false
    prev = cur
  }
  return prev[b.length] <= max
}
const keyWords = new Map<SearchFood, string[]>([...keys].map(([f, k]) => [f, k.split(/[^a-z0-9]+/).filter(Boolean)]))
const tolerance = (w: string) => (w.length <= 3 ? 0 : w.length <= 6 ? 1 : 2)

/** Typo-tolerant fallback: every query word must be close to some word (or word prefix) of the food. */
function searchFuzzy(words: string[]): SearchFood[] {
  return LOCAL_FOODS.filter((f) => {
    const kw = keyWords.get(f)!
    return words.every((w) => kw.some((k) => k.includes(w) || within(w, k, tolerance(w)) || (w.length >= 5 && within(w, k.slice(0, w.length), tolerance(w)))))
  })
}

/** Case-insensitive match on every word; name matches rank first. Falls back to typo-tolerant matching. Pure and instant. */
export function searchLocal(q: string, limit = 25): SearchFood[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  let hits = LOCAL_FOODS.filter((f) => words.every((w) => keys.get(f)!.includes(w)))
  if (hits.length < 3) {
    const have = new Set(hits)
    hits = [...hits, ...searchFuzzy(words).filter((f) => !have.has(f))]
  }
  // Rank: a word in the name starts with the query first, then source order (staples are listed first).
  const rank = (f: SearchFood) => (f.name.toLowerCase().split(/[\s(/-]+/).some((w) => w.startsWith(words[0])) ? 0 : 1)
  const order = new Map(LOCAL_FOODS.map((f, i) => [f, i]))
  return hits.sort((a, b) => rank(a) - rank(b) || order.get(a)! - order.get(b)!).slice(0, limit)
}
