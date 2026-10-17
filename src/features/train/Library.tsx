import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { isFlagged, PRO_ADVICE } from '../../coach/plan'
import { ExerciseList } from './Picker'
import { Sheet, card } from './ui'
import { allSets, fmtKg, type Ex } from './data'

export default function Library({ exercises, note }: { exercises: Ex[]; note: string }) {
  const [sel, setSel] = useState<Ex | null>(null)
  const sets = useLiveQuery(() => (sel ? allSets(sel.id) : Promise.resolve([])), [sel?.id])
  const pr = useLiveQuery(async () => (sel ? (await db.set_logs.where('exercise_id').equals(sel.id).and((l) => l.is_pr).toArray()).length : 0), [sel?.id])
  const best = sets?.length ? [...sets].sort((a, b) => b.weight_kg * (1 + b.reps / 30) - a.weight_kg * (1 + a.reps / 30))[0] : null
  return (
    <div className={`${card} p-4`}>
      <ExerciseList exercises={exercises} onPick={setSel} note={note} />
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="space-y-3 pb-2">
            <p className="text-sm capitalize text-muted">{sel.muscle_group} · {sel.equipment} · {sel.is_compound ? 'compound' : 'isolation'}</p>
            {isFlagged(sel.name, note) && <p className="rounded-xl bg-fat/15 p-3 text-sm">This may stress something in your notes. {PRO_ADVICE}</p>}
            <div className="rounded-xl bg-bg p-3 text-sm">
              {best ? <>Best set: <b>{fmtKg(best.weight_kg)} x {best.reps}</b> · {sets!.length} sets logged · {pr} PRs</> : 'Not logged yet.'}
            </div>
            {sel.substitutes.length > 0 && (<div><h4 className="text-xs font-semibold uppercase text-muted">Substitutes</h4><p className="mt-1 text-sm">{sel.substitutes.join(', ')}</p></div>)}
          </div>
        )}
      </Sheet>
    </div>
  )
}
