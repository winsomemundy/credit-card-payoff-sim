// src/components/MinPaymentExplainer.tsx
import { useState } from 'react'
import type { SimulationResult } from '../engine/types'
import { formatCurrency } from '../utils/format'

interface Props {
  result: SimulationResult
}

export function MinPaymentExplainer({ result }: Props) {
  const [open, setOpen] = useState(false)

  const row = result.schedule[0]
  const onePercent = Math.round(row.startingBalance * 0.01 * 100) / 100
  const minPayment = Math.max(25, Math.round((onePercent + row.interestAccrued) * 100) / 100)

  return (
    <div className="wm-explainer">
      {/* Toggle link */}
      <button
        className="wm-explainer__toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        How is the minimum payment calculated? {open ? '▴' : '▾'}
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="wm-explainer__panel">
          {/* Left: formula */}
          <div>
            <div className="wm-explainer__label topic">Formula</div>
            <div className="wm-explainer__text">
              Each month, the minimum is the <em>greater</em> of:
            </div>
            <div className="wm-formula">
              $25 floor<br />
              <span className="wm-formula__or">— or —</span><br />
              1% × balance<br />
              + monthly interest
            </div>
            <div className="wm-explainer__note">
              Standard practice used by major US credit card issuers.
            </div>
          </div>

          {/* Right: live numbers */}
          <div>
            <div className="wm-explainer__label topic">Your first payment</div>
            <div className="wm-explainer__text wm-muted">
              Based on your {formatCurrency(row.startingBalance)} opening balance
            </div>
            <div className="wm-calc">
              <div className="wm-calc__row">
                <span>1% × {formatCurrency(row.startingBalance)}</span>
                <span>{formatCurrency(onePercent)}</span>
              </div>
              <div className="wm-calc__row">
                <span>+ interest</span>
                <span>{formatCurrency(row.interestAccrued)}</span>
              </div>
              <div className="wm-calc__row wm-calc__total">
                <span>Min payment</span>
                <span>{formatCurrency(minPayment)}</span>
              </div>
            </div>
            <div className="wm-explainer__note">
              Decreases each month as your balance falls.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
