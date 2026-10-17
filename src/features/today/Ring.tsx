import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function Ring({ value, target, size, stroke, colorClass, children }: {
  value: number; target: number; size: number; stroke: number; colorClass: string; children?: ReactNode
}) {
  const reduce = useReducedMotion()
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const r = (size - stroke) / 2
  const c = size / 2
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <motion.circle
          cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" className={colorClass}
          initial={false}
          animate={{ pathLength: pct, opacity: pct > 0 ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
