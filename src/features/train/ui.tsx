import type { ReactNode } from 'react'
import { Drawer } from 'vaul'
import { Minus, Plus } from 'lucide-react'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl bg-card text-ink outline-none">
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line" />
          <Drawer.Title className="px-4 pb-2 pt-3 text-lg font-semibold">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function Stepper({ label, value, onChange, min = 0, max = 99, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <button aria-label={`${label} minus`} className="grid size-11 place-items-center rounded-xl bg-bg active:opacity-60"
          onClick={() => onChange(Math.max(min, value - step))}><Minus size={18} /></button>
        <span className="w-9 text-center text-base font-semibold tabular-nums">{value}</span>
        <button aria-label={`${label} plus`} className="grid size-11 place-items-center rounded-xl bg-bg active:opacity-60"
          onClick={() => onChange(Math.min(max, value + step))}><Plus size={18} /></button>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="grid rounded-xl bg-card p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-lg text-sm font-medium ${value === o.id ? 'bg-accent text-white' : 'text-muted'}`}>{o.label}</button>
      ))}
    </div>
  )
}

export const card = 'rounded-2xl bg-card border border-line'
export const btnPrimary = 'min-h-12 rounded-xl bg-accent px-5 text-base font-semibold text-white active:opacity-80 disabled:opacity-40'
export const btnGhost = 'min-h-11 rounded-xl border border-line px-4 text-sm font-medium active:opacity-60'
