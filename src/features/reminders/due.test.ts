import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, dueNudges, inQuietHours, manilaMinutes, toMinutes, type DayFlags } from './due'

const open: DayFlags = { weightLogged: false, dinnerLogged: false, workoutDone: false, isTrainingDay: true }
const at = (h: number, m = 0) => h * 60 + m

describe('toMinutes', () => {
  it('parses and rejects', () => {
    expect(toMinutes('08:30')).toBe(510)
    expect(toMinutes('24:00')).toBeNull()
    expect(toMinutes('x')).toBeNull()
  })
})

describe('manilaMinutes', () => {
  it('uses Asia/Manila (UTC+8)', () => {
    expect(manilaMinutes(new Date('2026-01-01T00:30:00Z'))).toBe(8 * 60 + 30)
  })
})

describe('inQuietHours', () => {
  const q = DEFAULT_SETTINGS.quiet
  it('wraps midnight', () => {
    expect(inQuietHours(at(23), q)).toBe(true)
    expect(inQuietHours(at(3), q)).toBe(true)
    expect(inQuietHours(at(7), q)).toBe(false)
    expect(inQuietHours(at(12), q)).toBe(false)
    expect(inQuietHours(at(22), q)).toBe(true)
  })
  it('same-day window and disabled', () => {
    expect(inQuietHours(at(13), { on: true, start: '12:00', end: '14:00' })).toBe(true)
    expect(inQuietHours(at(23), { ...q, on: false })).toBe(false)
  })
})

describe('dueNudges', () => {
  it('nothing before the times', () => {
    expect(dueNudges(at(7, 30), { ...DEFAULT_SETTINGS, quiet: { ...DEFAULT_SETTINGS.quiet, on: false } }, open)).toEqual([])
  })
  it('weight due after its time until logged', () => {
    expect(dueNudges(at(9), DEFAULT_SETTINGS, open)).toEqual(['weight'])
    expect(dueNudges(at(9), DEFAULT_SETTINGS, { ...open, weightLogged: true })).toEqual([])
  })
  it('workout only on training days and until done', () => {
    expect(dueNudges(at(18), DEFAULT_SETTINGS, open)).toEqual(['weight', 'workout'])
    expect(dueNudges(at(18), DEFAULT_SETTINGS, { ...open, isTrainingDay: false })).toEqual(['weight'])
    expect(dueNudges(at(18), DEFAULT_SETTINGS, { ...open, workoutDone: true })).toEqual(['weight'])
  })
  it('dinner nudge in the evening', () => {
    expect(dueNudges(at(20, 15), DEFAULT_SETTINGS, { ...open, weightLogged: true, workoutDone: true })).toEqual(['dinner'])
    expect(dueNudges(at(20, 15), DEFAULT_SETTINGS, { weightLogged: true, workoutDone: true, dinnerLogged: true, isTrainingDay: true })).toEqual([])
  })
  it('quiet hours suppress everything', () => {
    expect(dueNudges(at(23), DEFAULT_SETTINGS, open)).toEqual([])
    expect(dueNudges(at(6), DEFAULT_SETTINGS, open)).toEqual([])
  })
  it('respects per-nudge toggles', () => {
    const s = { ...DEFAULT_SETTINGS, weight: { ...DEFAULT_SETTINGS.weight, on: false } }
    expect(dueNudges(at(9), s, open)).toEqual([])
  })
  it('ignores invalid times', () => {
    const s = { ...DEFAULT_SETTINGS, weight: { on: true, time: '' } }
    expect(dueNudges(at(9), s, open)).toEqual([])
  })
})
