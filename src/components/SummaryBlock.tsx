import type { SimulationResult } from '../engine/types'
import { formatDate } from '../utils/format'

interface Props { result: SimulationResult }

const MILESTONE_FLAGS = ['25%', '50%', '75%', '100%'] as const

export function SummaryBlock({ result }: Props) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.15)', padding: '1.25rem', marginBottom: '1.5rem',
    }}>
      <h4 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px', color: '#2C2C2A' }}>
        Milestone dates
      </h4>
      {MILESTONE_FLAGS.map(flag => {
        const m = result.milestones[flag]
        const color = flag === '100%' ? '#0F6E56' : '#1D9E75'
        return (
          <div key={flag} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: color, display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 14, color: '#2C2C2A' }}>
              <strong style={{ fontWeight: 500 }}>{flag} reached:</strong>{' '}
              {formatDate(m.date)}
              {m.joint && (
                <span style={{ fontSize: 12, color: '#5F5E5A' }}>
                  {' '}(reached together with {m.joint})
                </span>
              )}
            </span>
          </div>
        )
      })}
      {result.newChargesNote && (
        <p style={{ fontSize: 13, color: '#5F5E5A', marginTop: 8, marginBottom: 0 }}>
          * New monthly charges extend the payoff date beyond the milestone dates shown above.
        </p>
      )}
    </div>
  )
}
