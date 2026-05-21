import type {
  SimulationParams, SimulationResult, SimulationOutput,
  ScheduleRow, MilestoneFlag, MilestoneDate,
} from './types'
import { validateParams } from './validation'
import { deriveMonthlyPayment } from './amortization'
import { firstPaymentDate, nextPaymentDate } from './dates'

export const SAFETY_CAP = 600

function roundHalfUp(value: number): number {
  return Math.round(value * 100) / 100
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
    const minPayment = Math.max(25, roundHalfUp(balanceAfter * 0.02))
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

  const totalAmountPaid = schedule.reduce((s, r) => s + r.paymentAmount, 0)
  const effectivePayoffDate = schedule[schedule.length - 1].paymentDate

  const baseline = runBaselineSimulation(params)
  const interestSaved = roundHalfUp(baseline.totalInterest - totalInterestPaid)
  const monthsSaved = baseline.totalMonths - schedule.length

  const milestones = {
    '25%': { date: ms.date25!, joint: ms.joint25 } as MilestoneDate,
    '50%': { date: ms.date50!, joint: ms.joint50 } as MilestoneDate,
    '75%': { date: ms.date75! } as MilestoneDate,
    '100%': { date: ms.date100! } as MilestoneDate,
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
    lowPaymentWarning,
    newChargesNote: params.newMonthlyCharges > 0,
  }
}
