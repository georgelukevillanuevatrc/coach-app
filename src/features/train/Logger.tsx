import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, Minus, Plus, Timer, Trophy } from 'lucide-react'
import { db } from '../../lib/db'
import { todayStr } from '../../lib/dates'
import { deloadSets, isDeloadWeek, isPR, nextTarget, weekIndex, type SetLite, type Target } from '../../coach/progression'
import { allSets, fmtKg, lastSession, type LastInfo, type TrainData } from './data'
import { btnPrimary, card } from './ui'

interface Row { w: string; r: string; done: boolean }
interface Draft { dayId: number; startedAt: number; rows: Record<number, Row[]> }
const KEY = 'coach.train.draft'
export const loadDraft = (): Draft | null => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const saveDraft = (d: Draft | null) => { try { d ? localStorage.setItem(KEY, JSON.stringify(d)) : localStorage.removeItem(KEY) } catch { /* private mode */ } }
const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Logger({ data }: { data: TrainData }) {
  const { dayId } = useParams()
  const nav = useNavigate()
  const day = data.days.find((d) => d.id === Number(dayId))
  const deload = !!data.plan && isDeloadWeek(weekIndex(data.plan.start_date, todayStr()))
  const [info, setInfo] = useState<Record<number, { last: LastInfo; target: Target }> | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [summary, setSummary] = useState<{ prs: string[]; sets: number; volume: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const init = useRef(false)

  const planned = useMemo(() => day?.exercises.map((e) => ({ ...e, sets: deload ? deloadSets(e.sets) : e.sets, ex: data.exercises.find((x) => x.id === e.exercise_id) })) ?? [], [day, deload, data.exercises])

  useEffect(() => {
    if (!day || init.current || !data.exercises.length) return
    init.current = true
    ;(async () => {
      const out: Record<number, { last: LastInfo; target: Target }> = {}
      for (const p of planned) {
        const last = await lastSession(p.exercise_id)
        out[p.exercise_id] = { last, target: nextTarget(last.sets, p.rep_min, p.rep_max, !!p.ex?.is_lower) }
      }
      setInfo(out)
      const saved = loadDraft()
      if (saved && saved.dayId === day.id) { setDraft(saved); return }
      const rows: Record<number, Row[]> = {}
      for (const p of planned) {
        const t = out[p.exercise_id].target
        rows[p.exercise_id] = Array.from({ length: p.sets }, () => ({ w: t.weight_kg ? String(t.weight_kg) : '', r: String(t.reps), done: false }))
      }
      const d = { dayId: day.id, startedAt: Date.now(), rows }
      saveDraft(d); setDraft(d)
    })()
  }, [day, planned, data.exercises.length])

  useEffect(() => {
    if (!rest) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [rest])
  const left = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0
  useEffect(() => {
    if (rest && left === 0) { try { navigator.vibrate?.(200) } catch { /* unsupported */ } const t = setTimeout(() => setRest(null), 1500); return () => clearTimeout(t) }
  }, [rest, left])

  if (!day) return <div className="p-4"><p className="text-muted">Workout not found.</p><button className={btnPrimary} onClick={() => nav('/train')}>Back</button></div>

  const update = (fn: (rows: Record<number, Row[]>) => Record<number, Row[]>) =>
    setDraft((d) => { if (!d) return d; const n = { ...d, rows: fn(d.rows) }; saveDraft(n); return n })
  const setRow = (exId: number, i: number, p: Partial<Row>) => update((r) => ({ ...r, [exId]: r[exId].map((x, k) => (k === i ? { ...x, ...p } : x)) }))

  const toggle = (exId: number, i: number, compound: boolean) => {
    const row = draft!.rows[exId][i]
    setRow(exId, i, { done: !row.done })
    if (!row.done) { const s = compound ? 120 : 75; setNow(Date.now()); setRest({ end: Date.now() + s * 1000, total: s }) }
  }
  const doneCount = draft ? Object.values(draft.rows).flat().filter((r) => r.done && num(r.r) > 0).length : 0

  const finish = async () => {
    if (!draft || saving) return
    setSaving(true)
    const prs: string[] = []
    let sets = 0, volume = 0
    const history: Record<number, SetLite[]> = {}
    for (const p of planned) history[p.exercise_id] = (await allSets(p.exercise_id)).map((s) => ({ weight_kg: s.weight_kg, reps: s.reps }))
    const logs: Omit<import('../../lib/types').SetLog, 'id' | 'session_id'>[] = []
    for (const p of planned) {
      const prev = [...history[p.exercise_id]]
      let n = 0
      for (const r of draft.rows[p.exercise_id] ?? []) {
        if (!r.done || num(r.r) <= 0) continue
        const s = { weight_kg: num(r.w), reps: Math.round(num(r.r)) }
        const pr = isPR(s, prev)
        prev.push(s); n++; sets++; volume += s.weight_kg * s.reps
        if (pr && !prs.includes(p.ex?.name ?? '')) prs.push(p.ex?.name ?? 'Exercise')
        logs.push({ exercise_id: p.exercise_id, set_no: n, ...s, is_pr: pr })
      }
    }
    await db.transaction('rw', db.workout_sessions, db.set_logs, async () => {
      const sid = (await db.workout_sessions.add({ plan_day_id: day.id, date: todayStr(), started_at: draft.startedAt, finished_at: Date.now() })) as number
      await db.set_logs.bulkAdd(logs.map((l) => ({ ...l, session_id: sid })))
    })
    saveDraft(null)
    setSummary({ prs, sets, volume })
    setSaving(false)
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-md p-4 pt-10 text-center">
        <Trophy size={48} className="mx-auto text-fat" />
        <h1 className="mt-3 text-2xl font-bold">Session done</h1>
        <p className="mt-1 text-muted">{summary.sets} sets · {Math.round(summary.volume).toLocaleString()} kg volume</p>
        {summary.prs.length > 0 ? (
          <div className={`${card} mt-5 p-4 text-left`}>
            <h2 className="text-sm font-semibold uppercase text-muted">New personal records</h2>
            <ul className="mt-2 space-y-1">{summary.prs.map((n) => <li key={n} className="flex items-center gap-2"><Trophy size={16} className="text-fat" />{n}</li>)}</ul>
          </div>
        ) : <p className="mt-5 text-sm text-muted">Solid work. Small steps add up.</p>}
        <button className={`${btnPrimary} mt-6 w-full`} onClick={() => nav('/train', { replace: true })}>Done</button>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <header className="sticky top-0 z-10 flex items-center gap-1 bg-bg/90 px-2 py-1 backdrop-blur">
        <button aria-label="Back" onClick={() => nav('/train')} className="grid size-11 place-items-center text-accent"><ChevronLeft size={24} /></button>
        <div className="flex-1"><h1 className="text-lg font-semibold leading-tight">{day.name}</h1><p className="text-xs text-muted">{deload ? 'Deload week: about 60% of the sets' : `${doneCount} sets logged`}</p></div>
      </header>
      <div className="space-y-4 px-4 pt-2">
        {!draft || !info ? <p className="py-10 text-center text-muted">Loading...</p> : planned.map((p) => {
          const inf = info[p.exercise_id]
          const rows = draft.rows[p.exercise_id] ?? []
          return (
            <section key={p.exercise_id} className={`${card} p-4`}>
              <h2 className="text-lg font-semibold">{p.ex?.name ?? 'Exercise'}</h2>
              <p className="text-sm text-muted">Target {p.sets} x {p.rep_min}-{p.rep_max}</p>
              <p className="mt-2 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{inf.target.hint}</p>
              {inf.last.sets.length > 0 && (
                <p className="mt-2 text-xs text-muted">Last ({inf.last.date}): {inf.last.sets.map((s) => `${s.weight_kg}x${s.reps}`).join('  ')}</p>
              )}
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-2 text-xs text-muted"><span>Set</span><span>kg</span><span>Reps</span><span /></div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[28px_1fr_1fr_44px] items-center gap-2">
                    <span className="text-sm text-muted">{i + 1}</span>
                    <input aria-label={`Set ${i + 1} weight`} inputMode="decimal" value={r.w} placeholder="0" onChange={(e) => setRow(p.exercise_id, i, { w: e.target.value })}
                      className={`h-11 min-w-0 rounded-xl border border-line bg-bg px-3 text-center tabular-nums ${r.done ? 'opacity-60' : ''}`} />
                    <input aria-label={`Set ${i + 1} reps`} inputMode="numeric" value={r.r} placeholder="0" onChange={(e) => setRow(p.exercise_id, i, { r: e.target.value })}
                      className={`h-11 min-w-0 rounded-xl border border-line bg-bg px-3 text-center tabular-nums ${r.done ? 'opacity-60' : ''}`} />
                    <button aria-label={`Set ${i + 1} ${r.done ? 'undo' : 'done'}`} aria-pressed={r.done} onClick={() => toggle(p.exercise_id, i, !!p.ex?.is_compound)}
                      className={`grid size-11 place-items-center rounded-xl ${r.done ? 'bg-accent text-white' : 'border border-line text-muted'}`}><Check size={20} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-line text-sm"
                  onClick={() => update((all) => ({ ...all, [p.exercise_id]: [...rows, { ...(rows[rows.length - 1] ?? { w: '', r: String(p.rep_min) }), done: false }] }))}><Plus size={16} />Set</button>
                <button disabled={rows.length <= 1} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-line text-sm disabled:opacity-30"
                  onClick={() => update((all) => ({ ...all, [p.exercise_id]: rows.slice(0, -1) }))}><Minus size={16} />Set</button>
              </div>
              {inf.last.sets.length > 0 && <p className="mt-2 text-xs text-muted">Best last time: {fmtKg(Math.max(...inf.last.sets.map((s) => s.weight_kg)))}</p>}
            </section>
          )
        })}
        <button className={`${btnPrimary} w-full`} disabled={doneCount === 0 || saving} onClick={finish}>Finish workout</button>
      </div>
      <AnimatePresence>
        {rest && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.2 }}
            className="sticky bottom-2 z-20 mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card p-2 pl-4 shadow-lg" role="timer" aria-live="off">
            <Timer size={20} className="text-accent" />
            <div className="flex-1"><p className="text-xs text-muted">{left === 0 ? 'Rest over' : 'Rest'}</p><p className="text-xl font-semibold tabular-nums">{fmtT(left)}</p></div>
            <button className="min-h-11 rounded-xl border border-line px-3 text-sm" onClick={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })}>+15s</button>
            <button className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white" onClick={() => setRest(null)}>Skip</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
