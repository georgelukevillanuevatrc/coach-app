import { useState } from 'react'
import { loadSettings, saveSettings } from './settings'
import type { ReminderSettings } from './due'
import { notifyIfAllowed, permission, requestPermission } from './notify'

const timeCls = 'min-h-11 rounded-xl border border-line bg-bg px-3 text-ink'

function Row({ label, on, time, onOn, onTime }: { label: string; on: boolean; time: string; onOn: (v: boolean) => void; onTime: (v: string) => void }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <label className="flex min-h-11 flex-1 items-center gap-3">
        <input type="checkbox" checked={on} onChange={(e) => onOn(e.target.checked)} className="size-6 accent-[var(--accent)]" />
        <span>{label}</span>
      </label>
      <input type="time" aria-label={`${label} time`} value={time} disabled={!on} onChange={(e) => onTime(e.target.value)} className={`${timeCls} disabled:opacity-40`} />
    </div>
  )
}

export default function RemindersSettings() {
  const [s, setS] = useState<ReminderSettings>(loadSettings)
  const [perm, setPerm] = useState(permission())
  const upd = (n: ReminderSettings) => { setS(n); saveSettings(n) }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Reminders</h2>
      <p className="text-sm text-muted">Gentle nudges that appear in the app when something is still open. No guilt, and you can dismiss them.</p>
      <Row label="Log weight" on={s.weight.on} time={s.weight.time} onOn={(on) => upd({ ...s, weight: { ...s.weight, on } })} onTime={(time) => upd({ ...s, weight: { ...s.weight, time } })} />
      <Row label="Workout day" on={s.workout.on} time={s.workout.time} onOn={(on) => upd({ ...s, workout: { ...s.workout, on } })} onTime={(time) => upd({ ...s, workout: { ...s.workout, time } })} />
      <Row label="Log your dinner" on={s.dinner.on} time={s.dinner.time} onOn={(on) => upd({ ...s, dinner: { ...s.dinner, on } })} onTime={(time) => upd({ ...s, dinner: { ...s.dinner, time } })} />
      <div className="border-t border-line pt-3">
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={s.quiet.on} onChange={(e) => upd({ ...s, quiet: { ...s.quiet, on: e.target.checked } })} className="size-6 accent-[var(--accent)]" />
          <span>Quiet hours (no nudges)</span>
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input type="time" aria-label="Quiet hours start" value={s.quiet.start} disabled={!s.quiet.on} onChange={(e) => upd({ ...s, quiet: { ...s.quiet, start: e.target.value } })} className={`${timeCls} disabled:opacity-40`} />
          <span className="text-muted">to</span>
          <input type="time" aria-label="Quiet hours end" value={s.quiet.end} disabled={!s.quiet.on} onChange={(e) => upd({ ...s, quiet: { ...s.quiet, end: e.target.value } })} className={`${timeCls} disabled:opacity-40`} />
        </div>
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        <h3 className="font-semibold">Phone notifications</h3>
        <p className="text-sm text-muted">
          Notifications can only fire while this app is open. Real background push on iPhone needs a server and the app added to your Home Screen, which is not available yet. Until then, the in-app cards above are what you get.
        </p>
        {perm === 'unsupported' && <p className="text-sm text-muted">This browser does not support notifications.</p>}
        {perm === 'default' && (
          <button type="button" className="min-h-11 rounded-xl border border-line bg-card px-4" onClick={async () => setPerm(await requestPermission())}>Allow notifications</button>
        )}
        {perm === 'denied' && <p className="text-sm text-muted">Notifications are blocked. You can change that in your browser or phone settings.</p>}
        {perm === 'granted' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Allowed while the app is open.</span>
            <button type="button" className="min-h-11 rounded-xl border border-line bg-card px-4" onClick={() => notifyIfAllowed('Coach', 'Test reminder. This is how a nudge looks.', 'test')}>Send a test</button>
          </div>
        )}
      </div>
    </section>
  )
}
