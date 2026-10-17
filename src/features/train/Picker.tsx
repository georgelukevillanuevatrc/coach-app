import { useMemo, useState } from 'react'
import { Search, TriangleAlert } from 'lucide-react'
import { isFlagged } from '../../coach/plan'
import { MUSCLES, type Ex } from './data'

export function ExerciseList({ exercises, onPick, note = '', suggested = [], allowedEquipment }: {
  exercises: Ex[]; onPick: (e: Ex) => void; note?: string; suggested?: string[]; allowedEquipment?: string[]
}) {
  const [q, setQ] = useState('')
  const [mg, setMg] = useState<string>('all')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return exercises
      .filter((e) => (mg === 'all' || e.muscle_group === mg) && (!s || e.name.toLowerCase().includes(s)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, q, mg])
  const sugg = suggested.length ? filtered.filter((e) => suggested.includes(e.name)) : []
  const rest = filtered.filter((e) => !sugg.includes(e))
  const row = (e: Ex) => {
    const flagged = isFlagged(e.name, note)
    const off = allowedEquipment && !allowedEquipment.includes(e.equipment)
    return (
      <li key={e.id}>
        <button onClick={() => onPick(e)} className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-line py-2 text-left active:opacity-60">
          <span>
            <span className="block text-base">{e.name}</span>
            <span className="block text-xs capitalize text-muted">{e.muscle_group} · {e.equipment}{e.is_compound ? ' · compound' : ''}{off ? ' · not in your equipment' : ''}</span>
          </span>
          {flagged && <span className="flex items-center gap-1 text-xs text-fat"><TriangleAlert size={14} />Check</span>}
        </button>
      </li>
    )
  }
  return (
    <div>
      <label className="relative block">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" inputMode="search" enterKeyHint="search"
          className="h-11 w-full rounded-xl border border-line bg-bg pl-10 pr-3 text-ink" />
      </label>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {['all', ...MUSCLES].map((m) => (
          <button key={m} onClick={() => setMg(m)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm capitalize ${mg === m ? 'bg-accent text-white' : 'border border-line text-muted'}`}>{m}</button>
        ))}
      </div>
      {sugg.length > 0 && (<><h3 className="mt-4 text-xs font-semibold uppercase text-muted">Suggested substitutes</h3><ul>{sugg.map(row)}</ul></>)}
      <h3 className="mt-4 text-xs font-semibold uppercase text-muted">{sugg.length ? 'All exercises' : `${rest.length} exercises`}</h3>
      <ul>{rest.map(row)}</ul>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted">No exercises match.</p>}
    </div>
  )
}
