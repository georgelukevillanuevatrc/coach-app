import { useState } from 'react'
import type { Food } from '../../lib/types'
import { btnPrimary, inputCls } from './Sheet'
import { num } from './data'

export interface FoodFormValues {
  food: Omit<Food, 'id'>
  estimate: boolean
  save: boolean
}

export function FoodForm({ initial, showSave, submitLabel, onSubmit }: {
  initial?: Partial<Food>; showSave?: boolean; submitLabel: string; onSubmit: (v: FoodFormValues) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [serving, setServing] = useState(initial?.serving_desc ?? '1 serving')
  const [cal, setCal] = useState(initial?.calories != null ? String(initial.calories) : '')
  const [p, setP] = useState(initial?.protein_g != null ? String(initial.protein_g) : '')
  const [c, setC] = useState(initial?.carbs_g != null ? String(initial.carbs_g) : '')
  const [fa, setFa] = useState(initial?.fat_g != null ? String(initial.fat_g) : '')
  const [estimate, setEstimate] = useState(initial?.source === 'estimate')
  const [save, setSave] = useState(false)
  const valid = name.trim().length > 0 && num(cal) > 0

  const submit = () => {
    if (!valid) return
    const source = estimate ? 'estimate' : initial?.source && initial.source !== 'estimate' ? initial.source : 'manual'
    onSubmit({
      estimate, save,
      food: {
        name: name.trim(), serving_desc: serving.trim() || '1 serving', serving_g: initial?.serving_g ?? 0,
        calories: Math.round(num(cal)), protein_g: num(p), carbs_g: num(c), fat_g: num(fa),
        source, is_favorite: initial?.is_favorite ?? false,
      },
    })
  }

  const macro = (label: string, val: string, set: (s: string) => void, color: string) => (
    <label className="flex-1">
      <span className={`mb-1 block text-xs font-medium ${color}`}>{label} (g)</span>
      <input className={inputCls} inputMode="decimal" value={val} onChange={(e) => set(e.target.value)} placeholder="0" />
    </label>
  )

  return (
    <form className="flex flex-col gap-3 pb-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <label>
        <span className="mb-1 block text-xs font-medium text-muted">Name</span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken inasal" autoCapitalize="sentences" />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-muted">Serving</span>
        <input className={inputCls} value={serving} onChange={(e) => setServing(e.target.value)} placeholder="1 cup" />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-muted">Calories (per serving)</span>
        <input className={inputCls} inputMode="numeric" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="0" />
      </label>
      <div className="flex gap-2">
        {macro('Protein', p, setP, 'text-protein')}
        {macro('Carbs', c, setC, 'text-carbs')}
        {macro('Fat', fa, setFa, 'text-fat')}
      </div>
      <button type="button" role="switch" aria-checked={estimate} onClick={() => setEstimate(!estimate)}
        className="flex min-h-11 items-center justify-between rounded-xl border border-line px-3 text-left">
        <span><span className="block text-base">Estimate</span><span className="block text-xs text-muted">Numbers are a guess; tag as estimate</span></span>
        <span className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${estimate ? 'bg-accent' : 'bg-line'}`}>
          <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${estimate ? 'translate-x-5' : ''}`} />
        </span>
      </button>
      {showSave && (
        <label className="flex min-h-11 items-center gap-3 px-1">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <span className="text-base">Save to My foods</span>
        </label>
      )}
      <button type="submit" disabled={!valid} className={btnPrimary}>{submitLabel}</button>
    </form>
  )
}
