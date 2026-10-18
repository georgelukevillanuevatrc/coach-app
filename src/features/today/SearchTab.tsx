import { useEffect, useMemo, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { searchLocal } from '../../lib/foodsearch/localFoods'
import { DEMO_KEY, getUsdaKey, searchOff, searchUsda, setUsdaKey, type SearchFood } from '../../lib/foodsearch'
import type { Food } from '../../lib/types'
import { FoodDetail } from './FoodDetail'
import { ScanSheet } from './ScanSheet'
import { btnGhost, inputCls } from './Sheet'

type Online = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; items: SearchFood[] }

export function SearchTab({ q, meal, onLog, onAddManual }: {
  q: string; meal: string; onLog: (food: Food, servings: number) => Promise<void>; onAddManual: (name: string) => void
}) {
  const [state, setState] = useState<Online>({ kind: 'idle' })
  const [picked, setPicked] = useState<SearchFood | null>(null)
  const [scan, setScan] = useState(false)
  const [key, setKey] = useState(getUsdaKey)
  const [showKey, setShowKey] = useState(false)
  const term = q.trim()
  const mine = useLiveQuery(() => db.foods.toArray(), [], [] as Food[])
  const local = useMemo(() => {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean)
    const own = words.length ? mine.filter((f) => words.every((w) => f.name.toLowerCase().includes(w))) : []
    const names = new Set(own.map((f) => f.name.toLowerCase()))
    return [...own, ...searchLocal(term).filter((f) => !names.has(f.name.toLowerCase()))]
  }, [term, mine])

  useEffect(() => {
    if (term.length < 2) { setState({ kind: 'idle' }); return }
    setState({ kind: 'loading' })
    const ctl = new AbortController()
    const t = window.setTimeout(async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) { setState({ kind: 'error' }); return }
      try {
        const usda = key.trim() || DEMO_KEY
        const [off, us] = await Promise.all([
          searchOff(term, ctl.signal).catch(() => [] as SearchFood[]),
          searchUsda(term, usda, ctl.signal).catch(() => [] as SearchFood[]),
        ])
        if (!ctl.signal.aborted) setState(us.length + off.length ? { kind: 'done', items: [...us, ...off] } : { kind: 'error' })
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
          <span className="mb-1 block text-xs font-medium text-muted">USDA FoodData Central key. Optional: without one, a shared demo key is used (about 10 searches an hour). Free at fdc.nal.usda.gov. Stays on this device.</span>
          <input className={inputCls} value={key} placeholder="Paste key" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={(e) => { setKey(e.target.value); setUsdaKey(e.target.value) }} />
        </label>
      )}

      {term.length < 2 && <p className="py-10 text-center text-sm text-muted">Type at least 2 letters to search built-in foods, USDA and Open Food Facts.</p>}

      {local.length > 0 && (
        <>
          <p className="pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted">My foods and common foods</p>
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
              No online results right now{local.length ? '.' : ' and nothing built-in matched.'}
            </p>
          )}
          <button onClick={() => onAddManual(term)} className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-dashed border-accent px-4 text-left font-medium text-accent">
            <span className="truncate">Can't find it? Add "{term}" yourself</span><span aria-hidden>+</span>
          </button>
          <p className="mt-2 text-center text-xs text-muted">Saved foods show up in My foods and in search next time.</p>
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
