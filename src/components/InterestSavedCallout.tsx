import type { SimulationResult } from '../engine/types'
import { formatCurrency } from '../utils/format'

interface Props { result: SimulationResult }

export function InterestSavedCallout({ result }: Props) {
  if (!result.interestSaved) return null

  const cap = result.baselineHitSafetyCap
  const saved = formatCurrency(result.interestSaved)
  const months = result.monthsSaved ?? 0

  return (
    <div className="cc-callout">
      <p className="wm-eyebrow eyebrow">Compared to paying the minimum</p>
      {cap ? (
        <div className="cc-callout__text">
          Under minimum payments, your ongoing charges would cause your balance to{' '}
          <strong>grow indefinitely</strong> — you'd never pay it off.
          Your plan saves{' '}
          <strong>{saved}+ in interest</strong>.
        </div>
      ) : (
        <div className="cc-callout__text">
          You'll save{' '}
          <strong>{saved} in interest</strong>{' '}
          and finish{' '}
          <strong>{months} months sooner</strong>.
        </div>
      )}
    </div>
  )
}
