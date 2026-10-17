import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Star } from 'lucide-react'
import { db } from '../../lib/db'
import type { Food, FoodLog, MealType } from '../../lib/types'
import { EstimateTag, Sheet, inputCls } from './Sheet'
import { SearchTab } from './SearchTab'
import { FoodForm, type FoodFormValues } from './FoodForm'
import { MEALS, logFood, logSavedMeal } from './data'

type Tab = 'recents' | 'foods' | 'meals' | 'search' | 'manual'
const TABS: { key: Tab; label: string }[] = [
  { key: 'recents', label: 'Recents' }, { key: 'foods', label: 'My foods' },
  { key: 'meals', label: 'Meals' }, { key: 'search', label: 'Search' }, { key: 'manual', label: 'Manual' },
]

const rowCls = 'flex min-h-14 w-full items-center gap-3 border-b border-line py-2 text-left active:opacity-60'

export function AddSheet({ open, meal, date, onClose, onLogged }: {
  open: boolean; meal: MealType; date: string; onClose: () => void
  onLogged: (text: string, ids: number[]) => void
}) {
  const [tab, setTab] = useState<Tab>('recents')
  const [q, setQ] = useState('')
  const foods = useLiveQuery(() => db.foods.toArray(), [], [] as Food[])
  const meals = useLiveQuery(() => db.saved_meals.toArray(), [], [])
  const recents = useLiveQuery(async () => {
    const logs = await db.food_logs.orderBy('id').reverse().limit(300).toArray()
    const seen = new Set<string>()
    const out: FoodLog[] = []
    for (const l of logs) {
      const k = l.name.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k); out.push(l)
      if (out.length >= 15) break
    }
    return out
  }, [], [] as FoodLog[])

  const label = MEALS.find((m) => m.key === meal)?.label ?? ''
  const ql = q.trim().toLowerCase()
  const match = (n: string) => !ql || n.toLowerCase().includes(ql)

  const done = (text: string, ids: number[]) => { onLogged(text, ids); onClose(); setQ('') }

  const addFood = async (food: Food) => done(`Added ${food.name}`, [await logFood(food, 1, meal, date)])
  const addRecent = async (l: FoodLog) => {
    const id = (await db.food_logs.add({
      date, meal_type: meal, food_id: l.food_id, name: l.name, servings: l.servings,
      calories: l.calories, protein_g: l.protein_g, carbs_g: l.carbs_g, fat_g: l.fat_g,
      is_estimate: l.is_estimate, created_at: Date.now(),
    })) as number
    done(`Added ${l.name}`, [id])
  }
  const manual = async (v: FoodFormValues) => {
    let food: Food = { ...v.food }
    if (v.save) food = { ...food, id: (await db.foods.add(food)) as number }
    const id = await logFood(food, 1, meal, date)
    if (!v.save) await db.food_logs.update(id, { food_id: undefined })
    done(`Added ${food.name}`, [id])
  }
  const logOnline = async (food: Food, servings: number) => {
    const id = await logFood(food, servings, meal, date)
    if (food.id == null) await db.food_logs.update(id, { food_id: undefined })
    done(`Added ${food.name}`, [id])
  }
  const addMeal = async (id: number) => {
    const m = await db.saved_meals.get(id)
    if (!m) return
    done(`Added ${m.name}`, await logSavedMeal(m.items, meal, date))
  }

  const sortedFoods = [...foods].filter((x) => match(x.name))
    .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name))

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }} title={`Add to ${label}`} tall>
      <div className="mb-3 grid shrink-0 grid-cols-5 rounded-xl bg-bg p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`min-h-11 rounded-lg text-[13px] font-medium ${tab === t.key ? 'bg-card shadow-sm' : 'text-muted'}`}>{t.label}</button>
        ))}
      </div>
      {tab !== 'manual' && (
        <input className={`${inputCls} mb-2 shrink-0`} type="search" inputMode="search" placeholder={tab === 'search' ? 'Search foods online' : 'Search'} value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      {tab === 'recents' && (
        <div>
          {recents.filter((l) => match(l.name)).map((l) => (
            <button key={l.id} className={rowCls} onClick={() => addRecent(l)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base">{l.name}{l.is_estimate && <EstimateTag />}</span>
                <span className="block text-sm text-muted">{l.servings}x · P {l.protein_g}g · C {l.carbs_g}g · F {l.fat_g}g</span>
              </span>
              <span className="text-sm font-medium">{l.calories} kcal</span>
            </button>
          ))}
          {recents.length === 0 && <Empty text="Foods you log will show up here." />}
        </div>
      )}

      {tab === 'foods' && (
        <div>
          {sortedFoods.map((x) => (
            <button key={x.id} className={rowCls} onClick={() => addFood(x)}>
              {x.is_favorite && <Star size={16} className="shrink-0 fill-fat text-fat" aria-label="Favorite" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base">{x.name}{x.source === 'estimate' && <EstimateTag />}</span>
                <span className="block truncate text-sm text-muted">{x.serving_desc} · P {x.protein_g}g · C {x.carbs_g}g · F {x.fat_g}g</span>
              </span>
              <span className="text-sm font-medium">{x.calories} kcal</span>
            </button>
          ))}
          {sortedFoods.length === 0 && <Empty text="No foods found. Use Manual to add one." />}
        </div>
      )}

      {tab === 'meals' && (
        <div>
          {meals.filter((m) => match(m.name)).map((m) => (
            <button key={m.id} className={rowCls} onClick={() => addMeal(m.id!)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base">{m.name}</span>
                <span className="block text-sm text-muted">{m.items.length} items</span>
              </span>
              <span className="text-sm font-medium text-accent">Add all</span>
            </button>
          ))}
          {meals.length === 0 && <Empty text="No saved meals yet. Create one from Today > Manage." />}
        </div>
      )}

      {tab === 'search' && <SearchTab q={q} meal={label} onLog={logOnline} />}

      {tab === 'manual' && <FoodForm showSave submitLabel={`Add to ${label}`} onSubmit={manual} />}
    </Sheet>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted">{text}</p>
}
