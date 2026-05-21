export function daysInMonth(year: number, month: number): number {
  // month is 0-indexed. Day 0 of next month = last day of current month.
  return new Date(year, month + 1, 0).getDate()
}

export function adjustForShortMonth(year: number, month: number, dueDay: number): Date {
  const lastDay = daysInMonth(year, month)
  return new Date(year, month, Math.min(dueDay, lastDay))
}

export function nextPaymentDate(currentPaymentDate: Date, dueDayOfMonth: number): Date {
  const year = currentPaymentDate.getFullYear()
  const month = currentPaymentDate.getMonth()
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  return adjustForShortMonth(nextYear, nextMonth, dueDayOfMonth)
}

export function firstPaymentDate(startDate: Date, dueDayOfMonth: number): Date {
  const year = startDate.getFullYear()
  const month = startDate.getMonth()
  const day = startDate.getDate()
  if (day <= dueDayOfMonth) {
    return adjustForShortMonth(year, month, dueDayOfMonth)
  }
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  return adjustForShortMonth(nextYear, nextMonth, dueDayOfMonth)
}
