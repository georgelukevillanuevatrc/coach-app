import { describe, expect, it } from 'vitest'
import { bestSet, deloadSets, isDeloadWeek, isPR, nextTarget, weekIndex } from './progression'

describe('nextTarget', () => {
  it('adds 2.5 kg upper when all sets hit rep_max', () => {
    const t = nextTarget([{ weight_kg: 60, reps: 10 }, { weight_kg: 60, reps: 10 }, { weight_kg: 60, reps: 10 }], 6, 10, false)
    expect(t).toMatchObject({ weight_kg: 62.5, reps: 6, increase: true, hint: 'Hit 3x10 last time, try +2.5 kg today' })
  })
  it('adds 5 kg lower', () => {
    expect(nextTarget([{ weight_kg: 100, reps: 8 }, { weight_kg: 100, reps: 8 }], 5, 8, true).weight_kg).toBe(105)
  })
  it('keeps weight and aims for more reps otherwise', () => {
    const t = nextTarget([{ weight_kg: 60, reps: 10 }, { weight_kg: 60, reps: 8 }, { weight_kg: 60, reps: 8 }], 8, 12, false)
    expect(t).toMatchObject({ weight_kg: 60, reps: 9, increase: false })
    expect(t.hint).toContain('Keep 60 kg')
  })
  it('caps reps at rep_max', () => {
    expect(nextTarget([{ weight_kg: 20, reps: 12 }, { weight_kg: 20, reps: 11 }], 8, 12, false).reps).toBe(12)
  })
  it('handles no history', () => {
    const t = nextTarget([], 8, 12, false)
    expect(t.weight_kg).toBe(0); expect(t.reps).toBe(8)
  })
})
describe('PRs', () => {
  const hist = [{ weight_kg: 60, reps: 10 }]
  it('detects heavier or more reps', () => {
    expect(isPR({ weight_kg: 65, reps: 8 }, hist)).toBe(true)
    expect(isPR({ weight_kg: 60, reps: 11 }, hist)).toBe(true)
    expect(isPR({ weight_kg: 60, reps: 9 }, hist)).toBe(false)
  })
  it('first time is baseline', () => expect(isPR({ weight_kg: 60, reps: 10 }, [])).toBe(false))
  it('bestSet', () => expect(bestSet([{ weight_kg: 50, reps: 5 }, { weight_kg: 60, reps: 8 }])).toEqual({ weight_kg: 60, reps: 8 }))
})
describe('deload', () => {
  it('week index', () => { expect(weekIndex('2026-10-05', '2026-10-17')).toBe(1); expect(weekIndex('2026-10-05', '2026-11-02')).toBe(4) })
  it('deloads every 5th week by default', () => {
    expect([0, 1, 2, 3, 4, 9].map((w) => isDeloadWeek(w))).toEqual([false, false, false, false, true, true])
    expect(isDeloadWeek(3, 4)).toBe(true)
  })
  it('about 60% volume', () => { expect(deloadSets(4)).toBe(2); expect(deloadSets(3)).toBe(2); expect(deloadSets(1)).toBe(1) })
})
