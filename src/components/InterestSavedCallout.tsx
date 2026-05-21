import type { SimulationResult } from '../engine/types'
import { formatCurrency } from '../utils/format'

interface Props { result: SimulationResult }

export function InterestSavedCallout({ result }: Props) {
  if (!result.interestSaved) return null

  const cap = result.baselineHitSafetyCap
  const saved = formatCurrency(result.interestSaved)
  const months = result.monthsSaved ?? 0

  return (
    <div style={{
      background: '#E1F5EE', borderRadius: 12, padding: '1rem 1.25rem',
      marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: '#1D9E75',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: 'white', fontSize: 22,
      }}>↘</div>
      <div>
        <div style={{ fontSize: 13, color: '#0F6E56', marginBottom: 2 }}>
          Compared to paying the minimum
        </div>
        <div style={{ fontSize: 16, color: '#04342C' }}>
          You'll save{' '}
          <strong style={{ fontWeight: 500 }}>
            {saved}{cap ? '+' : ''} in interest
          </strong>{' '}
          and finish{' '}
          <strong style={{ fontWeight: 500 }}>
            {months}{cap ? '+' : ''} months sooner
          </strong>.
        </div>
      </div>
    </div>
  )
}
