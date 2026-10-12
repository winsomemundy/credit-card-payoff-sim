import type { SimulationResult } from '../engine/types'
import { formatMilestoneDate } from '../utils/format'

interface Props { result: SimulationResult }

const MILESTONE_FLAGS = ['25%', '50%', '75%', '100%'] as const

export function SummaryBlock({ result }: Props) {
  return (
    <div className="wm-card">
      <h2 className="wm-card__title heading-sm">Milestone dates</h2>
      <div className="cc-milestones">
        {MILESTONE_FLAGS.map(flag => {
          const m = result.milestones[flag]
          return (
            <div key={flag} className="cc-milestone">
              <span className={flag === '100%' ? 'cc-diamond cc-diamond--payoff' : 'cc-diamond'} />
              <span>
                <strong>{flag} reached:</strong>{' '}
                {formatMilestoneDate(m.date)}
                {m.joint && (
                  <span className="wm-muted" style={{ fontSize: '0.85rem' }}>
                    {' '}(reached together with {m.joint})
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      {result.newChargesNote && (
        <p className="cc-footnote">
          * New monthly charges extend the payoff date beyond the milestone dates shown above.
        </p>
      )}
    </div>
  )
}
