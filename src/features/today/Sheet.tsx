import { Drawer } from 'vaul'
import type { ReactNode } from 'react'

export function Sheet({ open, onOpenChange, title, tall, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; tall?: boolean; children: ReactNode
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card text-ink outline-none ${tall ? 'h-[88dvh]' : 'max-h-[88dvh]'}`}>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line" />
          <Drawer.Title className="shrink-0 px-4 pb-2 pt-3 text-lg font-semibold">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export const btnPrimary = 'min-h-12 rounded-xl bg-accent px-4 text-base font-semibold text-white active:opacity-80 disabled:opacity-40'
export const btnGhost = 'min-h-11 rounded-xl border border-line px-4 text-base font-medium active:opacity-70'
export const inputCls = 'min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink placeholder:text-muted outline-none focus:border-accent'

export function EstimateTag() {
  return <span className="ml-1.5 rounded-md bg-fat/20 px-1.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-fat">estimate</span>
}
