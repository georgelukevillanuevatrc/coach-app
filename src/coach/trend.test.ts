import { describe, expect, it } from 'vitest'
import { goalProgress, movingAverage, projectGoalDate, trendAt, weeklyRate } from './trend'

const mk = (_start: string, weights: (number | null)[]) =>
  weights.flatMap((w, i) => {
    if (w == null) return []
    const d = new Date(Date.UTC(2026, 0, 1 + i))
    return [{ date: d.toISOString().slice(0, 10), weight_kg: w }]
  })

describe('movingAverage', () => {
  it('returns null until 4 entries are in the window', () => {
    const pts = movingAverage(mk('', [80, 80.2, 79.8, 80]))
    expect(pts.map((p) => p.trend)).toEqual([null, null, null, 80])
  })
  it('uses a trailing 7-day window by date', () => {
    const pts = movingAverage(mk('', [80, 80, 80, 80, 80, 80, 80, 70]))
    expect(pts[7].trend).toBe(Math.round(((80 * 6 + 70) / 7) * 100) / 100)
  })
  it('handles gaps: too few entries in window gives null', () => {
    const pts = movingAverage([
      { date: '2026-01-01', weight_kg: 80 }, { date: '2026-01-02', weight_kg: 80 },
      { date: '2026-01-03', weight_kg: 80 }, { date: '2026-01-04', weight_kg: 80 },
      { date: '2026-01-20', weight_kg: 79 },
    ])
    expect(pts[3].trend).toBe(80)
    expect(pts[4].trend).toBeNull()
  })
  it('sorts unsorted input', () => {
    const pts = movingAverage([{ date: '2026-01-02', weight_kg: 1 }, { date: '2026-01-01', weight_kg: 2 }])
    expect(pts[0].date).toBe('2026-01-01')
  })
})

describe('weeklyRate', () => {
  it('computes kg/week from trend', () => {
    const w = Array.from({ length: 21 }, (_, i) => 80 - i * (0.5 / 7))
    const pts = movingAverage(mk('', w))
    expect(weeklyRate(pts)).toBeCloseTo(-0.5, 1)
  })
  it('null without enough history', () => {
    expect(weeklyRate(movingAverage(mk('', [80, 80, 80, 80])))).toBeNull()
  })
  it('trendAt finds recent trend', () => {
    const pts = movingAverage(mk('', [80, 80, 80, 80, 80]))
    expect(trendAt(pts, '2026-01-06')).toBe(80)
    expect(trendAt(pts, '2026-02-01')).toBeNull()
  })
})

describe('projectGoalDate', () => {
  it('projects at current pace', () => {
    expect(projectGoalDate(80, 78, -0.5, '2026-01-01')).toBe('2026-01-29')
  })
  it('null when moving away or flat', () => {
    expect(projectGoalDate(80, 78, 0.2, '2026-01-01')).toBeNull()
    expect(projectGoalDate(80, 78, 0, '2026-01-01')).toBeNull()
    expect(projectGoalDate(null, 78, -0.5, '2026-01-01')).toBeNull()
  })
  it('today when at goal', () => {
    expect(projectGoalDate(78.05, 78, 0.3, '2026-01-01')).toBe('2026-01-01')
  })
})

describe('goalProgress', () => {
  it('clamps', () => {
    expect(goalProgress(90, 85, 80)).toBe(0.5)
    expect(goalProgress(90, 95, 80)).toBe(0)
    expect(goalProgress(90, 70, 80)).toBe(1)
  })
})
