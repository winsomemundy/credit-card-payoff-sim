import type {
  SimulationParams, SimulationOutput,
  ScheduleRow, MilestoneFlag, MilestoneDate,
} from './types'
import { validateParams } from './validation'
import { deriveMonthlyPayment } from './amortization'
import { firstPaymentDate, nextPaymentDate } from './dates'

export const SAFETY_CAP = 600
export const MIN_PAYMENT_FLOOR = 25     // minimum payment floor ($)
export const MIN_PAYMENT_RATE = 0.01    // 1% principal component of minimum payment (+ full interest)

function roundHalfUp(value: number): number {
  return Math.round(value * 100) / 100
}

// Months the schedule loop below needs to reach $0 at a fixed payment, using the
// same per-month rounding. Returns Infinity when the balance is not cleared within `limit`.
function monthsToPayoff(
  startingBalance: number, monthlyRate: number, newMonthlyCharges: number,
  payment: number, limit: number,
): number {
  let balance = startingBalance
  for (let n = 1; n <= limit; n++) {
    const balanceAfterInterest = balance + roundHalfUp(balance * monthlyRate) + newMonthlyCharges
    const actualPayment = Math.min(balanceAfterInterest, payment)
    balance = balanceAfterInterest - actualPayment
    if (balance <= 0.005) return n
  }
  return Infinity
}

interface MilestoneState {
  threshold25: number
  threshold50: number
  threshold75: number
  hit25: boolean; hit50: boolean; hit75: boolean; hit100: boolean
  date25?: Date; date50?: Date; date75?: Date; date100?: Date
  joint25?: MilestoneFlag; joint50?: MilestoneFlag
}

function checkMilestone(
  cumulativePrincipal: number,
  isLastRow: boolean,
  paymentDate: Date,
  state: MilestoneState,
): MilestoneFlag {
  if (!state.hit100 && isLastRow) {
    state.hit100 = true
    state.date100 = paymentDate
    // Backfill any un-hit lower milestones so their dates are never undefined
    if (!state.hit75) { state.hit75 = true; state.date75 = paymentDate; }
    if (!state.hit50) { state.hit50 = true; state.date50 = paymentDate; state.joint50 = state.joint50 ?? '100%' }
    if (!state.hit25) { state.hit25 = true; state.date25 = paymentDate; state.joint25 = state.joint25 ?? '100%' }
    return '100%'
  }
  if (!state.hit75 && cumulativePrincipal >= state.threshold75) {
    state.hit75 = true; state.date75 = paymentDate
    if (!state.hit50) { state.hit50 = true; state.date50 = paymentDate; state.joint50 = '75%' }
    if (!state.hit25) { state.hit25 = true; state.date25 = paymentDate; state.joint25 = '75%' }
    return '75%'
  }
  if (!state.hit50 && cumulativePrincipal >= state.threshold50) {
    state.hit50 = true; state.date50 = paymentDate
    if (!state.hit25) { state.hit25 = true; state.date25 = paymentDate; state.joint25 = '50%' }
    return '50%'
  }
  if (!state.hit25 && cumulativePrincipal >= state.threshold25) {
    state.hit25 = true; state.date25 = paymentDate
    return '25%'
  }
  return null
}

function runBaselineSimulation(params: SimulationParams): {
  totalInterest: number; totalMonths: number; hitCap: boolean
} {
  const monthlyRate = params.apr / 100 / 12
  let balance = params.startingBalance
  let totalInterest = 0
  let month = 0

  while (balance > 0 && month < SAFETY_CAP) {
    month++
    const interest = roundHalfUp(balance * monthlyRate)
    const balanceAfter = balance + interest + params.newMonthlyCharges
    // Standard minimum payment: 1% of current principal + full month's interest
    // (this is how major US credit card issuers compute it)
    const minPayment = Math.max(MIN_PAYMENT_FLOOR, roundHalfUp(balance * MIN_PAYMENT_RATE + interest))
    const actualPayment = Math.min(minPayment, balanceAfter)
    totalInterest += Math.min(actualPayment, interest)
    balance = balanceAfter - actualPayment
    if (balance <= 0.005) { balance = 0; break }
  }

  return { totalInterest, totalMonths: month, hitCap: month >= SAFETY_CAP }
}

