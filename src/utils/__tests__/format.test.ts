import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate } from '../format'

describe('formatCurrency', () => {
  it('formats a whole number with two decimal places', () => {
    expect(formatCurrency(5000)).toBe('$5,000.00')
  })
  it('formats a value with cents', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
  it('formats a small value', () => {
    expect(formatCurrency(48.32)).toBe('$48.32')
  })
})

describe('formatDate', () => {
  it('formats a date as "MMM D, YYYY"', () => {
    expect(formatDate(new Date(2030, 3, 15))).toBe('Apr 15, 2030')
  })
  it('formats single-digit days without zero-padding', () => {
    expect(formatDate(new Date(2026, 5, 5))).toBe('Jun 5, 2026')
  })
  it('formats January correctly', () => {
    expect(formatDate(new Date(2027, 0, 31))).toBe('Jan 31, 2027')
  })
})
