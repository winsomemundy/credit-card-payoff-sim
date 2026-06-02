import { describe, it, expect } from 'vitest'
import { runSimulation, SAFETY_CAP } from '../calculator'
import { isValidationError } from '../types'
import type { SimulationParams } from '../types'

function makeParams(overrides: Partial<SimulationParams> = {}): SimulationParams {
  return {
    startingBalance: 5000,
    apr: 18,
    startDate: new Date(2026, 4, 20), // May 20, 2026
    dueDayOfMonth: 15,
    mode: 'fixed_payment',
    monthlyPayment: 150,
    newMonthlyCharges: 0,
    ...overrides,
  }
}

describe('runSimulation — spec sanity-check ($5k, 18% APR, $150/month)', () => {
  it('returns a SimulationResult (not a ValidationError)', () => {
    const result = runSimulation(makeParams())
    expect(isValidationError(result)).toBe(false)
  })

  it('first payment is Jun 15 2026 (start after due day)', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[0].paymentDate).toEqual(new Date(2026, 5, 15))
  })

  it('first row: interest $75.00, principal $75.00, ending balance $4925.00', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    const row = result.schedule[0]
    expect(row.interestAccrued).toBe(75.00)
    expect(row.principalPaid).toBe(75.00)
    expect(row.endingBalance).toBe(4925.00)
    expect(row.startingBalance).toBe(5000.00)
    expect(row.paymentAmount).toBe(150.00)
  })

  it('total months is 47', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.totalMonths).toBe(47)
  })

  it('effective payoff date is Apr 15, 2030', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.effectivePayoffDate).toEqual(new Date(2030, 3, 15))
  })

  it('final payment clears balance to exactly $0.00', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    const lastRow = result.schedule[result.schedule.length - 1]
    expect(lastRow.endingBalance).toBe(0)
  })

  it('final payment is less than the regular $150 payment', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    const lastRow = result.schedule[result.schedule.length - 1]
    expect(lastRow.paymentAmount).toBeLessThan(150)
  })

  it('schedule has 47 rows', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule.length).toBe(47)
  })
})

