import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Minus, Plus, Star, Trash2 } from 'lucide-react'
import { db } from '../../lib/db'
import type { Food, SavedMeal } from '../../lib/types'
import { EstimateTag, Sheet, btnGhost, btnPrimary, inputCls } from './Sheet'
import { FoodForm } from './FoodForm'

type View = { k: 'list' } | { k: 'food'; food?: Food } | { k: 'meal'; meal?: SavedMeal }

export function ManageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'foods' | 'meals'>('foods')
  const [view, setView] = useState<View>({ k: 'list' })
  const foods = useLiveQuery(() => db.foods.toArray(), [], [] as Food[])
  const meals = useLiveQuery(() => db.saved_meals.toArray(), [], [] as SavedMeal[])
  const sorted = [...foods].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name))
  const back = () => setView({ k: 'list' })
  const close = () => { setView({ k: 'list' }); onClose() }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close() }} title="Manage foods" tall>
      {view.k !== 'list' && (
        <button className="mb-2 flex min-h-11 items-center gap-1 self-start text-accent" onClick={back}><ChevronLeft size={20} />Back</button>
      )}

      {view.k === 'list' && (
        <>
          <div className="mb-3 grid shrink-0 grid-cols-2 rounded-xl bg-bg p-1" role="tablist">
            {(['foods', 'meals'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`min-h-10 rounded-lg text-sm font-medium ${tab === t ? 'bg-card shadow-sm' : 'text-muted'}`}>
                {t === 'foods' ? 'My foods' : 'Saved meals'}
              </button>
            ))}
          </div>
          {tab === 'foods' ? (
            <>
              <button className={`${btnPrimary} mb-2`} onClick={() => setView({ k: 'food' })}>New food</button>
              {sorted.map((x) => (
                <div key={x.id} className="flex min-h-14 items-center border-b border-line">
                  <button aria-label={x.is_favorite ? 'Remove favorite' : 'Make favorite'} aria-pressed={x.is_favorite}
                    className="flex h-12 w-12 shrink-0 items-center justify-center"
                    onClick={() => db.foods.update(x.id!, { is_favorite: !x.is_favorite })}>
                    <Star size={20} className={x.is_favorite ? 'fill-fat text-fat' : 'text-muted'} />
                  </button>
                  <button className="min-h-14 min-w-0 flex-1 py-2 text-left" onClick={() => setView({ k: 'food', food: x })}>
                    <span className="block truncate text-base">{x.name}{x.source === 'estimate' && <EstimateTag />}</span>
                    <span className="block truncate text-sm text-muted">{x.serving_desc} · {x.calories} kcal</span>
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <button className={`${btnPrimary} mb-2`} onClick={() => setView({ k: 'meal' })}>New saved meal</button>
              {meals.map((m) => (
                <button key={m.id} className="flex min-h-14 w-full items-center justify-between border-b border-line text-left"
                  onClick={() => setView({ k: 'meal', meal: m })}>
                  <span className="text-base">{m.name}</span><span className="text-sm text-muted">{m.items.length} items</span>
                </button>
              ))}
              {meals.length === 0 && <p className="py-8 text-center text-sm text-muted">Bundle foods you eat together into one tap.</p>}
            </>
          )}
        </>
      )}

      {view.k === 'food' && (
        <>
          <FoodForm key={view.food?.id ?? 'new'} initial={view.food} submitLabel={view.food ? 'Save changes' : 'Add food'}
            onSubmit={async (v) => {
              if (view.food?.id) await db.foods.update(view.food.id, v.food)
              else await db.foods.add(v.food)
              back()
            }} />
          {view.food?.id && (
            <button className={`${btnGhost} mt-2 flex items-center justify-center gap-2 text-protein`}
              onClick={async () => {
                if (!confirm(`Delete ${view.food!.name}? Past logs keep their numbers.`)) return
                await db.foods.delete(view.food!.id!)
                back()
              }}><Trash2 size={18} />Delete food</button>
          )}
        </>
      )}

      {view.k === 'meal' && <MealEditor meal={view.meal} foods={sorted} onDone={back} />}
    </Sheet>
  )
}

function MealEditor({ meal, foods, onDone }: { meal?: SavedMeal; foods: Food[]; onDone: () => void }) {
  const [name, setName] = useState(meal?.name ?? '')
  const [q, setQ] = useState('')
  const [qty, setQty] = useState<Record<number, number>>(() =>
    Object.fromEntries((meal?.items ?? []).map((i) => [i.food_id, i.servings])))
  const set = (id: number, n: number) => setQty((p) => ({ ...p, [id]: Math.max(0, Math.round(n * 2) / 2) }))
  const chosen = Object.entries(qty).filter(([, v]) => v > 0)
  const shown = foods.filter((f) => !q.trim() || f.name.toLowerCase().includes(q.trim().toLowerCase()))

  const save = async () => {
    const items = chosen.map(([id, servings]) => ({ food_id: Number(id), servings }))
    if (meal?.id) await db.saved_meals.update(meal.id, { name: name.trim(), items })
    else await db.saved_meals.add({ name: name.trim(), items })
    onDone()
  }

  return (
    <>
      <input className={`${inputCls} mb-2`} placeholder="Meal name (e.g. Usual lunch)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={`${inputCls} mb-2`} type="search" placeholder="Search foods" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="min-h-0 flex-1">
        {shown.map((f) => {
          const v = qty[f.id!] ?? 0
          return (
            <div key={f.id} className="flex min-h-14 items-center gap-2 border-b border-line">
              <span className="min-w-0 flex-1 truncate text-base">{f.name}</span>
              {v > 0 && <button aria-label={`Less ${f.name}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-line" onClick={() => set(f.id!, v - 0.5)}><Minus size={18} /></button>}
              {v > 0 && <span className="w-8 text-center tabular-nums">{v}</span>}
              <button aria-label={`Add ${f.name}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-line" onClick={() => set(f.id!, v + (v === 0 ? 1 : 0.5))}><Plus size={18} /></button>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-2">
        {meal?.id && (
          <button aria-label="Delete saved meal" className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-line text-protein"
            onClick={async () => { if (confirm(`Delete ${meal.name}?`)) { await db.saved_meals.delete(meal.id!); onDone() } }}><Trash2 size={18} /></button>
        )}
        <button className={`${btnPrimary} flex-1`} disabled={!name.trim() || chosen.length === 0} onClick={save}>
          Save meal ({chosen.length} items)
        </button>
      </div>
    </>
  )
}
