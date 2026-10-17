import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export interface WeightPoint { date: string; weight_kg: number }
export interface TrendPoint extends WeightPoint { trend: number | null }

export const TREND_WINDOW_DAYS = 7
export const TREND_MIN_ENTRIES = 4

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const dayDiff = (a: string, b: string) => differenceInCalendarDays(parseISO(a), parseISO(b))

/** Trailing 7-day (by date, inclusive) moving average; null when fewer than 4 entries fall in the window. */
export function movingAverage(entries: WeightPoint[]): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((p) => {
    const inWin = sorted.filter((q) => {
      const d = dayDiff(p.date, q.date)
      return d >= 0 && d < TREND_WINDOW_DAYS
    })
    const trend = inWin.length >= TREND_MIN_ENTRIES
      ? round(inWin.reduce((s, q) => s + q.weight_kg, 0) / inWin.length)
      : null
    return { ...p, trend }
  })
}

/** Trend value at (or most recently before) a date, searching at most `maxBack` days back. */
export function trendAt(points: TrendPoint[], date: string, maxBack = 3): number | null {
  let best: TrendPoint | undefined
  for (const p of points) {
    const d = dayDiff(date, p.date)
    if (p.trend != null && d >= 0 && d <= maxBack && (!best || p.date > best.date)) best = p
  }
  return best?.trend ?? null
}

/** Weekly rate of change (kg/week) of the trend: latest trend vs the trend about 7 days earlier. Null if not enough data. */
export function weeklyRate(points: TrendPoint[]): number | null {
  const withTrend = points.filter((p) => p.trend != null)
  const last = withTrend[withTrend.length - 1]
  if (!last) return null
  let prev: TrendPoint | undefined
  for (const p of withTrend) {
    const d = dayDiff(last.date, p.date)
    if (d >= 5 && d <= 10 && (!prev || Math.abs(d - 7) < Math.abs(dayDiff(last.date, prev.date) - 7))) prev = p
  }
  if (!prev) return null
  const days = dayDiff(last.date, prev.date)
  return round(((last.trend! - prev.trend!) / days) * 7)
}

/** Date (yyyy-MM-dd) the trend reaches goal at the current pace; null if not heading there. */
export function projectGoalDate(trendNow: number | null, goalKg: number, rateKgPerWeek: number | null, today: string): string | null {
  if (trendNow == null || rateKgPerWeek == null) return null
  const gap = goalKg - trendNow
  if (Math.abs(gap) < 0.1) return today
  if (rateKgPerWeek === 0 || Math.sign(gap) !== Math.sign(rateKgPerWeek)) return null
  const days = Math.ceil((gap / rateKgPerWeek) * 7)
  if (days > 3650) return null
  return format(addDays(parseISO(today), days), 'yyyy-MM-dd')
}

/** 0..1 progress from start weight to goal weight (clamped). */
export function goalProgress(startKg: number, nowKg: number, goalKg: number): number {
  const total = goalKg - startKg
  if (Math.abs(total) < 0.05) return 1
  return Math.min(1, Math.max(0, (nowKg - startKg) / total))
}
