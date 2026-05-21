import type { SimulationParams, ValidationError } from './types'

export function validateParams(params: SimulationParams): ValidationError | null {
  if (params.mode !== 'fixed_payment') return null
  if (params.apr === 0) return null

  const monthlyRate = params.apr / 100 / 12
  const firstMonthInterest = Math.round(params.startingBalance * monthlyRate * 100) / 100
  const payment = params.monthlyPayment ?? 0

  if (payment <= firstMonthInterest) {
    return {
      type: 'payment_too_low',
      minViablePayment: Math.round((firstMonthInterest + 0.01) * 100) / 100,
    }
  }
  return null
}
