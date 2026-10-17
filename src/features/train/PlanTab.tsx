import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import { db } from '../../lib/db'
import { PRO_ADVICE, equipmentAllows } from '../../coach/plan'
import { ExerciseList } from './Picker'
import { Sheet, Stepper, btnGhost, card } from './ui'
import { createPlan, type Day, type TrainData } from './data'

type Item = Day['exercises'][number]

export default function PlanTab({ data }: { data: TrainData }) {
  const { days, exercises, profile, flags } = data
  const [editId, setEditId] = useState<number | null>(null)
  const [pick, setPick] = useState<null | { idx: number | 'add' }>(null)
  const [confirm, setConfirm] = useState(false)
  const day = days.find((d) => d.id === editId)
  const exName = (id: number) => exercises.find((e) => e.id === id)?.name ?? 'Exercise'
  const note = profile?.limits_note ?? ''

  const save = (items: Item[]) => day && db.plan_days.update(day.id, { exercises: items })
  const patch = (i: number, p: Partial<Item>) => save(day!.exercises.map((e, k) => (k === i ? { ...e, ...p } : e)))
  const move = (i: number, dir: -1 | 1) => {
    const a = [...day!.exercises]; const j = i + dir
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; save(a)
  }
  const moveDay = async (i: number, dir: -1 | 1) => {
    const a = days[i], b = days[i + dir]
    if (!a || !b) return
    await db.transaction('rw', db.plan_days, async () => {
      await db.plan_days.update(a.id, { day_index: b.day_index })
      await db.plan_days.update(b.id, { day_index: a.day_index })
    })
  }
  const closeAll = () => { setEditId(null); setPick(null) }
  const cur = pick && pick.idx !== 'add' ? day?.exercises[pick.idx] : undefined
  const curEx = cur && exercises.find((e) => e.id === cur.exercise_id)

  return (
    <div className="space-y-3">
      {flags.length > 0 && (
        <div className="flex gap-3 rounded-2xl bg-fat/15 p-4 text-sm">
          <TriangleAlert size={20} className="mt-0.5 shrink-0 text-fat" />
          <div>
            {flags.map((f) => (
              <p key={f.keyword}>Left out for <b>{f.keyword}</b>: {f.excluded.slice(0, 5).join(', ')}{f.excluded.length > 5 ? '...' : ''}.</p>
            ))}
            <p className="mt-1 text-muted">{PRO_ADVICE}</p>
          </div>
        </div>
      )}
      {days.map((d, i) => (
        <div key={d.id} className={`${card} p-4`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted">Day {i + 1}</p>
              <h3 className="text-lg font-semibold">{d.name}</h3>
            </div>
            <div className="flex">
              <button aria-label="Move day up" disabled={i === 0} onClick={() => moveDay(i, -1)} className="grid size-11 place-items-center text-muted disabled:opacity-30"><ArrowUp size={18} /></button>
              <button aria-label="Move day down" disabled={i === days.length - 1} onClick={() => moveDay(i, 1)} className="grid size-11 place-items-center text-muted disabled:opacity-30"><ArrowDown size={18} /></button>
            </div>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {d.exercises.map((e, k) => (
              <li key={k} className="flex justify-between gap-2"><span className="truncate">{exName(e.exercise_id)}</span><span className="shrink-0 text-muted tabular-nums">{e.sets} x {e.rep_min}-{e.rep_max}</span></li>
            ))}
          </ul>
          <button onClick={() => setEditId(d.id)} className={`${btnGhost} mt-3 w-full`}>Edit day</button>
        </div>
      ))}
      <button onClick={() => setConfirm(true)} className={`${btnGhost} flex w-full items-center justify-center gap-2`}><RefreshCw size={16} />Regenerate plan from profile</button>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Regenerate plan?">
        <p className="text-sm text-muted">This archives your current plan and builds a new one from your profile. Your workout history is kept.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className={btnGhost} onClick={() => setConfirm(false)}>Cancel</button>
          <button className="min-h-11 rounded-xl bg-accent font-semibold text-white" onClick={async () => { if (profile) await createPlan(profile); setConfirm(false) }}>Regenerate</button>
        </div>
      </Sheet>

      <Sheet open={!!day} onClose={closeAll} title={pick ? (pick.idx === 'add' ? 'Add exercise' : 'Swap exercise') : day?.name ?? ''}>
        {day && !pick && (
          <div className="space-y-3">
            {day.exercises.map((e, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setPick({ idx: i })} className="min-h-11 flex-1 text-left font-medium text-accent">{exName(e.exercise_id)}<span className="block text-xs font-normal text-muted">Tap to swap</span></button>
                  <button aria-label="Move up" onClick={() => move(i, -1)} className="grid size-11 place-items-center text-muted"><ArrowUp size={18} /></button>
                  <button aria-label="Move down" onClick={() => move(i, 1)} className="grid size-11 place-items-center text-muted"><ArrowDown size={18} /></button>
                  <button aria-label="Remove" onClick={() => save(day.exercises.filter((_, k) => k !== i))} className="grid size-11 place-items-center text-protein"><Trash2 size={18} /></button>
                </div>
                <div className="mt-1 space-y-1">
                  <Stepper label="Sets" value={e.sets} min={1} max={8} onChange={(n) => patch(i, { sets: n })} />
                  <Stepper label="Min reps" value={e.rep_min} min={1} max={e.rep_max} onChange={(n) => patch(i, { rep_min: n })} />
                  <Stepper label="Max reps" value={e.rep_max} min={e.rep_min} max={30} onChange={(n) => patch(i, { rep_max: n })} />
                </div>
              </div>
            ))}
            <button onClick={() => setPick({ idx: 'add' })} className={`${btnGhost} flex w-full items-center justify-center gap-2`}><Plus size={16} />Add exercise</button>
          </div>
        )}
        {day && pick && (
          <div>
            <button onClick={() => setPick(null)} className="mb-2 flex min-h-11 items-center gap-1 text-accent"><ChevronLeft size={18} />Back</button>
            <ExerciseList exercises={exercises} note={note} suggested={curEx?.substitutes} allowedEquipment={profile ? exercises.filter((e) => equipmentAllows(profile.equipment, e)).map((e) => e.equipment) : undefined}
              onPick={(e) => {
                if (pick.idx === 'add') save([...day.exercises, { exercise_id: e.id, sets: 3, rep_min: e.is_compound ? 8 : 10, rep_max: e.is_compound ? 12 : 15 }])
                else patch(pick.idx, { exercise_id: e.id })
                setPick(null)
              }} />
          </div>
        )}
      </Sheet>
    </div>
  )
}
