import { useState } from 'react'
import type { SimulationParams, PayoffMode } from '../engine/types'

interface Props {
  onSubmit: (params: SimulationParams) => void
}

export function InputCard({ onSubmit }: Props) {
  const today = new Date()
  const [balance, setBalance] = useState('5000')
  const [apr, setApr] = useState('18')
  const [dueDay, setDueDay] = useState('15')
  const [mode, setMode] = useState<PayoffMode>('fixed_payment')
  const [payment, setPayment] = useState('150')
  const [months, setMonths] = useState('36')
  const [newCharges, setNewCharges] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params: SimulationParams = {
      startingBalance: parseFloat(balance),
      apr: parseFloat(apr),
      startDate: today,
      dueDayOfMonth: parseInt(dueDay, 10),
      mode,
      monthlyPayment: mode === 'fixed_payment' ? parseFloat(payment) : undefined,
      numberOfMonths: mode === 'fixed_months' ? parseInt(months, 10) : undefined,
      newMonthlyCharges: parseFloat(newCharges || '0'),
    }
    onSubmit(params)
  }

  return (
    <form onSubmit={handleSubmit} className="wm-card">
      <h2 className="wm-card__title heading-sm">Your debt</h2>
      <div className="cc-fields">
        <div>
          <label className="cc-label" htmlFor="cc-balance">Current balance</label>
          <input
            id="cc-balance" className="cc-input" type="number" min="0.01" step="0.01" value={balance}
            onChange={e => setBalance(e.target.value)} required
          />
        </div>
        <div>
          <label className="cc-label" htmlFor="cc-apr">Annual interest rate (%)</label>
          <input
            id="cc-apr" className="cc-input" type="number" min="0" max="50" step="0.01" value={apr}
            onChange={e => setApr(e.target.value)} required
          />
        </div>
        <div>
          <label className="cc-label" htmlFor="cc-due-day">Payment due day</label>
          <input
            id="cc-due-day" className="cc-input" type="number" min="1" max="31" value={dueDay}
            onChange={e => setDueDay(e.target.value)} required
          />
        </div>
      </div>

      <h2 className="wm-card__title heading-sm">Payoff plan</h2>
      <div className="cc-modes">
        {(['fixed_payment', 'fixed_months'] as PayoffMode[]).map(m => (
          <button
            key={m} type="button" onClick={() => setMode(m)}
            className="cc-mode" aria-pressed={mode === m}
          >
            {m === 'fixed_payment' ? 'Fixed monthly payment' : 'Target number of months'}
          </button>
        ))}
      </div>

      <div className="cc-fields cc-fields--2">
        {mode === 'fixed_payment' ? (
          <div>
            <label className="cc-label" htmlFor="cc-payment">Monthly payment ($)</label>
            <input
              id="cc-payment" className="cc-input" type="number" min="0.01" step="0.01" value={payment}
              onChange={e => setPayment(e.target.value)} required
            />
          </div>
        ) : (
          <div>
            <label className="cc-label" htmlFor="cc-months">Number of months (up to 600)</label>
            <input
              id="cc-months" className="cc-input" type="number" min="1" max="600" step="1" value={months}
              onChange={e => setMonths(e.target.value)} required
            />
          </div>
        )}
        <div>
          <label className="cc-label" htmlFor="cc-new-charges">Assumed new monthly charges (optional)</label>
          <input
            id="cc-new-charges" className="cc-input" type="number" min="0" step="0.01"
            placeholder="$0.00" value={newCharges}
            onChange={e => setNewCharges(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="wm-btn button cc-submit">
        Calculate
      </button>
    </form>
  )
}
