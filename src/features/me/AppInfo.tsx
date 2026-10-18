import { useState } from 'react'

/** Shows which build is running and force-refreshes it (clears the offline cache, keeps your data). */
export default function AppInfo() {
  const [busy, setBusy] = useState(false)
  const update = async () => {
    setBusy(true)
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.()
      await Promise.all((regs ?? []).map((r) => r.unregister()))
      const keys = await caches?.keys?.()
      await Promise.all((keys ?? []).map((k) => caches.delete(k)))
    } catch { /* reload anyway */ }
    location.reload()
  }
  return (
    <section className="space-y-2 rounded-2xl bg-card p-4">
      <h2 className="text-lg font-semibold">App version</h2>
      <p className="text-sm text-muted">Build {__BUILD_ID__}</p>
      <button onClick={update} disabled={busy} className="min-h-11 w-full rounded-xl border border-line font-medium text-accent disabled:opacity-50">
        {busy ? 'Updating...' : 'Update app (keeps your data)'}
      </button>
      <p className="text-xs text-muted">If something looks old or broken, tap this. It clears the saved copy of the app and loads the newest one. Your logs and settings are not touched.</p>
    </section>
  )
}