export function runSimulation(params: SimulationParams): SimulationOutput {
  const validationError = validateParams(params)
  if (validationError) return validationError

  const monthlyRate = params.apr / 100 / 12
  let monthlyPayment: number
  let lowPaymentWarning = false

  if (params.mode === 'fixed_payment') {
    monthlyPayment = params.monthlyPayment!
  } else {
    const derived = deriveMonthlyPayment(
      params.startingBalance, monthlyRate, params.numberOfMonths!, params.newMonthlyCharges
    )
    monthlyPayment = derived.payment
    lowPaymentWarning = derived.lowPaymentWarning

    // The amortization formula ignores per-month cent rounding. On long, nearly
    // interest-only plans that rounding compounds and leaves a balance after the
    // target month, so raise the payment a cent at a time until the schedule
    // really clears within the target.
    const limit = Math.min(params.numberOfMonths!, SAFETY_CAP)
    for (let i = 0; i < 100000 && monthsToPayoff(
      params.startingBalance, monthlyRate, params.newMonthlyCharges, monthlyPayment, limit,
    ) === Infinity; i++) {
      monthlyPayment = roundHalfUp(monthlyPayment + 0.01)
    }
  }

  const schedule: ScheduleRow[] = []
  let balance = params.startingBalance
  let paymentDate = firstPaymentDate(params.startDate, params.dueDayOfMonth)
  let cumulativePrincipal = 0
  let totalInterestPaid = 0

  const ms: MilestoneState = {
    threshold25: params.startingBalance * 0.25,
    threshold50: params.startingBalance * 0.50,
    threshold75: params.startingBalance * 0.75,
    hit25: false, hit50: false, hit75: false, hit100: false,
  }

  for (let n = 1; n <= SAFETY_CAP; n++) {
    const rowStartingBalance = balance
    const interest = roundHalfUp(balance * monthlyRate)
    const balanceAfterInterest = balance + interest + params.newMonthlyCharges
    const actualPayment = balanceAfterInterest <= monthlyPayment
      ? balanceAfterInterest
      : monthlyPayment
    const interestPortion = Math.min(actualPayment, interest)
    const principalPaid = actualPayment - interestPortion

    cumulativePrincipal += principalPaid
    totalInterestPaid += interestPortion
    const rawEndingBalance = balanceAfterInterest - actualPayment
    const isLast = rawEndingBalance <= 0.005
    const endingBalance = isLast ? 0 : rawEndingBalance

    const milestone = checkMilestone(cumulativePrincipal, isLast, paymentDate, ms)

    schedule.push({
      paymentNumber: n,
      paymentDate,
      startingBalance: roundHalfUp(rowStartingBalance),
      interestAccrued: interest,
      paymentAmount: roundHalfUp(actualPayment),
      principalPaid: roundHalfUp(principalPaid),
      endingBalance: roundHalfUp(endingBalance),
      milestone,
    })

    if (isLast) break
    balance = rawEndingBalance
    paymentDate = nextPaymentDate(paymentDate, params.dueDayOfMonth)
  }

  const hitSafetyCap =
    schedule.length === SAFETY_CAP &&
    schedule[schedule.length - 1].endingBalance > 0

  const totalAmountPaid = schedule.reduce((s, r) => s + r.paymentAmount, 0)
  const effectivePayoffDate = schedule[schedule.length - 1].paymentDate

  const baseline = runBaselineSimulation(params)
  const interestSaved = roundHalfUp(baseline.totalInterest - totalInterestPaid)
  const monthsSaved = baseline.totalMonths - schedule.length
  // A plan that pays less than the issuer minimum costs more than the baseline
  const extraInterest = baseline.hitCap ? 0 : roundHalfUp(totalInterestPaid - baseline.totalInterest)

  // What a card issuer would require in the first month (same rule as the baseline)
  const firstMonthInterest = roundHalfUp(params.startingBalance * monthlyRate)
  const minimumPayment = Math.max(
    MIN_PAYMENT_FLOOR,
    roundHalfUp(params.startingBalance * MIN_PAYMENT_RATE + firstMonthInterest),
  )
  // A balance smaller than the minimum is simply paid in full
  const belowMinimumPayment =
    monthlyPayment < minimumPayment && monthlyPayment < params.startingBalance + firstMonthInterest

  // Milestones the schedule never reached (the safety cap hit first) stay undefined
  const milestones = {
    '25%': { date: ms.date25, joint: ms.joint25 } as MilestoneDate,
    '50%': { date: ms.date50, joint: ms.joint50 } as MilestoneDate,
    '75%': { date: ms.date75 } as MilestoneDate,
    '100%': { date: ms.date100 } as MilestoneDate,
  }

  return {
    schedule,
    totalMonths: schedule.length,
    totalAmountPaid: roundHalfUp(totalAmountPaid),
    totalInterestPaid: roundHalfUp(totalInterestPaid),
    effectivePayoffDate,
    milestones,
    interestSaved: interestSaved > 0 ? interestSaved : undefined,
    monthsSaved: interestSaved > 0 ? monthsSaved : undefined,
    baselineHitSafetyCap: baseline.hitCap,
    hitSafetyCap: hitSafetyCap || undefined,
    lowPaymentWarning,
    newChargesNote: params.newMonthlyCharges > 0,
    mode: params.mode,
    monthlyPayment,
    targetMonths: params.mode === 'fixed_months' ? params.numberOfMonths : undefined,
    minimumPayment,
    belowMinimumPayment,
    extraInterest: extraInterest > 0 ? extraInterest : undefined,
    extraMonths: extraInterest > 0 ? schedule.length - baseline.totalMonths : undefined,
  }
}
