import { useState } from 'react'
import { runSimulation, isValidationError } from './engine'
import type { SimulationParams, SimulationResult, ValidationError } from './engine/types'
import { InputCard } from './components/InputCard'
import { MetricStrip } from './components/MetricStrip'
import { InterestSavedCallout } from './components/InterestSavedCallout'
import { MinPaymentExplainer } from './components/MinPaymentExplainer'
import { PayoffChart } from './components/PayoffChart'
import { ScheduleTable } from './components/ScheduleTable'
import { SummaryBlock } from './components/SummaryBlock'

export default function App() {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<ValidationError | null>(null)

  function handleSubmit(params: SimulationParams) {
    const output = runSimulation(params)
    if (isValidationError(output)) {
      setError(output)
      setResult(null)
    } else {
      setError(null)
      setResult(output)
    }
  }

  return (
    <div className="wm-surface">
      <nav className="wm-nav" aria-label="Site">
        <div className="wm-wrap wm-nav__inner">
          <a className="wm-nav__brand brand" href="https://winsomemundy.com/">Winsome <span>Mundy</span></a>
          <a className="wm-nav__link" href="https://winsomemundy.com/#tools">Student tools</a>
        </div>
      </nav>

      <main className="wm-wrap" style={{ paddingBlock: '48px 0' }}>
        {/* Header */}
        <header style={{ marginBottom: 32 }}>
          <p className="wm-eyebrow eyebrow">Personal finance · Amortization</p>
          <h1 className="wm-heading heading-lg">Credit Card Payoff Simulator</h1>
          <p className="wm-muted" style={{ margin: '10px 0 0' }}>
            See your full path to a zero balance.
          </p>
        </header>

        {/* Input form */}
        <InputCard onSubmit={handleSubmit} />

        {/* Validation error */}
        {error && (
          <div className="wm-notice wm-notice--alert" role="alert">
            Payment too low — balance would grow indefinitely. Minimum to make progress:{' '}
            <strong>${error.minViablePayment.toFixed(2)}</strong>.
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Low payment warning (fixed_months mode) */}
            {result.lowPaymentWarning && (
              <div className="wm-notice">
                Note: the derived monthly payment is less than $25. The schedule is shown below,
                but consider increasing your payment target.
              </div>
            )}

            <InterestSavedCallout result={result} />
            <MinPaymentExplainer result={result} />
            <MetricStrip result={result} />
            <PayoffChart result={result} />
            <SummaryBlock result={result} />
            <ScheduleTable rows={result.schedule} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="cc-footer caption">
        <div className="wm-wrap">
          A free student tool by{' '}
          <a href="https://winsomemundy.com/#tools">Winsome Mundy</a>
          . More tools at winsomemundy.com.
        </div>
      </footer>
    </div>
  )
}
