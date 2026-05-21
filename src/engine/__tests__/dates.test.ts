import { describe, it, expect } from 'vitest'
import { daysInMonth, adjustForShortMonth, nextPaymentDate, firstPaymentDate } from '../dates'

describe('daysInMonth', () => {
  it('returns 31 for January', () => expect(daysInMonth(2023, 0)).toBe(31))
  it('returns 28 for February in non-leap year', () => expect(daysInMonth(2023, 1)).toBe(28))
  it('returns 29 for February in leap year', () => expect(daysInMonth(2024, 1)).toBe(29))
  it('returns 30 for April', () => expect(daysInMonth(2023, 3)).toBe(30))
  it('returns 31 for December', () => expect(daysInMonth(2023, 11)).toBe(31))
})

describe('adjustForShortMonth', () => {
  it('returns the requested day when it fits', () => {
    expect(adjustForShortMonth(2023, 0, 15)).toEqual(new Date(2023, 0, 15))
  })
  it('clamps day 31 in February (non-leap) to the 28th', () => {
    expect(adjustForShortMonth(2023, 1, 31)).toEqual(new Date(2023, 1, 28))
  })
  it('clamps day 31 in February (leap year) to the 29th', () => {
    expect(adjustForShortMonth(2024, 1, 31)).toEqual(new Date(2024, 1, 29))
  })
  it('clamps day 31 in April to the 30th', () => {
    expect(adjustForShortMonth(2023, 3, 31)).toEqual(new Date(2023, 3, 30))
  })
  it('does not clamp when day equals month length exactly', () => {
    expect(adjustForShortMonth(2023, 1, 28)).toEqual(new Date(2023, 1, 28))
  })
})

describe('nextPaymentDate', () => {
  it('advances to the same due day next month', () => {
    expect(nextPaymentDate(new Date(2023, 0, 15), 15)).toEqual(new Date(2023, 1, 15))
  })
  it('wraps December to January of the following year', () => {
    expect(nextPaymentDate(new Date(2023, 11, 15), 15)).toEqual(new Date(2024, 0, 15))
  })
  it('clamps due day 31 in a short target month', () => {
    // Jan 31 → Feb 28 (2023 is non-leap)
    expect(nextPaymentDate(new Date(2023, 0, 31), 31)).toEqual(new Date(2023, 1, 28))
  })
  it('recovers to the full due day when the month is long enough', () => {
    // Feb 28 (clamped from 31) → Mar 31
    expect(nextPaymentDate(new Date(2023, 1, 28), 31)).toEqual(new Date(2023, 2, 31))
  })
})

describe('firstPaymentDate', () => {
  it('uses the current month when start day is before the due day', () => {
    expect(firstPaymentDate(new Date(2026, 4, 5), 15)).toEqual(new Date(2026, 4, 15))
  })
  it('uses the current month when start day equals the due day', () => {
    expect(firstPaymentDate(new Date(2026, 4, 15), 15)).toEqual(new Date(2026, 4, 15))
  })
  it('advances to next month when start day is after the due day', () => {
    // Start May 20, due day 15 → June 15
    expect(firstPaymentDate(new Date(2026, 4, 20), 15)).toEqual(new Date(2026, 5, 15))
  })
  it('does not clamp when first payment lands in a full month', () => {
    expect(firstPaymentDate(new Date(2023, 0, 5), 31)).toEqual(new Date(2023, 0, 31))
  })
  it('stays in January when start day <= due day (even if both are large)', () => {
    // Jan 20, due day 31: 20 <= 31 → Jan 31
    expect(firstPaymentDate(new Date(2023, 0, 20), 31)).toEqual(new Date(2023, 0, 31))
  })
  it('advances and clamps when start day > due day and next month is short', () => {
    // Jan 30, due day 29: 30 > 29 → advance to Feb → clamp 29 → Feb 28
    expect(firstPaymentDate(new Date(2023, 0, 30), 29)).toEqual(new Date(2023, 1, 28))
  })
})
