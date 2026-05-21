import type { SimulationResult } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { result: SimulationResult }

export function MetricStrip({ result }: Props) {
  const stats = [
    { label: 'Time to payoff', value: `${result.totalMonths} months` },
    { label: 'Total paid', value: formatCurrency(result.totalAmountPaid) },
    { label: 'Interest paid', value: formatCurrency(result.totalInterestPaid) },
    { label: 'Payoff date', value: formatDate(result.effectivePayoffDate) },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: '#EEEDFE', padding: '1rem', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#534AB7', marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#26215C' }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
