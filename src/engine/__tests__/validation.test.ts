import { describe, it, expect } from 'vitest'
import { validateParams } from '../validation'
import type { SimulationParams } from '../types'

function makeParams(overrides: Partial<SimulationParams> = {}): SimulationParams {
  return {
    startingBalance: 5000,
    apr: 18,
    startDate: new Date(2026, 4, 20),
    dueDayOfMonth: 15,
    mode: 'fixed_payment',
    monthlyPayment: 150,
    newMonthlyCharges: 0,
    ...overrides,
  }
}

describe('validateParams — fixed_payment mode', () => {
  it('returns null when payment exceeds first-month interest', () => {
    // first month interest = 5000 * (18/100/12) = 75.00; payment 150 > 75
    expect(validateParams(makeParams({ monthlyPayment: 150 }))).toBeNull()
  })

  it('returns error when payment exactly equals first-month interest', () => {
    // 5000 * 0.015 = 75.00; payment 75 is NOT > 75
    const result = validateParams(makeParams({ monthlyPayment: 75 }))
    expect(result).not.toBeNull()
    expect(result!.type).toBe('payment_too_low')
    expect(result!.minViablePayment).toBe(75.01)
  })

  it('returns error when payment is less than first-month interest', () => {
    const result = validateParams(makeParams({ monthlyPayment: 50 }))
    expect(result).not.toBeNull()
    expect(result!.type).toBe('payment_too_low')
  })

  it('minViablePayment is first-month-interest + $0.01', () => {
    // APR 24%, balance 10000: monthly_rate = 0.02, interest = 200.00
    const result = validateParams(makeParams({ apr: 24, startingBalance: 10000, monthlyPayment: 200 }))
    expect(result).not.toBeNull()
    expect(result!.minViablePayment).toBe(200.01)
  })

  it('returns null when APR is 0 regardless of payment size', () => {
    expect(validateParams(makeParams({ apr: 0, monthlyPayment: 1 }))).toBeNull()
  })

  it('returns null for a payment of $0.01 above the interest threshold', () => {
    // interest = 75.00; payment 75.01 is valid
    expect(validateParams(makeParams({ monthlyPayment: 75.01 }))).toBeNull()
  })
})

describe('validateParams — fixed_months mode', () => {
  it('returns null (never rejects) in fixed_months mode', () => {
    expect(validateParams(makeParams({ mode: 'fixed_months', numberOfMonths: 36 }))).toBeNull()
  })
})
