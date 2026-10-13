import type { SimulationResult } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { result: SimulationResult }

export function MetricStrip({ result }: Props) {
  const cap = result.hitSafetyCap
  const stats = [
    { label: 'Total paid', value: formatCurrency(result.totalAmountPaid) },
    { label: 'Interest paid', value: formatCurrency(result.totalInterestPaid) },
    // A capped schedule never reaches $0, so it has no payoff date
    { label: 'Payoff date', value: cap ? 'Not within 50 years' : formatDate(result.effectivePayoffDate) },
  ]
  return (
    <>
      <div className="wm-impact" style={{ marginBottom: cap ? 8 : 24 }}>
        <div className="wm-impact__cell">
          <span className="wm-impact__label topic">Time to payoff</span>
          <span className="wm-impact__value">
            {result.totalMonths} months{cap && <sup style={{ fontSize: 10 }}>1</sup>}
          </span>
        </div>
        {stats.map(s => (
          <div key={s.label} className="wm-impact__cell">
            <span className="wm-impact__label topic">{s.label}</span>
            <span className="wm-impact__value">{s.value}</span>
          </div>
        ))}
      </div>
      {cap && (
        <p className="wm-footnote" style={{ margin: '0 0 24px' }}>
          <sup>1</sup> Simulation cap reached (50 years).{' '}
          {result.mode === 'fixed_months'
            ? 'Choose a shorter target (600 months at most) to see a full payoff date.'
            : 'Increase your monthly payment to see a full payoff date.'}{' '}
          Totals cover the first 50 years only.
        </p>
      )}
    </>
  )
}
