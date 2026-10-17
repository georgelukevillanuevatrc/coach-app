import { describe, expect, it } from 'vitest'
import { countWeeksOffTarget, suggestCheckin, targetWeeklyRate, type CheckinInput } from './checkin'

const base: CheckinInput = {
  trendNow: 80, trendPrev: 80.5, goalType: 'lose', goalPace: 0.15, weightKg: 80,
  currentCalories: 2000, adherence: 0.9, weeksOffTarget: 0,
}

describe('targetWeeklyRate', () => {
  it('lose is negative, gain positive, maintain zero', () => {
    expect(targetWeeklyRate('lose', 0.15, 2000)).toBeLessThan(0)
    expect(targetWeeklyRate('gain', 0.07, 2800)).toBeGreaterThan(0)
    expect(targetWeeklyRate('maintain', 0, 2500)).toBe(0)
  })
})

describe('suggestCheckin', () => {
  it('keeps going on pace', () => {
    const s = targetWeeklyRate('lose', 0.15, 2000)
    const r = suggestCheckin({ ...base, trendPrev: 80 - s })
    expect(r.action).toBe('keep')
    expect(r.calorieDelta).toBe(0)
    expect(r.message).toMatch(/confirm/i)
  })
  it('does not change after only one week off target', () => {
    const r = suggestCheckin({ ...base, trendPrev: 80, weeksOffTarget: 1 })
    expect(r.action).toBe('keep')
  })
  it('cuts calories after two weeks too slow, within 100-150', () => {
    const r = suggestCheckin({ ...base, trendPrev: 80, weeksOffTarget: 2 })
    expect(r.action).toBe('adjust')
    expect(r.calorieDelta).toBeLessThan(0)
    expect(Math.abs(r.calorieDelta)).toBeGreaterThanOrEqual(100)
    expect(Math.abs(r.calorieDelta)).toBeLessThanOrEqual(150)
    expect(r.newCalories).toBe(2000 + r.calorieDelta)
  })
  it('adds calories when losing too fast', () => {
    const r = suggestCheckin({ ...base, trendNow: 79, trendPrev: 80, weeksOffTarget: 3 })
    expect(r.calorieDelta).toBeGreaterThan(0)
    expect(r.calorieDelta).toBeLessThanOrEqual(150)
  })
  it('gain: slow trend adds calories', () => {
    const r = suggestCheckin({ ...base, goalType: 'gain', goalPace: 0.07, trendNow: 70, trendPrev: 70, weeksOffTarget: 2, currentCalories: 2800 })
    expect(r.calorieDelta).toBeGreaterThan(0)
  })
  it('low adherence holds off, supportive wording', () => {
    const r = suggestCheckin({ ...base, trendPrev: 80, weeksOffTarget: 2, adherence: 0.3 })
    expect(r.action).toBe('keep')
    expect(r.message).not.toMatch(/fail|bad|lazy|guilt/i)
  })
  it('deload when due', () => {
    const r = suggestCheckin({ ...base, deloadDue: true })
    expect(r.action).toBe('deload')
    expect(r.calorieDelta).toBe(0)
    expect(r.message).toMatch(/confirm/i)
  })
  it('keeps with no data', () => {
    expect(suggestCheckin({ ...base, trendNow: null }).action).toBe('keep')
  })
})

describe('countWeeksOffTarget', () => {
  it('counts consecutive off weeks, latest first', () => {
    expect(countWeeksOffTarget([80, 80, 80], -0.5)).toBe(2)
    expect(countWeeksOffTarget([79.5, 80, 80], -0.5)).toBe(0)
    expect(countWeeksOffTarget([80, 80, 80.5], -0.5)).toBe(1)
    expect(countWeeksOffTarget([80, null, 80], -0.5)).toBe(0)
  })
})
