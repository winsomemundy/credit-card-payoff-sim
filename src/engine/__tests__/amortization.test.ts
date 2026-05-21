import { describe, it, expect } from 'vitest'
import { deriveMonthlyPayment } from '../amortization'

describe('deriveMonthlyPayment', () => {
  it('divides evenly when APR is 0 (monthly rate 0)', () => {
    // 1200 / 12 = 100
    expect(deriveMonthlyPayment(1200, 0, 12, 0).payment).toBeCloseTo(100, 2)
  })

  it('computes standard amortization for 18% APR over 36 months', () => {
    // monthly_rate = 0.015; formula: P * r*(1+r)^n / ((1+r)^n - 1)
    // 5000 * 0.015 * (1.015^36) / (1.015^36 - 1) ≈ 180.76
    expect(deriveMonthlyPayment(5000, 0.015, 36, 0).payment).toBeCloseTo(180.76, 1)
  })

  it('adds new_monthly_charges to the derived payment', () => {
    const withoutCharges = deriveMonthlyPayment(5000, 0.015, 36, 0).payment
    const withCharges = deriveMonthlyPayment(5000, 0.015, 36, 50).payment
    expect(withCharges).toBeCloseTo(withoutCharges + 50, 2)
  })

  it('returns lowPaymentWarning: true when payment < 25', () => {
    // 100/12 ≈ 8.33 — less than $25
    const result = deriveMonthlyPayment(100, 0, 12, 0)
    expect(result.payment).toBeCloseTo(8.33, 1)
    expect(result.lowPaymentWarning).toBe(true)
  })

  it('returns lowPaymentWarning: false when payment >= 25', () => {
    const result = deriveMonthlyPayment(5000, 0.015, 36, 0)
    expect(result.lowPaymentWarning).toBe(false)
  })

  it('ceils derived payment to nearest cent to prevent interest rounding drift', () => {
    // $3500 / 18% APR / 36 months / $100 new charges
    // Raw formula: 226.53338... — without ceiling the simulator ran 37 months instead of 36
    // because per-cycle interest rounding accumulated +$0.013832 drift over 36 months
    const result = deriveMonthlyPayment(3500, 0.015, 36, 100)
    expect(result.payment).toBe(226.54)
  })
})
