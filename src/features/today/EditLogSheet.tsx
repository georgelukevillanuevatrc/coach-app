import { useEffect, useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { db } from '../../lib/db'
import type { FoodLog } from '../../lib/types'
import { EstimateTag, Sheet, btnPrimary, inputCls } from './Sheet'
import { MEALS, r1 } from './data'

export function EditLogSheet({ log, onClose, onDelete }: {
  log: FoodLog | null; onClose: () => void; onDelete: (l: FoodLog) => void
}) {
  const [s, setS] = useState(1)
  const [meal, setMeal] = useState<FoodLog['meal_type']>('breakfast')
  const [last, setLast] = useState<FoodLog | null>(null)
  useEffect(() => { if (log) { setS(log.servings); setMeal(log.meal_type); setLast(log) } }, [log])
  const l = log ?? last
  if (!l) return null
  const per = (v: number) => v / l.servings
  const clamp = (n: number) => Math.min(20, Math.max(0.25, Math.round(n * 4) / 4))
  const kcal = Math.round(per(l.calories) * s)

  const save = async () => {
    await db.food_logs.update(l.id!, {
      servings: s, meal_type: meal, calories: kcal,
      protein_g: r1(per(l.protein_g) * s), carbs_g: r1(per(l.carbs_g) * s), fat_g: r1(per(l.fat_g) * s),
    })
    onClose()
  }

  return (
    <Sheet open={!!log} onOpenChange={(o) => { if (!o) onClose() }} title={l.name}>
      {l.is_estimate && <p className="-mt-1 mb-2"><EstimateTag /></p>}
      <div className="flex items-center justify-center gap-4 py-2">
        <button aria-label="Fewer servings" className="flex h-12 w-12 items-center justify-center rounded-full border border-line active:opacity-60" onClick={() => setS(clamp(s - 0.25))}><Minus /></button>
        <div className="w-28 text-center">
          <input aria-label="Servings" inputMode="decimal" className={`${inputCls} text-center text-xl font-semibold`} value={String(s)}
            onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n) && n > 0) setS(Math.min(50, n)) }} />
          <span className="text-xs text-muted">servings</span>
        </div>
        <button aria-label="More servings" className="flex h-12 w-12 items-center justify-center rounded-full border border-line active:opacity-60" onClick={() => setS(clamp(s + 0.25))}><Plus /></button>
      </div>
      <input type="range" aria-label="Servings slider" min={0.25} max={6} step={0.25} value={Math.min(6, s)}
        onChange={(e) => setS(parseFloat(e.target.value))} className="h-11 w-full accent-accent" />
      <p className="py-2 text-center text-sm">
        <b>{kcal} kcal</b>
        <span className="text-protein"> · P {r1(per(l.protein_g) * s)}g</span>
        <span className="text-carbs"> · C {r1(per(l.carbs_g) * s)}g</span>
        <span className="text-fat"> · F {r1(per(l.fat_g) * s)}g</span>
      </p>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-bg p-1">
        {MEALS.map((m) => (
          <button key={m.key} onClick={() => setMeal(m.key)}
            className={`min-h-10 rounded-lg text-sm ${meal === m.key ? 'bg-card font-medium shadow-sm' : 'text-muted'}`}>{m.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-4 text-protein active:opacity-60"
          onClick={() => { onDelete(l); onClose() }}><Trash2 size={18} />Delete</button>
        <button className={`${btnPrimary} flex-1`} onClick={save}>Save</button>
      </div>
    </Sheet>
  )
}
