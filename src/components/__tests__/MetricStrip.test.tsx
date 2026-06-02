import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { SimulationResult } from '../../engine/types'
import { MetricStrip } from '../MetricStrip'

function makeResult(totalMonths: number, hitSafetyCap?: boolean): SimulationResult {
  return {
    schedule: [],
    totalMonths,
    totalAmountPaid: 7028,
    totalInterestPaid: 2028,
    effectivePayoffDate: new Date(2030, 3, 15),
    milestones: {
      '25%': { date: new Date() },
      '50%': { date: new Date() },
      '75%': { date: new Date() },
      '100%': { date: new Date() },
    },
    hitSafetyCap,
  }
}

describe('MetricStrip', () => {
  it('renders the month count normally when hitSafetyCap is falsy', () => {
    render(<MetricStrip result={makeResult(47)} />)
    expect(screen.getByText('47 months')).toBeInTheDocument()
  })

  it('does not render the footnote when hitSafetyCap is falsy', () => {
    render(<MetricStrip result={makeResult(47)} />)
    expect(screen.queryByText(/simulation cap reached/i)).not.toBeInTheDocument()
  })

  it('renders the footnote text when hitSafetyCap is true', () => {
    render(<MetricStrip result={makeResult(600, true)} />)
    expect(
      screen.getByText(/simulation cap reached \(50 years\)\. increase your monthly payment/i)
    ).toBeInTheDocument()
  })

  it('renders a superscript element when hitSafetyCap is true', () => {
    const { container } = render(<MetricStrip result={makeResult(600, true)} />)
    expect(container.querySelectorAll('sup').length).toBeGreaterThan(0)
  })

  it('does not render the footnote when hitSafetyCap is false (explicit false)', () => {
    render(<MetricStrip result={makeResult(47, false)} />)
    expect(screen.queryByText(/simulation cap reached/i)).not.toBeInTheDocument()
  })
})
