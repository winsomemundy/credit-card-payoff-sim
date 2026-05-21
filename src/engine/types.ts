export type PayoffMode = 'fixed_payment' | 'fixed_months'

export type MilestoneFlag = '25%' | '50%' | '75%' | '100%' | null

export interface SimulationParams {
  startingBalance: number          // positive USD
  apr: number                      // 0–50
  startDate: Date                  // defaults to today if omitted by caller
  dueDayOfMonth: number            // 1–31
  mode: PayoffMode
  monthlyPayment?: number          // required when mode === 'fixed_payment'
  numberOfMonths?: number          // required when mode === 'fixed_months'
  newMonthlyCharges: number        // defaults to 0
}

export interface ScheduleRow {
  paymentNumber: number
  paymentDate: Date
  startingBalance: number          // balance before interest accrues
  interestAccrued: number
  paymentAmount: number
  principalPaid: number
  endingBalance: number
  milestone: MilestoneFlag
}

export interface MilestoneDate {
  date: Date
  joint?: MilestoneFlag            // set if this milestone was skipped and backfilled
}

export interface SimulationResult {
  schedule: ScheduleRow[]
  totalMonths: number
  totalAmountPaid: number
  totalInterestPaid: number
  effectivePayoffDate: Date
  milestones: {
    '25%': MilestoneDate
    '50%': MilestoneDate
    '75%': MilestoneDate
    '100%': MilestoneDate
  }
  interestSaved?: number
  monthsSaved?: number
  baselineHitSafetyCap?: boolean   // true when baseline capped at 600 months
  lowPaymentWarning?: boolean      // true when fixed_months derives payment < $25
  newChargesNote?: boolean         // true when newMonthlyCharges > 0
}

export interface ValidationError {
  type: 'payment_too_low'
  minViablePayment: number         // first_month_interest + $0.01, rounded up
}

export type SimulationOutput = SimulationResult | ValidationError

export function isValidationError(v: SimulationOutput): v is ValidationError {
  return (v as ValidationError).type === 'payment_too_low'
}
