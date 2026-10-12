import { describe, it, expect } from 'vitest'
import { runSimulation } from '../calculator'
import { isValidationError } from '../types'
import type { SimulationParams, SimulationResult } from '../types'
import { formatMilestoneDate } from '../../utils/format'

// The reported scenario: $5,000 at 18% APR over a 600-month target
function run(overrides: Partial<SimulationParams> = {}): SimulationResult {
  const result = runSimulation({
    startingBalance: 5000,
    apr: 18,
    startDate: new Date(Date.UTC(2026, 9, 12)),
    dueDayOfMonth: 15,
    mode: 'fixed_months',
    numberOfMonths: 600,
    newMonthlyCharges: 0,
    ...overrides,
  })
  if (isValidationError(result)) throw new Error('unexpected validation error')
  return result
}

describe('fixed_months — long, nearly interest-only targets', () => {
  it('clears the balance within a 600-month target', () => {
    const result = run()
    expect(result.schedule.at(-1)!.endingBalance).toBe(0)
    expect(result.hitSafetyCap).toBeFalsy()
    expect(result.totalMonths).toBeLessThanOrEqual(600)
    expect(result.milestones['100%'].date).toBeDefined()
  })

  it('raises the payment by the cent the formula falls short', () => {
    // The formula gives $75.0099 → $75.01, which leaves $294.44 after 600 months
    expect(run().monthlyPayment).toBe(75.02)
  })

  it('total paid equals principal plus interest once the balance is cleared', () => {
    const result = run()
    expect(result.totalAmountPaid).toBeCloseTo(5000 + result.totalInterestPaid, 2)
  })

  it('reports the target and the shorter actual length', () => {
    const result = run({ numberOfMonths: 599 })
    expect(result.targetMonths).toBe(599)
    expect(result.totalMonths).toBeLessThan(599)
  })

  it('leaves typical targets unchanged', () => {
    const result = run({ numberOfMonths: 36 })
    expect(result.totalMonths).toBe(36)
    expect(result.monthlyPayment).toBe(180.77)
  })
})

describe('issuer minimum payment', () => {
  it('flags a payment below the first-month minimum', () => {
    const result = run()
    expect(result.minimumPayment).toBe(125) // 1% of $5,000 + $75 interest
    expect(result.belowMinimumPayment).toBe(true)
  })

  it('does not flag a payment at or above the minimum', () => {
    const result = run({ mode: 'fixed_payment', monthlyPayment: 150, numberOfMonths: undefined })
    expect(result.belowMinimumPayment).toBe(false)
  })

  it('does not flag a payment that clears a balance smaller than the minimum', () => {
    const result = run({ startingBalance: 20, mode: 'fixed_payment', monthlyPayment: 20.3, numberOfMonths: undefined })
    expect(result.belowMinimumPayment).toBe(false)
  })
})

describe('cost compared with paying the minimum', () => {
  it('reports extra interest and months when the plan costs more', () => {
    const result = run()
    expect(result.interestSaved).toBeUndefined()
    expect(result.extraInterest!).toBeGreaterThan(25000)
    expect(result.extraMonths!).toBeGreaterThan(0)
  })

  it('reports no extra cost when the plan beats the minimum', () => {
    const result = run({ numberOfMonths: 36 })
    expect(result.extraInterest).toBeUndefined()
    expect(result.interestSaved!).toBeGreaterThan(0)
  })
})

describe('milestones not reached within the safety cap', () => {
  it('leaves the 100% date undefined and says so in words', () => {
    // Balance grows: interest plus charges exceed the payment
    const result = run({
      startingBalance: 100000, apr: 50, mode: 'fixed_payment',
      monthlyPayment: 4167, numberOfMonths: undefined, newMonthlyCharges: 100,
    })
    expect(result.hitSafetyCap).toBe(true)
    expect(result.milestones['100%'].date).toBeUndefined()
    expect(formatMilestoneDate(result.milestones['100%'].date)).toBe('not reached within 50 years')
  })
})
