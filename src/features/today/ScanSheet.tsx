import { useEffect, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { lookupBarcode, type SearchFood } from '../../lib/foodsearch'
import { btnPrimary, inputCls } from './Sheet'

interface Detector { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
type DetectorCtor = {
  new (opts?: { formats?: string[] }): Detector
  getSupportedFormats?: () => Promise<string[]>
}
const getCtor = () => (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector

/** Barcode scanner in a nested vaul sheet. Camera tracks are stopped whenever it closes. */
export function ScanSheet({ open, onClose, onFound }: {
  open: boolean; onClose: () => void; onFound: (food: SearchFood) => void
}) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [msg, setMsg] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const supported = !!getCtor()

  const lookup = async (code: string) => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setMsg('')
    try {
      const food = await lookupBarcode(code)
      if (food) { onFound(food); onClose() }
      else setMsg(`No nutrition data found for ${code}. Try My foods or Manual.`)
    } catch {
      setMsg('Could not reach Open Food Facts. Check your connection, or use My foods or Manual.')
    } finally { busyRef.current = false; setBusy(false) }
  }

  useEffect(() => {
    if (!open) { setMsg(''); setTyped(''); return }
    const Ctor = getCtor()
    if (!Ctor) { setMsg('Barcode scanning is not supported in this browser. Type the number printed under the barcode instead.'); return }
    if (!video) return
    if (!navigator.mediaDevices?.getUserMedia) { setMsg('Camera is not available here. Type the barcode number instead.'); return }
    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
        video.srcObject = stream
        await video.play().catch(() => undefined)
        const det = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        const tick = async () => {
          if (stopped) return
          if (!busyRef.current && video.readyState >= 2) {
            try {
              const codes = await det.detect(video)
              if (codes[0]?.rawValue && !stopped) await lookup(codes[0].rawValue)
            } catch { /* keep scanning */ }
          }
          if (!stopped) timer = window.setTimeout(tick, 350)
        }
        tick()
      } catch {
        setMsg('Camera permission was denied or no camera was found. Type the barcode number instead.')
      }
    })()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, video])

  const digits = typed.replace(/\D/g, '')

  return (
    <Drawer.NestedRoot open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[88dvh] flex-col rounded-t-2xl bg-card text-ink outline-none">
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line" />
          <Drawer.Title className="shrink-0 px-4 pb-2 pt-3 text-lg font-semibold">Scan barcode</Drawer.Title>
          <Drawer.Description className="sr-only">Point the camera at a food barcode, or type the number.</Drawer.Description>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            {supported && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
                <video ref={setVideo} playsInline muted className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 bg-accent/80" />
              </div>
            )}
            {busy && <p className="text-sm text-muted" role="status">Looking up product...</p>}
            {msg && <p className="text-sm text-fat" role="alert">{msg}</p>}
            <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (digits.length >= 6) lookup(digits) }}>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted">Or type the barcode number</span>
                <input className={inputCls} inputMode="numeric" placeholder="e.g. 4800016644801" value={typed} onChange={(e) => setTyped(e.target.value)} />
              </label>
              <button type="submit" className={btnPrimary} disabled={digits.length < 6 || busy}>Look up</button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  )
}
