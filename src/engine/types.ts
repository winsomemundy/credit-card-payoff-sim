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
  date?: Date                      // undefined when the milestone is not reached within the safety cap
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
  hitSafetyCap?: boolean           // true when user's own schedule hit the 600-month limit
  lowPaymentWarning?: boolean      // true when fixed_months derives payment < $25
  mode?: PayoffMode                // the plan type the result was built from
  monthlyPayment?: number          // the regular monthly payment used for the plan
  targetMonths?: number            // fixed_months only: the requested number of months
  minimumPayment?: number          // first-month issuer minimum: max($25, 1% of balance + interest)
  belowMinimumPayment?: boolean    // true when monthlyPayment < minimumPayment
  extraInterest?: number           // set when the plan costs more interest than paying the minimum
  extraMonths?: number             // months longer than paying the minimum (with extraInterest)
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
