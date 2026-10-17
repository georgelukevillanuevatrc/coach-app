import { useState } from 'react'
import { db } from '../../lib/db'
import type { Checkin, Targets } from '../../lib/types'
import type { CheckinSuggestion } from '../../coach/checkin'

interface Props {
  suggestion: CheckinSuggestion
  weekStart: string
  today: string
  trendNow: number
  adherence: number
  targets?: Targets
}

export default function CheckinCard({ suggestion, weekStart, today, trendNow, adherence, targets }: Props) {
  const [busy, setBusy] = useState(false)
  const save = async (accepted: boolean) => {
    setBusy(true)
    const row: Checkin = {
      week_start: weekStart, trend_kg: trendNow, adherence: Math.round(adherence * 100) / 100,
      suggestion: suggestion.message, accepted,
    }
    await db.transaction('rw', db.targets, db.checkins, async () => {
      if (accepted && suggestion.calorieDelta !== 0 && targets) {
        const carbs = Math.max(0, Math.round(targets.carbs_g + suggestion.calorieDelta / 4))
        await db.targets.add({
          effective_from: today, calories: targets.calories + suggestion.calorieDelta,
          protein_g: targets.protein_g, carbs_g: carbs, fat_g: targets.fat_g, reason: 'check-in',
        })
      }
      await db.checkins.add(row)
    })
    setBusy(false)
  }
  const adjusts = suggestion.calorieDelta !== 0 && !!targets
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-base font-semibold">Weekly check-in</h2>
      <p className="mt-1 text-sm">{suggestion.message}</p>
      {adjusts && targets && (
        <p className="mt-2 text-sm text-muted">
          {targets.calories} to {targets.calories + suggestion.calorieDelta} kcal. Protein and fat stay the same; carbs absorb the change.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => save(true)}
          className="min-h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-50">
          {adjusts ? 'Accept' : 'Got it'}
        </button>
        <button type="button" disabled={busy} onClick={() => save(false)}
          className="min-h-11 rounded-xl border border-line font-medium disabled:opacity-50">Not now</button>
      </div>
    </section>
  )
}
