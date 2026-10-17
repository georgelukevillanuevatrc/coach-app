import NudgeCards from '../reminders/NudgeCards'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format, parseISO } from 'date-fns'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, Copy, Plus, Settings2 } from 'lucide-react'
import { db } from '../../lib/db'
import { todayStr } from '../../lib/dates'
import type { FoodLog, MealType } from '../../lib/types'
import { Ring } from './Ring'
import { AddSheet } from './AddSheet'
import { EditLogSheet } from './EditLogSheet'
import { ManageSheet } from './ManageSheet'
import { EstimateTag, btnGhost } from './Sheet'
import { MEALS, copyDay, r1, seedFoods } from './data'

const shift = (d: string, n: number) => format(addDays(parseISO(d), n), 'yyyy-MM-dd')

interface Toast { id: number; text: string; undo?: () => void }

export default function Today() {
  const reduce = useReducedMotion()
  const [date, setDate] = useState(todayStr)
  const [addMeal, setAddMeal] = useState<MealType | null>(null)
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [manage, setManage] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(0)

  useEffect(() => { void seedFoods() }, [])

  const targets = useLiveQuery(async () => {
    const all = await db.targets.orderBy('effective_from').toArray()
    all.sort((a, b) => a.effective_from.localeCompare(b.effective_from) || (a.id ?? 0) - (b.id ?? 0))
    return { row: all[all.length - 1] ?? null }
  }, [])
  const logs = useLiveQuery(() => db.food_logs.where('date').equals(date).toArray(), [date], [] as FoodLog[])
  const yCount = useLiveQuery(() => db.food_logs.where('date').equals(shift(date, -1)).count(), [date], 0)

  const totals = useMemo(() => logs.reduce(
    (a, l) => ({ cal: a.cal + l.calories, p: a.p + l.protein_g, c: a.c + l.carbs_g, f: a.f + l.fat_g }),
    { cal: 0, p: 0, c: 0, f: 0 }), [logs])

  const showToast = (text: string, undo?: () => void) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, undo })
    timer.current = window.setTimeout(() => setToast(null), 5000)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const deleteLog = async (l: FoodLog) => {
    await db.food_logs.delete(l.id!)
    showToast(`Removed ${l.name}`, () => { void db.food_logs.put(l) })
  }
  const logged = (text: string, ids: number[]) =>
    showToast(text, () => { void db.food_logs.bulkDelete(ids) })

  if (targets === undefined) return null
  if (!targets.row) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-bold">Today</h1>
        <p className="text-muted">Set up your profile to get calorie and macro targets.</p>
        <Link to="/me" className="flex min-h-12 items-center rounded-xl bg-accent px-6 font-semibold text-white">Set up your profile</Link>
      </div>
    )
  }
  const t = targets.row
  const isToday = date === todayStr()
  const title = isToday ? 'Today' : date === shift(todayStr(), -1) ? 'Yesterday' : date === shift(todayStr(), 1) ? 'Tomorrow' : format(parseISO(date), 'EEEE')
  const remaining = Math.round(t.calories - totals.cal)
  const macros = [
    { label: 'Protein', v: totals.p, t: t.protein_g, cls: 'stroke-protein', txt: 'text-protein' },
    { label: 'Carbs', v: totals.c, t: t.carbs_g, cls: 'stroke-carbs', txt: 'text-carbs' },
    { label: 'Fat', v: totals.f, t: t.fat_g, cls: 'stroke-fat', txt: 'text-fat' },
  ]
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 400, damping: 34 }

  return (
    <div className="mx-auto max-w-lg pb-8">
      <motion.header className="flex items-end justify-between px-4 pb-2 pt-4"
        onPanEnd={(_, i) => {
          if (Math.abs(i.offset.x) > 70 && Math.abs(i.offset.x) > Math.abs(i.offset.y) * 1.5) setDate(shift(date, i.offset.x < 0 ? 1 : -1))
        }} style={{ touchAction: 'pan-y' }}>
        <div>
          <h1 className="text-3xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-muted">{format(parseISO(date), 'EEE, MMM d')}</p>
        </div>
        <div className="flex items-center">
          <button aria-label="Previous day" className="flex h-11 w-11 items-center justify-center text-accent" onClick={() => setDate(shift(date, -1))}><ChevronLeft /></button>
          <button aria-label="Next day" className="flex h-11 w-11 items-center justify-center text-accent" onClick={() => setDate(shift(date, 1))}><ChevronRight /></button>
          <button aria-label="Manage foods and saved meals" className="flex h-11 w-11 items-center justify-center text-accent" onClick={() => setManage(true)}><Settings2 size={22} /></button>
        </div>
      </motion.header>

      <section className="mx-4 rounded-2xl bg-card p-4" aria-label="Daily progress">
        <div className="flex items-center justify-center">
          <Ring value={totals.cal} target={t.calories} size={168} stroke={14} colorClass={remaining < 0 ? 'stroke-protein' : 'stroke-accent'}>
            <span className="text-3xl font-bold tabular-nums">{Math.abs(remaining)}</span>
            <span className="text-xs text-muted">{remaining < 0 ? 'kcal over' : 'kcal left'}</span>
            <span className="mt-0.5 text-[11px] text-muted">{Math.round(totals.cal)} / {t.calories}</span>
          </Ring>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {macros.map((m) => {
            const left = Math.round(m.t - m.v)
            return (
              <div key={m.label} className="flex flex-col items-center">
                <Ring value={m.v} target={m.t} size={72} stroke={8} colorClass={m.cls}>
                  <span className="text-sm font-semibold tabular-nums">{Math.round(m.v)}</span>
                </Ring>
                <span className={`mt-1 text-xs font-medium ${m.txt}`}>{m.label}</span>
                <span className="text-[11px] text-muted">{left >= 0 ? `${left}g left` : `${-left}g over`}</span>
              </div>
            )
          })}
        </div>
      </section>

      <TodaySlot date={date} />

      <div className="mt-4 space-y-3 px-4">
        {MEALS.map((m) => {
          const rows = logs.filter((l) => l.meal_type === m.key).sort((a, b) => a.created_at - b.created_at)
          const kcal = rows.reduce((s, l) => s + l.calories, 0)
          return (
            <section key={m.key} className="overflow-hidden rounded-2xl bg-card" aria-label={m.label}>
              <div className="flex items-center justify-between pl-4">
                <h2 className="text-base font-semibold">{m.label} <span className="ml-1 text-sm font-normal text-muted">{kcal > 0 ? `${kcal} kcal` : ''}</span></h2>
                <button aria-label={`Add food to ${m.label}`} className="flex h-12 w-12 items-center justify-center text-accent" onClick={() => setAddMeal(m.key)}><Plus size={24} /></button>
              </div>
              <AnimatePresence initial={false}>
                {rows.map((l) => (
                  <motion.div key={l.id} layout="position" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
                    <LogRow log={l} onOpen={() => setEditing(l)} onDelete={() => deleteLog(l)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </section>
          )
        })}
        {yCount > 0 && (
          <button className={`${btnGhost} flex w-full items-center justify-center gap-2 bg-card`}
            onClick={async () => { const ids = await copyDay(shift(date, -1), date); logged(`Copied ${ids.length} entries`, ids) }}>
            <Copy size={18} />Copy yesterday&apos;s meals
          </button>
        )}
      </div>

      <AddSheet open={addMeal !== null} meal={addMeal ?? 'breakfast'} date={date} onClose={() => setAddMeal(null)} onLogged={logged} />
      <EditLogSheet log={editing} onClose={() => setEditing(null)} onDelete={deleteLog} />
      <ManageSheet open={manage} onClose={() => setManage(false)} />

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} role="status" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={spring}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex justify-center px-4">
            <div className="pointer-events-auto flex min-h-12 items-center gap-4 rounded-xl bg-ink py-1 pl-4 pr-1 text-bg shadow-lg">
              <span className="text-sm">{toast.text}</span>
              {toast.undo && (
                <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-accent"
                  onClick={() => { toast.undo?.(); setToast(null) }}>Undo</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Reserved for workout / weight cards owned by other tabs; renders nothing for now. */
function TodaySlot({ date }: { date: string }) {
  return date === todayStr() ? <NudgeCards /> : null
}

function LogRow({ log, onOpen, onDelete }: { log: FoodLog; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="relative overflow-hidden border-t border-line">
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-protein text-sm font-semibold text-white" aria-hidden>Delete</div>
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.5, right: 0 }}
        onDragEnd={(_, i) => { if (i.offset.x < -90) onDelete() }}
        onTap={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen() }}
        className="relative flex min-h-14 items-center gap-3 bg-card px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base">{log.name}{log.is_estimate && <EstimateTag />}</p>
          <p className="text-xs text-muted">{log.servings !== 1 ? `${log.servings}x · ` : ''}P {r1(log.protein_g)} · C {r1(log.carbs_g)} · F {r1(log.fat_g)}</p>
        </div>
        <span className="text-sm font-medium tabular-nums">{log.calories}</span>
      </motion.div>
    </div>
  )
}
