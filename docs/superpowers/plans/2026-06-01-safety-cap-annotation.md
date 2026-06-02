# Safety Cap Annotation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user's own simulation hits the 600-month safety cap, annotate the "Time to payoff" tile in MetricStrip with a superscript footnote marker and render a plain-prose note below the strip explaining the limit.

**Architecture:** Add a `hitSafetyCap` flag to `SimulationResult` (mirroring the existing `baselineHitSafetyCap`), set it in `calculator.ts` when the loop runs all 600 iterations without the balance reaching zero, then conditionally render the superscript and footnote in `MetricStrip.tsx`.

**Tech Stack:** TypeScript, React 19, Vitest 4 + React Testing Library.

---

## File Map

| File | Change |
|---|---|
| `src/engine/types.ts` | Add `hitSafetyCap?: boolean` to `SimulationResult` |
| `src/engine/calculator.ts` | Detect cap after main loop; include flag in returned result |
| `src/engine/__tests__/calculator.test.ts` | New `describe` block for cap detection |
| `src/components/MetricStrip.tsx` | Conditionally render `<sup>1</sup>` + footnote `<p>` |
| `src/components/__tests__/MetricStrip.test.tsx` | New test file for MetricStrip annotation |

---

## Task 1: Add `hitSafetyCap` to the engine

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/calculator.ts`
- Test: `src/engine/__tests__/calculator.test.ts`

- [ ] **Step 1: Write the failing tests**

Append this `describe` block to `src/engine/__tests__/calculator.test.ts` (after all existing `describe` blocks):

```ts
describe('runSimulation — safety cap (hitSafetyCap)', () => {
  it('hitSafetyCap is falsy when schedule resolves normally', () => {
    // Standard $5k / 18% APR / $150/month resolves in 47 months
    const result = runSimulation(makeParams())
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.hitSafetyCap).toBeFalsy()
  })

  it('hitSafetyCap is true when payment barely exceeds interest', () => {
    // $5k at 18% APR: first-month interest = $75.00
    // $76/month passes validation but clears only ~$1 principal per month
    // balance will not reach zero within 600 months
    const result = runSimulation(makeParams({ monthlyPayment: 76 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.hitSafetyCap).toBe(true)
  })

  it('schedule has exactly 600 rows when cap is hit', () => {
    const result = runSimulation(makeParams({ monthlyPayment: 76 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule.length).toBe(600)
  })

  it('last row has a positive ending balance when cap is hit', () => {
    const result = runSimulation(makeParams({ monthlyPayment: 76 }))
    if (isValidationError(result)) throw new Error('unexpected error')
    expect(result.schedule[result.schedule.length - 1].endingBalance).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/engine/__tests__/calculator.test.ts
```

Expected: the four new tests fail — `result.hitSafetyCap` will be `undefined` because the field does not exist yet.

- [ ] **Step 3: Add `hitSafetyCap` to `SimulationResult`**

Open `src/engine/types.ts`. Add one line to `SimulationResult`, after `baselineHitSafetyCap`:

```ts
export interface SimulationResult {
  schedule: ScheduleRow[]
  totalMonths: number
  totalAmountPaid: number
  totalInterestPaid: number
  effectivePayoffDate: Date
  milestones: {
    '25%': MilestoneDate
    '50%': MilestoneDate
    '75%': MilestoneDate
    '100%': MilestoneDate
  }
  interestSaved?: number
  monthsSaved?: number
  baselineHitSafetyCap?: boolean
  hitSafetyCap?: boolean           // true when user's own schedule hit the 600-month limit
  lowPaymentWarning?: boolean
  newChargesNote?: boolean
}
```

- [ ] **Step 4: Detect and return the flag in `calculator.ts`**

Open `src/engine/calculator.ts`. Find the block that begins `const totalAmountPaid = ...` (after the main loop). Add the detection line immediately after the loop ends (before `totalAmountPaid`):

```ts
  const hitSafetyCap =
    schedule.length === SAFETY_CAP &&
    schedule[schedule.length - 1].endingBalance > 0

  const totalAmountPaid = schedule.reduce((s, r) => s + r.paymentAmount, 0)
```

Then add `hitSafetyCap` to the returned object. Find the existing `return { ... }` and add the new field after `baselineHitSafetyCap`:

```ts
  return {
    schedule,
    totalMonths: schedule.length,
    totalAmountPaid: roundHalfUp(totalAmountPaid),
    totalInterestPaid: roundHalfUp(totalInterestPaid),
    effectivePayoffDate,
    milestones,
    interestSaved: interestSaved > 0 ? interestSaved : undefined,
    monthsSaved: interestSaved > 0 ? monthsSaved : undefined,
    baselineHitSafetyCap: baseline.hitCap,
    hitSafetyCap: hitSafetyCap || undefined,
    lowPaymentWarning,
    newChargesNote: params.newMonthlyCharges > 0,
  }
```

- [ ] **Step 5: Run the engine tests to confirm they pass**

```bash
npx vitest run src/engine/__tests__/calculator.test.ts
```

Expected: all tests pass, including the four new cap tests.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/calculator.ts src/engine/__tests__/calculator.test.ts
git commit -m "feat: add hitSafetyCap flag to SimulationResult"
```

---

## Task 2: Annotate MetricStrip

**Files:**
- Create: `src/components/__tests__/MetricStrip.test.tsx`
- Modify: `src/components/MetricStrip.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/MetricStrip.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/__tests__/MetricStrip.test.tsx
```

Expected: the three cap-specific tests fail — no footnote, no `<sup>` element.

- [ ] **Step 3: Rewrite `MetricStrip.tsx`**

Replace the full contents of `src/components/MetricStrip.tsx` with:

```tsx
import type { SimulationResult } from '../engine/types'
import { formatCurrency, formatDate } from '../utils/format'

interface Props { result: SimulationResult }

export function MetricStrip({ result }: Props) {
  const cap = result.hitSafetyCap
  const stats = [
    { label: 'Total paid', value: formatCurrency(result.totalAmountPaid) },
    { label: 'Interest paid', value: formatCurrency(result.totalInterestPaid) },
    { label: 'Payoff date', value: formatDate(result.effectivePayoffDate) },
  ]
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: cap ? '0.5rem' : '1.5rem' }}>
        <div style={{ background: '#EEEDFE', padding: '1rem', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#534AB7', marginBottom: 4 }}>Time to payoff</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#26215C' }}>
            {result.totalMonths} months{cap && <sup style={{ fontSize: 14 }}>1</sup>}
          </div>
        </div>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#EEEDFE', padding: '1rem', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: '#534AB7', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#26215C' }}>{s.value}</div>
          </div>
        ))}
      </div>
      {cap && (
        <p style={{ fontSize: 13, color: '#5F5E5A', margin: '0 0 1.5rem' }}>
          <sup>1</sup> Simulation cap reached (50 years). Increase your monthly payment to see a full payoff date.
        </p>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run the MetricStrip tests to confirm they pass**

```bash
npx vitest run src/components/__tests__/MetricStrip.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. The suite currently has 90 tests; the new tests bring the total to 99.

- [ ] **Step 6: Commit**

```bash
git add src/components/MetricStrip.tsx src/components/__tests__/MetricStrip.test.tsx
git commit -m "feat: annotate MetricStrip with superscript footnote when simulation cap is hit"
```
