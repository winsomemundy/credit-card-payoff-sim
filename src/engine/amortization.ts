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

  return {
    payment,
    lowPaymentWarning: payment < 25,
  }
}
