import type { SimulationResult } from '../engine/types'
import { formatCurrency } from '../utils/format'

interface Props { result: SimulationResult }

export function InterestSavedCallout({ result }: Props) {
  if (result.extraInterest) return <ExtraCostCallout result={result} />
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

// Shown when the plan pays less than the minimum each month and so costs more
function ExtraCostCallout({ result }: Props) {
  const extra = formatCurrency(result.extraInterest!)
  const months = result.extraMonths ?? 0
  const capped = result.hitSafetyCap

  return (
    <div className="cc-callout">
      <p className="wm-eyebrow eyebrow">Compared to paying the minimum</p>
      <div className="cc-callout__text">
        This plan costs{' '}
        <strong>{extra}{capped ? '+' : ''} more in interest</strong>
        {capped ? (
          <> and is not paid off within 50 years</>
        ) : months > 0 ? (
          <>{' '}and takes <strong>{months} months longer</strong></>
        ) : null}
        {' '}than paying the minimum each month.
      </div>
    </div>
  )
}
