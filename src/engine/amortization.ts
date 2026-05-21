export interface AmortizationResult {
  payment: number
  lowPaymentWarning: boolean
}

export function deriveMonthlyPayment(
  startingBalance: number,
  monthlyRate: number,
  numMonths: number,
  newMonthlyCharges: number,
): AmortizationResult {
  let payment: number

  if (monthlyRate === 0) {
    payment = startingBalance / numMonths + newMonthlyCharges
  } else {
    const factor =
      (monthlyRate * Math.pow(1 + monthlyRate, numMonths)) /
      (Math.pow(1 + monthlyRate, numMonths) - 1)
    payment = startingBalance * factor + newMonthlyCharges
  }

  // Round UP to nearest cent to prevent per-cycle interest rounding from
  // accumulating drift that would add an extra month in fixed_months mode.
  const ceiledPayment = Math.ceil(payment * 100) / 100

  return {
    payment: ceiledPayment,
    lowPaymentWarning: payment < 25,
  }
}
