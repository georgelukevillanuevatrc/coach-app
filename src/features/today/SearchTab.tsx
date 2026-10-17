import { useEffect, useMemo, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { searchLocal } from '../../lib/foodsearch/localFoods'
import { getUsdaKey, searchOff, searchUsda, setUsdaKey, type SearchFood } from '../../lib/foodsearch'
import type { Food } from '../../lib/types'
import { FoodDetail } from './FoodDetail'
import { ScanSheet } from './ScanSheet'
import { btnGhost, inputCls } from './Sheet'

type Online = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; items: SearchFood[] }

export function SearchTab({ q, meal, onLog }: {
  q: string; meal: string; onLog: (food: Food, servings: number) => Promise<void>
}) {
  const [state, setState] = useState<Online>({ kind: 'idle' })
  const [picked, setPicked] = useState<SearchFood | null>(null)
  const [scan, setScan] = useState(false)
  const [key, setKey] = useState(getUsdaKey)
  const [showKey, setShowKey] = useState(false)
  const term = q.trim()
  const local = useMemo(() => searchLocal(term), [term])

  useEffect(() => {
    if (term.length < 2) { setState({ kind: 'idle' }); return }
    setState({ kind: 'loading' })
    const ctl = new AbortController()
    const t = window.setTimeout(async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) { setState({ kind: 'error' }); return }
      try {
        const usda = key.trim()
        const [off, us] = await Promise.all([
          searchOff(term, ctl.signal),
          usda ? searchUsda(term, usda, ctl.signal).catch(() => [] as SearchFood[]) : Promise.resolve([] as SearchFood[]),
        ])
        if (!ctl.signal.aborted) setState({ kind: 'done', items: [...us, ...off] })
      } catch {
        if (!ctl.signal.aborted) setState({ kind: 'error' })
      }
    }, 450)
    return () => { window.clearTimeout(t); ctl.abort() }
  }, [term, key])

  if (picked) {
    return <FoodDetail food={picked} label={`Add to ${meal}`} onBack={() => setPicked(null)} onLog={onLog} />
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <button className={`${btnGhost} flex flex-1 items-center justify-center gap-2`} onClick={() => setScan(true)}>
          <ScanLine size={18} /> Scan barcode
        </button>
        <button className={btnGhost} onClick={() => setShowKey(!showKey)} aria-expanded={showKey}>USDA</button>
      </div>
      {showKey && (
        <label className="mb-2 block">
          <span className="mb-1 block text-xs font-medium text-muted">USDA FoodData Central key (optional, stays on this device)</span>
          <input className={inputCls} value={key} placeholder="Paste key" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={(e) => { setKey(e.target.value); setUsdaKey(e.target.value) }} />
        </label>
      )}

      {term.length < 2 && <p className="py-10 text-center text-sm text-muted">Type at least 2 letters to search {key.trim() ? 'built-in foods, Open Food Facts and USDA' : 'built-in foods and Open Food Facts'}.</p>}

      {local.length > 0 && (
        <>
          <p className="pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted">Common foods</p>
          {local.map((x) => <ResultRow key={`local-${x.name}`} x={x} onPick={setPicked} />)}
        </>
      )}

      {term.length >= 2 && (
        <>
          {state.kind === 'loading' && (
            <div aria-busy="true" aria-label="Loading online results">
              <p className="pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted">Searching online...</p>
              {[0, 1].map((i) => (
                <div key={i} className="flex min-h-14 items-center gap-3 border-b border-line py-2">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-line" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
                  </div>
                  <div className="h-4 w-12 animate-pulse rounded bg-line" />
                </div>
              ))}
            </div>
          )}
          {state.kind === 'done' && state.items.length > 0 && (
            <>
              <p className="pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted">Online results</p>
              {state.items.map((x, i) => <ResultRow key={`${x.source}-${i}-${x.name}`} x={x} onPick={setPicked} />)}
            </>
          )}
          {state.kind === 'error' && (
            <p className="pt-3 text-center text-sm text-muted" role="status">
              Online search is unavailable right now{local.length ? '.' : ', and nothing built-in matched. Try another word, or use Manual.'}
            </p>
          )}
          {state.kind === 'done' && state.items.length === 0 && local.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">No results. Try another word, or use Manual.</p>
          )}
        </>
      )}

      <ScanSheet open={scan} onClose={() => setScan(false)} onFound={(f) => { setPicked(f); setScan(false) }} />
    </div>
  )
}

function ResultRow({ x, onPick }: { x: SearchFood; onPick: (f: SearchFood) => void }) {
  return (
    <button className="flex min-h-14 w-full items-center gap-3 border-b border-line py-2 text-left active:opacity-60" onClick={() => onPick(x)}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base">{x.name}</span>
        <span className="block truncate text-sm text-muted">{x.serving_desc} · P {x.protein_g}g · C {x.carbs_g}g · F {x.fat_g}g</span>
      </span>
      <span className="text-sm font-medium">{x.calories} kcal</span>
    </button>
  )
}
