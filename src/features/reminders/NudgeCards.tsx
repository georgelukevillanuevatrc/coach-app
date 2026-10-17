import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { X } from 'lucide-react'
import { db } from '../../lib/db'
import { todayStr } from '../../lib/dates'
import { dueNudges, manilaMinutes, type NudgeKind } from './due'
import { dismiss, loadDismissed, loadSettings } from './settings'
import { notifyIfAllowed } from './notify'

const COPY: Record<NudgeKind, { title: string; body: string }> = {
  weight: { title: 'Weigh-in when you are ready', body: 'A quick weight today keeps your trend line honest.' },
  workout: { title: 'Training day', body: 'Today is on your plan. Even a shorter session counts.' },
  dinner: { title: 'Dinner check', body: 'When you get a moment, jot down your dinner. Rough is fine.' },
}

/** Gentle in-app nudges. Mount anywhere; renders nothing when nothing is due. */
export default function NudgeCards() {
  const today = todayStr()
  const [tick, setTick] = useState(0)
  const notified = useRef(new Set<string>())

  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const id = window.setInterval(bump, 60_000)
    window.addEventListener('coach-reminders', bump)
    return () => { clearInterval(id); window.removeEventListener('coach-reminders', bump) }
  }, [])

  const flags = useLiveQuery(async () => {
    const [w, dinner, sessions, plan, profile, recent] = await Promise.all([
      db.weight_logs.where('date').equals(today).count(),
      db.food_logs.where('date').equals(today).filter((f) => f.meal_type === 'dinner').count(),
      db.workout_sessions.where('date').equals(today).toArray(),
      db.plans.where('status').equals('active').first(),
      db.profile.get(1),
      db.workout_sessions.orderBy('date').reverse().limit(30).toArray(),
    ])
    // No weekday schedule is stored, so "training day" = active plan and fewer finished
    // sessions in the last 7 days than the weekly goal.
    const weekAgo = new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10)
    const doneWeek = new Set(recent.filter((s) => s.finished_at && s.date >= weekAgo && s.date < today).map((s) => s.date)).size
    return {
      weightLogged: w > 0,
      dinnerLogged: dinner > 0,
      workoutDone: sessions.some((s) => !!s.finished_at),
      isTrainingDay: !!plan && doneWeek < (profile?.training_days ?? 3),
    }
  }, [today])

  const settings = loadSettings()
  const dismissed = loadDismissed(today)
  const due = flags ? dueNudges(manilaMinutes(new Date()), settings, flags).filter((k) => !dismissed.includes(k)) : []
  void tick

  const dueKey = due.join(',')
  useEffect(() => {
    for (const k of dueKey ? dueKey.split(',') as NudgeKind[] : []) {
      const id = `${today}:${k}`
      if (notified.current.has(id)) continue
      notified.current.add(id)
      notifyIfAllowed(COPY[k].title, COPY[k].body, k)
    }
  }, [dueKey, today])

  if (!due.length) return null
  return (
    <div className="space-y-2" aria-label="Gentle reminders">
      {due.map((k) => (
        <div key={k} role="note" className="flex items-start gap-2 rounded-2xl border border-line bg-card p-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{COPY[k].title}</p>
            <p className="text-sm text-muted">{COPY[k].body}</p>
          </div>
          <button type="button" aria-label={`Dismiss ${COPY[k].title}`} onClick={() => dismiss(today, k)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><X size={18} /></button>
        </div>
      ))}
    </div>
  )
}
