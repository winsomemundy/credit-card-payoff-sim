import type { SimulationResult } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { result: SimulationResult }

export function MetricStrip({ result }: Props) {
  const cap = result.hitSafetyCap
  const stats = [
    { label: 'Total paid', value: formatCurrency(result.totalAmountPaid) },
    { label: 'Interest paid', value: formatCurrency(result.totalInterestPaid) },
    { label: 'Payoff date', value: formatDate(result.effectivePayoffDate) },
  ]
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: cap ? '0.5rem' : '1.5rem' }}>
        <div style={{ background: '#EEEDFE', padding: '1rem', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#534AB7', marginBottom: 4 }}>Time to payoff</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#26215C' }}>
            {result.totalMonths} months{cap && <sup style={{ fontSize: 10 }}>1</sup>}
          </div>
        </div>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#EEEDFE', padding: '1rem', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: '#534AB7', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#26215C' }}>{s.value}</div>
          </div>
        ))}
      </div>
      {cap && (
        <p style={{ fontSize: 13, color: '#5F5E5A', margin: '0 0 1.5rem' }}>
          <sup>1</sup> Simulation cap reached (50 years). Increase your monthly payment to see a full payoff date.
        </p>
      )}
    </>
  )
}