describe('runSimulation — APR = 0', () => {
  it('charges no interest in any row', () => {
    const result = runSimulation(makeParams({ apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    result.schedule.forEach(row => {
      expect(row.interestAccrued).toBe(0)
    })
  })

  it('totalInterestPaid is 0', () => {
    const result = runSimulation(makeParams({ apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.totalInterestPaid).toBe(0)
  })

  it('totalAmountPaid equals startingBalance when APR is 0', () => {
    const result = runSimulation(makeParams({ apr: 0, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.totalAmountPaid).toBeCloseTo(5000, 1)
  })
})

describe('runSimulation — returns ValidationError when payment too low', () => {
  it('returns ValidationError for payment <= first-month interest', () => {
    const result = runSimulation(makeParams({ monthlyPayment: 75 }))
    expect(isValidationError(result)).toBe(true)
    if (!isValidationError(result)) throw new Error()
    expect(result.type).toBe('payment_too_low')
    expect(result.minViablePayment).toBe(75.01)
  })
})

describe('runSimulation — single-payment payoff', () => {
  it('produces a 1-row schedule when payment >= full balance + interest', () => {
    const result = runSimulation(makeParams({ startingBalance: 100, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule.length).toBe(1)
    expect(result.schedule[0].endingBalance).toBe(0)
    expect(result.schedule[0].milestone).toBe('100%')
  })

  it('all milestone dates are defined even when a single payment clears the balance', () => {
    const result = runSimulation(makeParams({ startingBalance: 100, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.milestones['25%'].date).toBeDefined()
    expect(result.milestones['50%'].date).toBeDefined()
    expect(result.milestones['75%'].date).toBeDefined()
    expect(result.milestones['100%'].date).toBeDefined()
  })

  it('backfilled milestone dates equal the single payment date', () => {
    const result = runSimulation(makeParams({ startingBalance: 100, monthlyPayment: 200 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    const paymentDate = result.schedule[0].paymentDate
    expect(result.milestones['25%'].date).toEqual(paymentDate)
    expect(result.milestones['50%'].date).toEqual(paymentDate)
    expect(result.milestones['75%'].date).toEqual(paymentDate)
    expect(result.milestones['100%'].date).toEqual(paymentDate)
  })
})

describe('runSimulation — fixed_months mode', () => {
  it('derives the correct payment and pays off in exactly N months', () => {
    const result = runSimulation(makeParams({
      mode: 'fixed_months',
      numberOfMonths: 24,
      monthlyPayment: undefined,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.totalMonths).toBe(24)
  })

  it('sets lowPaymentWarning when derived payment < $25', () => {
    const result = runSimulation(makeParams({
      startingBalance: 100,
      apr: 0,
      mode: 'fixed_months',
      numberOfMonths: 12,
      monthlyPayment: undefined,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.lowPaymentWarning).toBe(true)
  })
})

describe('runSimulation — summary totals', () => {
  it('totalAmountPaid equals sum of all paymentAmount rows', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    const sum = result.schedule.reduce((acc, r) => acc + r.paymentAmount, 0)
    expect(result.totalAmountPaid).toBeCloseTo(sum, 2)
  })

  it('totalInterestPaid equals sum of all interestAccrued rows', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    const sum = result.schedule.reduce((acc, r) => acc + r.interestAccrued, 0)
    expect(result.totalInterestPaid).toBeCloseTo(sum, 2)
  })
})

describe('runSimulation — first payment date edge cases', () => {
  it('uses the current month when start day < due day', () => {
    // Start May 5, due day 15 → first payment May 15
    const result = runSimulation(makeParams({ startDate: new Date(2026, 4, 5) }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[0].paymentDate).toEqual(new Date(2026, 4, 15))
  })

  it('uses the current month when start day equals due day', () => {
    // Start May 15, due day 15 → first payment May 15
    const result = runSimulation(makeParams({ startDate: new Date(2026, 4, 15) }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[0].paymentDate).toEqual(new Date(2026, 4, 15))
  })
})

describe('runSimulation — short month (due day 31)', () => {
  it('clamps Feb payment to the 28th in a non-leap year', () => {
    // Start Jan 20, due day 31 → first payment Jan 31, second payment Feb 28
    const result = runSimulation(makeParams({
      startDate: new Date(2023, 0, 20),
      dueDayOfMonth: 31,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[0].paymentDate).toEqual(new Date(2023, 0, 31))
    expect(result.schedule[1].paymentDate).toEqual(new Date(2023, 1, 28))
  })

  it('clamps Feb payment to the 29th in a leap year', () => {
    const result = runSimulation(makeParams({
      startDate: new Date(2024, 0, 20),
      dueDayOfMonth: 31,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[1].paymentDate).toEqual(new Date(2024, 1, 29))
  })

  it('recovers full due-day 31 in March after a clamped February', () => {
    const result = runSimulation(makeParams({
      startDate: new Date(2023, 0, 20),
      dueDayOfMonth: 31,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    // schedule[0] = Jan 31, [1] = Feb 28, [2] = Mar 31
    expect(result.schedule[2].paymentDate).toEqual(new Date(2023, 2, 31))
  })
})

describe('runSimulation — new monthly charges', () => {
  it('adds new charges to the balance each month (takes longer to pay off)', () => {
    const withCharges = runSimulation(makeParams({ newMonthlyCharges: 50, monthlyPayment: 250 }))
    const without = runSimulation(makeParams({ newMonthlyCharges: 0, monthlyPayment: 250 }))
    if (isValidationError(withCharges) || isValidationError(without)) throw new Error()
    expect(withCharges.totalMonths).toBeGreaterThan(without.totalMonths)
  })

  it('sets newChargesNote to true when newMonthlyCharges > 0', () => {
    const result = runSimulation(makeParams({ newMonthlyCharges: 50, monthlyPayment: 250 }))
    if (isValidationError(result)) throw new Error()
    expect(result.newChargesNote).toBe(true)
  })

  it('sets newChargesNote to false when no new charges', () => {
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error()
    expect(result.newChargesNote).toBe(false)
  })
})

describe('runSimulation — safety cap', () => {
  it('schedule length is at most SAFETY_CAP rows', () => {
    // APR 50%, balance 100000, payment just above monthly interest
    // monthly_rate = 50/100/12 ≈ 0.04167, monthly_interest = 4166.67
    // payment 4167.01 is just above the interest — very slow payoff
    const result = runSimulation(makeParams({
      startingBalance: 100000,
      apr: 50,
      monthlyPayment: 4167.01,
      newMonthlyCharges: 0,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule.length).toBeLessThanOrEqual(SAFETY_CAP)
  })
})

describe('runSimulation — safety cap (hitSafetyCap)', () => {
  it('hitSafetyCap is falsy when schedule resolves normally', () => {
    // Standard $5k / 18% APR / $150/month resolves in 47 months
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.hitSafetyCap).toBeFalsy()
  })

  it('hitSafetyCap is true when balance grows due to charges', () => {
    // APR 50%, $100k balance, $4167/month payment, $100/month new charges
    // Monthly interest ≈ 4166.67 + $100 charges > $4167 payment → balance grows
    const result = runSimulation(makeParams({
      startingBalance: 100000,
      apr: 50,
      monthlyPayment: 4167,
      newMonthlyCharges: 100,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.hitSafetyCap).toBe(true)
  })

  it('schedule has exactly 600 rows when cap is hit', () => {
    const result = runSimulation(makeParams({
      startingBalance: 100000,
      apr: 50,
      monthlyPayment: 4167,
      newMonthlyCharges: 100,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule.length).toBe(600)
  })

  it('last row has a positive ending balance when cap is hit', () => {
    const result = runSimulation(makeParams({
      startingBalance: 100000,
      apr: 50,
      monthlyPayment: 4167,
      newMonthlyCharges: 100,
    }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[result.schedule.length - 1].endingBalance).toBeGreaterThan(0)
  })
})
