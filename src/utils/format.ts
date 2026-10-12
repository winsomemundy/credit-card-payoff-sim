export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

// A milestone the schedule never reached has no date. Intl would format a
// missing date as today, so say so in words instead.
export function formatMilestoneDate(date: Date | undefined): string {
  return date ? formatDate(date) : 'not reached within 50 years'
}
