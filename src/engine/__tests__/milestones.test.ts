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

describe('milestone normal progression', () => {
  it('flags exactly one row each for 25%, 50%, 75%, 100%', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    const flags = result.schedule.map(r => r.milestone).filter(Boolean)
    expect(flags).toContain('25%')
    expect(flags).toContain('50%')
    expect(flags).toContain('75%')
    expect(flags).toContain('100%')
    expect(flags.filter(f => f === '25%').length).toBe(1)
    expect(flags.filter(f => f === '50%').length).toBe(1)
    expect(flags.filter(f => f === '75%').length).toBe(1)
    expect(flags.filter(f => f === '100%').length).toBe(1)
  })

  it('100% milestone is always on the last row', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    const last = result.schedule[result.schedule.length - 1]
    expect(last.milestone).toBe('100%')
  })

  it('milestones appear in ascending row order (25 before 50 before 75 before 100)', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    const indices = (['25%', '50%', '75%', '100%'] as const).map(
      flag => result.schedule.findIndex(r => r.milestone === flag)
    )
    expect(indices[0]).toBeLessThan(indices[1])
    expect(indices[1]).toBeLessThan(indices[2])
    expect(indices[2]).toBeLessThan(indices[3])
  })

  it('summary milestone dates match the flagged rows', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    const row25 = result.schedule.find(r => r.milestone === '25%')!
    expect(result.milestones['25%'].date).toEqual(row25.paymentDate)
    const row50 = result.schedule.find(r => r.milestone === '50%')!
    expect(result.milestones['50%'].date).toEqual(row50.paymentDate)
  })

  it('no milestone has a joint annotation in normal progression', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    expect(result.milestones['25%'].joint).toBeUndefined()
    expect(result.milestones['50%'].joint).toBeUndefined()
  })
})

describe('milestone leap-frogging: single payment crosses 25%, 50%, AND 75%', () => {
  // $200 balance, APR 0, $150/month:
  // Month 1: principal = 150; thresholds: 25%=50, 50%=100, 75%=150
  // cumulative = 150 >= 150 (75%) — flags 75%, backfills 50% and 25%
  it('row 1 is flagged as 75%, not 25% or 50%', () => {
    const result = runSimulation(makeParams({ startingBalance: 200, apr: 0, monthlyPayment: 150 }))
    if (isValidationError(result)) throw new Error()
    expect(result.schedule[0].milestone).toBe('75%')
  })

  it('no row is flagged as 25% or 50%', () => {
    const result = runSimulation(makeParams({ startingBalance: 200, apr: 0, monthlyPayment: 150 }))
    if (isValidationError(result)) throw new Error()
    expect(result.schedule.some(r => r.milestone === '25%')).toBe(false)
    expect(result.schedule.some(r => r.milestone === '50%')).toBe(false)
  })

  it('summary still has dates for the leapfrogged 25% and 50%', () => {
    const result = runSimulation(makeParams({ startingBalance: 200, apr: 0, monthlyPayment: 150 }))
    if (isValidationError(result)) throw new Error()
    expect(result.milestones['25%'].date).toBeDefined()
    expect(result.milestones['50%'].date).toBeDefined()
  })

  it('leapfrogged 25% and 50% both carry joint annotation pointing to 75%', () => {
    const result = runSimulation(makeParams({ startingBalance: 200, apr: 0, monthlyPayment: 150 }))
    if (isValidationError(result)) throw new Error()
    expect(result.milestones['25%'].joint).toBe('75%')
    expect(result.milestones['50%'].joint).toBe('75%')
  })

  it('leapfrogged milestone dates equal the date of the row that flagged 75%', () => {
    const result = runSimulation(makeParams({ startingBalance: 200, apr: 0, monthlyPayment: 150 }))
    if (isValidationError(result)) throw new Error()
    const row75 = result.schedule.find(r => r.milestone === '75%')!
    expect(result.milestones['25%'].date).toEqual(row75.paymentDate)
    expect(result.milestones['50%'].date).toEqual(row75.paymentDate)
  })
})

describe('milestone leap-frogging: 25% skipped when 50% is first crossed', () => {
  // $300 balance, APR 0, $200/month:
  // Month 1: principal = 200; thresholds: 25%=75, 50%=150
  // cumulative = 200 >= 150 → flags 50%, backfills 25%
  it('row 1 is flagged as 50%, not 25%', () => {
    const result = runSimulation(makeParams({ startingBalance: 300, apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error()
    expect(result.schedule[0].milestone).toBe('50%')
  })

  it('no row is flagged as 25%', () => {
    const result = runSimulation(makeParams({ startingBalance: 300, apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error()
    expect(result.schedule.some(r => r.milestone === '25%')).toBe(false)
  })

  it('25% carries joint annotation pointing to 50%', () => {
    const result = runSimulation(makeParams({ startingBalance: 300, apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error()
    expect(result.milestones['25%'].joint).toBe('50%')
  })

  it('75% has no joint annotation (it was hit separately)', () => {
    const result = runSimulation(makeParams({ startingBalance: 300, apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error()
    expect(result.milestones['75%'].joint).toBeUndefined()
  })
})

describe('milestone anchoring with new monthly charges', () => {
  it('25% milestone fires when cumulative principal >= 25% of ORIGINAL balance, not growing balance', () => {
    // $1000 balance, APR 0, $200/month, $50 new charges
    // Original balance = 1000; threshold25 = 250
    // Month 1: balance_after = 1000 + 0 + 50 = 1050; payment = 200; principal = 200
    // Month 2: balance = 850 + 0 + 50 = 900; payment = 200; principal = 200; cum = 400 >= 250 → 25% hit
    // (The threshold stays at 250, anchored to original 1000)
    const result = runSimulation(makeParams({
      startingBalance: 1000, apr: 0, monthlyPayment: 200, newMonthlyCharges: 50,
    }))
    if (isValidationError(result)) throw new Error()
    // Find when 25% was hit
    const m25date = result.milestones['25%'].date
    // At that point, cumulative principal paid across rows up to that date should be >= 250
    let cumPrincipal = 0
    for (const row of result.schedule) {
      cumPrincipal += row.principalPaid
      if (row.paymentDate.getTime() === m25date.getTime()) {
        expect(cumPrincipal).toBeGreaterThanOrEqual(250) // 25% of 1000
        break
      }
    }
  })
})
