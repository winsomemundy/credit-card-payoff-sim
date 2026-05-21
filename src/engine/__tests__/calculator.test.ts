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
