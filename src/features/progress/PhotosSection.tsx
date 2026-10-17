import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Drawer } from 'vaul'
import { format, parseISO } from 'date-fns'
import { Camera, Trash2 } from 'lucide-react'
import { todayStr } from '../../lib/dates'
import { downscale, photosDb, type ProgressPhoto } from './photosDb'

const fmt = (d: string) => format(parseISO(d), 'MMM d, yyyy')
const btn = 'min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink'

/** Object URL that is revoked when the blob changes or the component unmounts. */
function useUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) { setUrl(undefined); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function Thumb({ photo, selected, onClick }: { photo: ProgressPhoto; selected?: boolean; onClick: () => void }) {
  const url = useUrl(photo.blob)
  return (
    <button type="button" onClick={onClick} aria-label={`Photo from ${fmt(photo.date)}`}
      className={`relative aspect-square overflow-hidden rounded-xl bg-bg ${selected ? 'ring-2 ring-accent' : ''}`}>
      {url && <img src={url} alt="" className="size-full object-cover" loading="lazy" />}
      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[11px] text-white">{format(parseISO(photo.date), 'MMM d')}</span>
    </button>
  )
}

function Full({ photo }: { photo: ProgressPhoto }) {
  const url = useUrl(photo.blob)
  return url ? <img src={url} alt={`Progress photo ${fmt(photo.date)}`} className="max-h-[60dvh] w-full rounded-xl object-contain" /> : null
}

function CompareSide({ photo }: { photo?: ProgressPhoto }) {
  const url = useUrl(photo?.blob)
  return (
    <div className="min-w-0">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-bg">
        {url && <img src={url} alt="" className="size-full object-cover" />}
      </div>
      <p className="mt-1 text-center text-xs text-muted">{photo ? fmt(photo.date) : ''}</p>
    </div>
  )
}

export default function PhotosSection() {
  const photos = useLiveQuery(() => photosDb.photos.orderBy('date').reverse().toArray(), [])
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [draft, setDraft] = useState<{ blob: Blob; date: string; note: string } | null>(null)
  const [viewId, setViewId] = useState<number | null>(null)
  const [comparing, setComparing] = useState(false)
  const [pick, setPick] = useState<number[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const draftUrl = useUrl(draft?.blob)
  const view = photos?.find((p) => p.id === viewId)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      setMsg('Processing photo...')
      const blob = await downscale(f)
      setDraft({ blob, date: todayStr(), note: '' })
      setMsg('')
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not read that photo.') }
  }
  async function saveDraft() {
    if (!draft) return
    try {
      await photosDb.photos.add({ date: draft.date, note: draft.note.trim() || undefined, blob: draft.blob, created_at: Date.now() })
      setDraft(null)
    } catch { setMsg('Could not save the photo. Storage may be full.') }
  }
  async function remove(p: ProgressPhoto) {
    if (p.id != null && window.confirm(`Delete the photo from ${fmt(p.date)}? This cannot be undone.`)) {
      await photosDb.photos.delete(p.id); setViewId(null)
    }
  }
  function tap(p: ProgressPhoto) {
    if (!comparing) { setViewId(p.id ?? null); return }
    if (p.id == null) return
    const next = pick.includes(p.id) ? pick.filter((i) => i !== p.id) : [...pick, p.id].slice(-2)
    setPick(next)
    if (next.length === 2) setShowCompare(true)
  }
  const pair = pick.map((id) => photos?.find((p) => p.id === id)).filter((p): p is ProgressPhoto => !!p)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at - b.created_at)

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Photos</h2>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex min-h-11 items-center gap-1 rounded-full bg-accent px-4 font-semibold text-white">
          <Camera size={18} /> Add
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      </div>
      <p className="mt-1 text-xs text-muted">Stored only on this phone. They are not synced and not in the JSON backup.</p>
      {msg && <p role="status" className="mt-2 text-sm text-muted">{msg}</p>}

      {photos && photos.length === 0 && <p className="mt-3 text-sm text-muted">No photos yet. Take one now and compare later. Same light and pose works best.</p>}

      {photos && photos.length >= 2 && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" className={btn} onClick={() => { setComparing((c) => !c); setPick([]) }}>
            {comparing ? 'Cancel compare' : 'Compare two'}
          </button>
          {comparing && <span className="text-sm text-muted">Tap two photos ({pick.length}/2)</span>}
        </div>
      )}

      {photos && photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => <Thumb key={p.id} photo={p} selected={p.id != null && pick.includes(p.id)} onClick={() => tap(p)} />)}
        </div>
      )}

      <Sheet open={!!draft} onClose={() => setDraft(null)} title="Save photo">
        {draft && (
          <div className="space-y-3">
            {draftUrl && <img src={draftUrl} alt="Preview" className="max-h-[45dvh] w-full rounded-xl object-contain" />}
            <label className="block text-xs text-muted">Date
              <input type="date" value={draft.date} max={todayStr()} onChange={(e) => setDraft({ ...draft, date: e.target.value || draft.date })}
                className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink" />
            </label>
            <label className="block text-xs text-muted">Note
              <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="optional"
                className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink" />
            </label>
            <button type="button" onClick={saveDraft} className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-white">Save photo</button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!view} onClose={() => setViewId(null)} title={view ? fmt(view.date) : 'Photo'}>
        {view && (
          <div className="space-y-3">
            <Full photo={view} />
            {view.note && <p className="text-sm">{view.note}</p>}
            <button type="button" onClick={() => remove(view)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-base text-ink">
              <Trash2 size={18} /> Delete photo
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={showCompare && pair.length === 2} onClose={() => { setShowCompare(false); setComparing(false); setPick([]) }} title="Before and after">
        {pair.length === 2 && (
          <div>
            <div className="grid grid-cols-2 gap-2">
              <CompareSide photo={pair[0]} /><CompareSide photo={pair[1]} />
            </div>
            <p className="mt-2 text-center text-sm text-muted">
              {Math.max(0, Math.round((parseISO(pair[1].date).getTime() - parseISO(pair[0].date).getTime()) / 86400000))} days apart
            </p>
          </div>
        )}
      </Sheet>
    </section>
  )
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-md flex-col rounded-t-2xl border-t border-line bg-card outline-none">
          <div className="overflow-y-auto p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            <Drawer.Title className="mb-3 text-center text-sm text-muted">{title}</Drawer.Title>
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
