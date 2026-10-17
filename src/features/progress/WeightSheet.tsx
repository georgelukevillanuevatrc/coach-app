import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { Delete } from 'lucide-react'
import { db } from '../../lib/db'
import type { WeightLog } from '../../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Entry being edited; undefined = new entry for `date`. */
  entry?: WeightLog
  date: string
  defaultKg?: number
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

export default function WeightSheet({ open, onClose, entry, date, defaultKg }: Props) {
  const [val, setVal] = useState('')
  const [waist, setWaist] = useState('')
  const [note, setNote] = useState('')
  const [fresh, setFresh] = useState(true)

  useEffect(() => {
    if (!open) return
    const start = entry?.weight_kg ?? defaultKg
    setVal(start != null ? String(start) : '')
    setWaist(entry?.waist_cm != null ? String(entry.waist_cm) : '')
    setNote(entry?.note ?? '')
    setFresh(true)
  }, [open, entry, defaultKg])

  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'back') { setFresh(false); setVal((v) => v.slice(0, -1)); return }
    setVal((v) => {
      const base = fresh ? '' : v
      if (k === '.' && base.includes('.')) return base
      if (k === '.' && base === '') return '0.'
      if (base.includes('.') && base.split('.')[1].length >= 1) return base
      if (base.length >= 5) return base
      return base + k
    })
    setFresh(false)
  }

  const kg = parseFloat(val)
  const valid = Number.isFinite(kg) && kg >= 20 && kg <= 400
  const waistNum = waist.trim() === '' ? undefined : parseFloat(waist)

  const save = async () => {
    if (!valid) return
    const row: WeightLog = {
      date: entry?.date ?? date,
      weight_kg: Math.round(kg * 10) / 10,
      waist_cm: waistNum != null && Number.isFinite(waistNum) ? waistNum : undefined,
      note: note.trim() || undefined,
    }
    const existing = entry?.id != null ? entry : await db.weight_logs.where('date').equals(row.date).first()
    if (existing?.id != null) await db.weight_logs.put({ ...row, id: existing.id })
    else await db.weight_logs.add(row)
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-2xl border-t border-line bg-card outline-none">
          <div className="overflow-y-auto p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            <Drawer.Title className="text-center text-sm text-muted">
              {entry ? `Edit weight, ${entry.date}` : 'Log weight'}
            </Drawer.Title>
            <Drawer.Description className="sr-only">Enter your weight in kilograms</Drawer.Description>
            <div className="my-3 text-center text-5xl font-semibold tabular-nums">
              {val || '0'}<span className="ml-1 text-xl text-muted">kg</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'back' ? 'Delete' : k}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-bg text-2xl active:opacity-60">
                  {k === 'back' ? <Delete size={24} /> : k}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-muted">Waist (cm, weekly)
                <input value={waist} onChange={(e) => setWaist(e.target.value)} inputMode="decimal" placeholder="optional"
                  className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink" />
              </label>
              <label className="text-xs text-muted">Note
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional"
                  className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink" />
              </label>
            </div>
            <button type="button" onClick={save} disabled={!valid}
              className="mt-4 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-white disabled:opacity-40">
              Save
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
