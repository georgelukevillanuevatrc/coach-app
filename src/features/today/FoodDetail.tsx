import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { db } from '../../lib/db'
import type { Food } from '../../lib/types'
import { btnGhost, btnPrimary } from './Sheet'
import { r1 } from './data'

/** Shows macros for an online food, a serving stepper, one-tap log, and Save to My foods. */
export function FoodDetail({ food, label, onBack, onLog }: {
  food: Omit<Food, 'id'>; label: string; onBack: () => void
  onLog: (food: Food, servings: number) => Promise<void>
}) {
  const [servings, setServings] = useState(1)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const step = (d: number) => setServings((s) => Math.min(20, Math.max(0.5, r1(s + d))))

  const save = async () => {
    if (savedId != null) return
    setSavedId((await db.foods.add({ ...food })) as number)
  }
  const log = async () => {
    setBusy(true)
    try { await onLog({ ...food, id: savedId ?? undefined }, servings) } finally { setBusy(false) }
  }
  const m = (l: string, v: number, c: string) => (
    <div className="flex-1 rounded-xl bg-bg p-2 text-center">
      <div className={`text-xs font-medium ${c}`}>{l}</div>
      <div className="text-base font-semibold">{r1(v * servings)} g</div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 pb-2">
      <button className="min-h-11 self-start text-sm font-medium text-accent" onClick={onBack}>Back to results</button>
      <div>
        <h3 className="text-lg font-semibold">{food.name}</h3>
        <p className="text-sm text-muted">{food.serving_desc} · Open Food Facts data, check the label</p>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-line p-2">
        <button aria-label="Fewer servings" className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg active:opacity-60" onClick={() => step(-0.5)}><Minus size={18} /></button>
        <div className="text-center">
          <div className="text-xl font-semibold">{servings}x</div>
          <div className="text-xs text-muted">{Math.round(food.calories * servings)} kcal</div>
        </div>
        <button aria-label="More servings" className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg active:opacity-60" onClick={() => step(0.5)}><Plus size={18} /></button>
      </div>
      <div className="flex gap-2">
        {m('Protein', food.protein_g, 'text-protein')}
        {m('Carbs', food.carbs_g, 'text-carbs')}
        {m('Fat', food.fat_g, 'text-fat')}
      </div>
      <button className={btnPrimary} disabled={busy} onClick={log}>{label}</button>
      <button className={btnGhost} disabled={savedId != null} onClick={save}>{savedId != null ? 'Saved to My foods' : 'Save to My foods'}</button>
    </div>
  )
}
