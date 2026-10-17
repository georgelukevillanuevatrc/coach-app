import Dexie, { type EntityTable } from 'dexie'

// Separate database so photos never touch the main 'coach' schema or JSON backup.
export interface ProgressPhoto {
  id?: number
  date: string
  note?: string
  blob: Blob
  created_at: number
}

export const photosDb = new Dexie('coach-photos') as Dexie & {
  photos: EntityTable<ProgressPhoto, 'id'>
}
photosDb.version(1).stores({ photos: '++id, date' })

/** Downscale to max `max` px on the long side and re-encode as JPEG. */
export async function downscale(file: Blob, max = 1200, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
  if (!out) throw new Error('Could not process that image.')
  return out
}

export async function countPhotos(): Promise<number> {
  try { return await photosDb.photos.count() } catch { return 0 }
}

/** Zip-less export: one download per photo. */
export async function exportPhotos(): Promise<number> {
  const all = await photosDb.photos.orderBy('date').toArray()
  for (const p of all) {
    const url = URL.createObjectURL(p.blob)
    const a = document.createElement('a')
    a.href = url; a.download = `coach-photo-${p.date}-${p.id}.jpg`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    await new Promise((r) => setTimeout(r, 400))
  }
  return all.length
}
