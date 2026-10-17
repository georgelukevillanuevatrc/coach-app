import { db, TABLES } from '../../lib/db'
import { todayStr } from '../../lib/dates'

export async function exportData() {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  const blob = new Blob([JSON.stringify({ app: 'coach', version: 1, exported_at: todayStr(), tables: data }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `coach-backup-${todayStr()}.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type Backup = { tables: Record<string, unknown[]> }

export async function parseBackup(file: File): Promise<Backup> {
  const json = JSON.parse(await file.text())
  if (json?.app !== 'coach' || typeof json.tables !== 'object' || json.tables === null) throw new Error('This does not look like a Coach backup file.')
  for (const t of TABLES) if (json.tables[t] !== undefined && !Array.isArray(json.tables[t])) throw new Error(`Backup table "${t}" is not valid.`)
  return json as Backup
}

export async function importBackup(b: Backup) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = b.tables[t]
      if (rows?.length) await db.table(t).bulkAdd(rows)
    }
  })
}
