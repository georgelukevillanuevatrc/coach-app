import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Drawer } from 'vaul'
import { db } from '../../lib/db'
import { todayStr } from '../../lib/dates'
import type { Profile } from '../../lib/types'
import { computeTargets } from '../../coach/calories'
import { ProfileForm } from './ProfileForm'
import RemindersSettings from '../reminders/RemindersSettings'
import { countPhotos, exportPhotos } from '../progress/photosDb'
import { exportData, importBackup, parseBackup, type Backup } from './backup'

const card = 'rounded-2xl bg-card border border-line p-4'
const btn = 'min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink'

async function saveProfile(p: Profile) {
  const t = computeTargets(p)
  await db.transaction('rw', db.profile, db.targets, async () => {
    await db.profile.put(p)
    await db.targets.add({ effective_from: todayStr(), calories: t.calories, protein_g: t.protein_g, carbs_g: t.carbs_g, fat_g: t.fat_g, reason: 'onboarding' })
  })
}

function Sheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-card text-ink outline-none">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line" />
          <Drawer.Title className="px-4 pt-3 text-xl font-bold">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function Disclaimer() {
  return (
    <p className="text-sm text-muted">
      This app is a coaching and tracking tool, not medical advice. If you have a medical condition, are pregnant, or take medication, please check with a doctor before changing how you eat or train.
    </p>
  )
}

function Onboarding() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-3xl font-bold">Welcome</h1>
      <div className={card}>
        <p className="font-semibold">Next step: tell me a bit about you</p>
        <p className="mt-1 text-sm text-muted">About 2 minutes. I will work out your daily calories and macros and show exactly how.</p>
      </div>
      <div className={card}><ProfileForm submitLabel="Calculate my targets" onSubmit={saveProfile} /></div>
      <Disclaimer />
    </div>
  )
}

function Backups() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [msg, setMsg] = useState('')
  const photoCount = useLiveQuery(countPhotos, [], 0)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { setPending(await parseBackup(f)); setMsg('') } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not read that file.') }
  }
  async function confirm() {
    if (!pending) return
    try { await importBackup(pending); setMsg('Backup restored.') } catch { setMsg('Import failed. Your existing data was left as it was.') }
    setPending(null)
  }
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="text-lg font-semibold">Backup</h2>
      <p className="text-sm text-muted">Your data lives only on this phone. Export a backup about once a month (and before clearing browser data), then save the file somewhere safe like iCloud Drive.</p>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={() => { exportData().then(() => setMsg('Backup file created.')) }}>Export data</button>
        <button className={btn} onClick={() => fileRef.current?.click()}>Import backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={pick} />
      </div>
      <div className="rounded-xl bg-bg p-3 text-sm text-muted">
        <p>Progress photos are NOT included in the JSON backup. They live only in this browser on this phone{photoCount ? ` (${photoCount} saved)` : ''}, so clearing site data or losing the phone loses them.</p>
        {photoCount > 0 && (
          <button className={`${btn} mt-2`} onClick={() => { exportPhotos().then((n) => setMsg(`${n} photo download(s) started. Allow multiple downloads if asked.`)) }}>Export photos</button>
        )}
      </div>
      {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
      <Sheet open={!!pending} onOpenChange={(o) => !o && setPending(null)} title="Replace all data?">
        <p className="text-sm text-muted">Importing replaces everything currently in the app (profile, food, weight, workouts) with the contents of the file. This cannot be undone, so export first if unsure.</p>
        <div className="mt-4 grid gap-2">
          <button className="min-h-12 rounded-xl bg-accent text-base font-semibold text-white" onClick={confirm}>Replace with backup</button>
          <button className={btn} onClick={() => setPending(null)}>Cancel</button>
        </div>
      </Sheet>
    </section>
  )
}

export default function Me() {
  const profile = useLiveQuery(() => db.profile.get(1), [], null)
  const targets = useLiveQuery(() => db.targets.orderBy('id').last(), [], null)
  const [editing, setEditing] = useState(false)
  const [showHow, setShowHow] = useState(false)

  if (profile === null) return <div className="p-4 text-muted">Loading...</div>
  if (!profile) return <><Onboarding /><div className="p-4 pt-0"><Backups /></div></>

  const calc = computeTargets(profile)
  const goalLabel = { lose: 'Lose fat', gain: 'Build muscle', maintain: 'Maintain' }[profile.goal_type]

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-3xl font-bold">Me</h1>

      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">Daily targets</h2>
        {targets && (
          <>
            <p className="text-4xl font-bold">{targets.calories} <span className="text-base font-normal text-muted">kcal</span></p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-bg p-2"><div className="font-semibold text-protein">{targets.protein_g} g</div><div className="text-xs text-muted">Protein</div></div>
              <div className="rounded-xl bg-bg p-2"><div className="font-semibold text-carbs">{targets.carbs_g} g</div><div className="text-xs text-muted">Carbs</div></div>
              <div className="rounded-xl bg-bg p-2"><div className="font-semibold text-fat">{targets.fat_g} g</div><div className="text-xs text-muted">Fat</div></div>
            </div>
            <p className="text-xs text-muted">Set on {targets.effective_from}</p>
          </>
        )}
        {calc.warnings.map((w) => (
          <p key={w} role="note" className="rounded-xl border border-line bg-bg p-3 text-sm">{w}</p>
        ))}
        <button className={`${btn} w-full`} onClick={() => setShowHow(true)}>How this was calculated</button>
        <Disclaimer />
      </section>

      <section className={`${card} space-y-2`}>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted">
          {goalLabel} · {profile.weight_kg} kg to {profile.goal_weight_kg} kg · {profile.age} y · {profile.height_cm} cm · {profile.training_days} days/week · {profile.equipment}
        </p>
        {profile.limits_note && <p className="text-sm text-muted">Limits: {profile.limits_note}</p>}
        <button className={`${btn} w-full`} onClick={() => setEditing(true)}>Edit profile and recalculate</button>
      </section>

      <RemindersSettings />

      <Backups />

      <section className={card}>
        <h2 className="text-lg font-semibold">Units</h2>
        <p className="mt-1 text-sm text-muted">Metric units (kg, cm) are used throughout. Dates use Asia/Manila time.</p>
      </section>

      <Sheet open={showHow} onOpenChange={setShowHow} title="How this was calculated">
        <p className="mb-2 text-xs text-muted">Based on your current profile. Recalculating saves a new set of targets.</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm">{calc.explanation.map((l) => <li key={l}>{l}</li>)}</ol>
        {calc.warnings.map((w) => <p key={w} className="mt-3 rounded-xl border border-line bg-bg p-3 text-sm">{w}</p>)}
        <p className="mt-3 text-xs text-muted">These are estimates to start from. Your weekly progress tells us if they need a small tweak.</p>
      </Sheet>

      <Sheet open={editing} onOpenChange={setEditing} title="Edit profile">
        <ProfileForm initial={profile} submitLabel="Save and recalculate" onSubmit={async (p) => { await saveProfile(p); setEditing(false) }} />
      </Sheet>
    </div>
  )
}
