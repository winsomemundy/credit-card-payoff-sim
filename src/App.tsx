import { useState } from 'react'
import { runSimulation, isValidationError } from './engine'
import type { SimulationParams, SimulationResult, ValidationError } from './engine/types'
import { InputCard } from './components/InputCard'
import { MetricStrip } from './components/MetricStrip'
import { InterestSavedCallout } from './components/InterestSavedCallout'
import { MinPaymentExplainer } from './components/MinPaymentExplainer'
import { PayoffChart } from './components/PayoffChart'
import { ScheduleTable } from './components/ScheduleTable'
import { formatCurrency, formatDate } from './utils/format'

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
    <div className="wm-surface wm-tool-page">
      <nav className="wm-nav" aria-label="Site">
        <div className="wm-wrap wm-wrap--tool wm-nav__inner">
          <a className="wm-nav__brand brand" href="https://winsomemundy.com/">Winsome <span>Mundy</span></a>
          <a className="wm-nav__link" href="https://winsomemundy.com/#tools">Student tools</a>
        </div>
      </nav>

      <main className="wm-wrap wm-wrap--tool wm-tool-page__main">
        {/* Header */}
        <header className="wm-tool-header">
          <p className="wm-eyebrow eyebrow">Personal finance · Amortization</p>
          <h1 className="wm-heading heading-lg">Credit Card Payoff Simulator</h1>
          <p className="wm-tool-header__desc">
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

        {/* Announces each new result to screen readers; it stays mounted so changes are heard */}
        <p className="sr-only" role="status">{result ? resultSummary(result) : ''}</p>

        {/* Results */}
        {result && (
          <>
            {/* Cautions about the plan, gathered into one notice */}
            {planNotes(result).length > 0 && (
              <div className="wm-notice">
                Note: {planNotes(result).join(' ')}
              </div>
            )}

            <InterestSavedCallout result={result} />
            <MinPaymentExplainer result={result} />
            <MetricStrip result={result} />
            <PayoffChart result={result} />
            <ScheduleTable rows={result.schedule} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="wm-tool-footer caption">
        <div className="wm-wrap wm-wrap--tool">
          A free student tool by{' '}
          <a href="https://winsomemundy.com/#tools">Winsome Mundy</a>
          . More tools at winsomemundy.com.
        </div>
      </footer>
    </div>
  )
}

function resultSummary(result: SimulationResult): string {
  const interest = `Total interest ${formatCurrency(result.totalInterestPaid)}.`
  if (result.hitSafetyCap) return `Results ready. The balance is not paid off within 50 years. ${interest}`
  return `Results ready. Paid off in ${result.totalMonths} months, by ${formatDate(result.effectivePayoffDate)}. ${interest}`
}

function planNotes(result: SimulationResult): string[] {
  const notes: string[] = []
  if (result.lowPaymentWarning) {
    notes.push('the derived monthly payment is less than $25. The schedule is shown below, but consider increasing your payment target.')
  }
  if (result.belowMinimumPayment && result.monthlyPayment !== undefined && result.minimumPayment !== undefined) {
    notes.push(
      `${notes.length ? 'The' : 'the'} ${formatCurrency(result.monthlyPayment)} monthly payment is below the ` +
      `${formatCurrency(result.minimumPayment)} minimum a card issuer would likely require in the first month ` +
      '(1% of the balance plus interest), so a real card would not accept this plan.'
    )
  }
  if (result.mode === 'fixed_months' && result.targetMonths && !result.hitSafetyCap &&
      result.totalMonths < result.targetMonths) {
    notes.push(
      `${notes.length ? 'Payments' : 'payments'} are rounded to the cent, so this plan pays off in ` +
      `${result.totalMonths} months instead of the ${result.targetMonths}-month target.`
    )
  }
  return notes
}
