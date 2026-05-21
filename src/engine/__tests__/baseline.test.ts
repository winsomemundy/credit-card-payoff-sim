import { describe, it, expect } from 'vitest'
import { runSimulation } from '../calculator'
import { isValidationError } from '../types'
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

describe('interest saved vs. minimum payment', () => {
  it('interestSaved is positive when paying more than minimum', () => {
    const result = runSimulation(makeParams({ monthlyPayment: 150 }))
    if (isValidationError(result)) throw new Error()
    expect(result.interestSaved).toBeGreaterThan(0)
  })

  it('monthsSaved is positive when paying more than minimum', () => {
    const result = runSimulation(makeParams({ monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error()
    expect(result.monthsSaved).toBeGreaterThan(0)
  })

  it('spec example: saves roughly $4,000–$5,200 vs minimum on $5k/18%/$150', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    // Baseline formula: max($25, 1% of balance + monthly interest) — standard US credit card minimum
    // Baseline: ~$6,539 total interest over 222 months
    // User plan: ~$2,028 total interest over 47 months
    // Savings: ~$4,511 — consistent with CLAUDE.md's "~$4,312" sanity-check figure
    expect(result.interestSaved!).toBeGreaterThan(4000)
    expect(result.interestSaved!).toBeLessThan(5200)
  })

  it('interestSaved is undefined when plan payment is at or below minimum', () => {
    // $500 balance, APR 18%: min payment = max(25, 500*0.02) = max(25,10) = $25 each month
    // If user pays exactly $25, the plan IS the minimum — no savings
    // But wait: $25 > first-month interest (500 * 0.015 = $7.50) so it's a valid plan
    // And $25 = the minimum payment, so interestSaved should be 0 → suppressed
    const result = runSimulation(makeParams({
      startingBalance: 500,
      apr: 18,
      monthlyPayment: 25,
    }))
    if (isValidationError(result)) throw new Error()
    // interestSaved should be undefined (suppressed) — paying same as minimum
    expect(result.interestSaved).toBeUndefined()
  })

  it('both interestSaved and monthsSaved are undefined together', () => {
    const result = runSimulation(makeParams({
      startingBalance: 500,
      apr: 18,
      monthlyPayment: 25,
    }))
    if (isValidationError(result)) throw new Error()
    expect(result.interestSaved).toBeUndefined()
    expect(result.monthsSaved).toBeUndefined()
  })
})

describe('baseline safety-cap scenario', () => {
  it('sets baselineHitSafetyCap to true when new charges cause balance to grow under minimum payments', () => {
    // $3,500 / 18% APR / $100 new charges/month:
    //   baseline min payment = max($25, 1% of $3,500 + $52.50) = max($25, $87.50) = $87.50
    //   balance grows: $87.50 payment < $52.50 interest + $100 new charges = $152.50 added
    //   net growth ≈ +$65/month → hits 600-month cap
    const result = runSimulation(makeParams({
      startingBalance: 3500,
      apr: 18,
      monthlyPayment: 200, // user pays $200 (valid: > $52.50 first-month interest)
      newMonthlyCharges: 100,
    }))
    if (isValidationError(result)) throw new Error()
    expect(result.baselineHitSafetyCap).toBe(true)
  })

  it('interestSaved is still defined when baseline hit cap', () => {
    const result = runSimulation(makeParams({
      startingBalance: 3500,
      apr: 18,
      monthlyPayment: 200,
      newMonthlyCharges: 100,
    }))
    if (isValidationError(result)) throw new Error()
    expect(result.interestSaved).toBeDefined()
    expect(result.interestSaved!).toBeGreaterThan(0)
  })
})
