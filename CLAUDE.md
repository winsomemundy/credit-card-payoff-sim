# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page credit card payoff simulator. The spec lives at:
`/Users/chaosdisruption/Development/Testing/Credit Card Payoff Simulator/credit-card-payoff-simulator-spec.md`

Deployed via Vercel's native GitHub integration (push to `main` → production, PR → preview URL).

## Commands

```bash
npm run dev       # start dev server (http://localhost:5173)
npm test          # run full test suite (vitest, 90 tests)
npm run build     # tsc -b && vite build → dist/
npm run lint      # eslint
```

Run a single test file:
```bash
npx vitest run src/engine/__tests__/calculator.test.ts
```

## Tech Stack

React 19, TypeScript 6, Vite 8, Vitest 4 + React Testing Library, plain SVG charts (no chart library).

## Architecture

Pure frontend — all computation is client-side. Two clear layers:

**`src/engine/`** — framework-agnostic, zero DOM dependencies, fully unit-tested.

| File | Responsibility |
|---|---|
| `types.ts` | All shared interfaces and type guards (`SimulationParams`, `SimulationOutput`, `ScheduleRow`, etc.) |
| `dates.ts` | `firstPaymentDate`, `nextPaymentDate`, short-month adjustment |
| `validation.ts` | `validateParams` — rejects `fixed_payment` if payment ≤ first-month interest |
| `amortization.ts` | `deriveMonthlyPayment` — amortization formula for `fixed_months` mode; ceils to nearest cent |
| `calculator.ts` | `runSimulation` (main loop) + `runBaselineSimulation` (minimum-payment comparison) |
| `index.ts` | Re-exports public API |

**`src/components/`** — React UI, consumes engine output directly.

| File | Responsibility |
|---|---|
| `InputCard.tsx` | All form inputs + Calculate button |
| `InterestSavedCallout.tsx` | Teal savings banner; shows "balance grows indefinitely" when baseline hit cap |
| `MetricStrip.tsx` | 4-stat purple card strip (months, total paid, interest, payoff date) |
| `PayoffChart.tsx` | Plain SVG balance curve with teal milestone markers |
| `SummaryBlock.tsx` | Milestone dates (25/50/75/100%) with joint-reach annotations |
| `ScheduleTable.tsx` | Month-by-month schedule; milestone rows teal, 100% row purple |

`src/App.tsx` — layout shell; owns form state and wires `runSimulation` to UI.

`src/utils/format.ts` — `formatCurrency` (Intl, 2dp + thousands), `formatDate` (UTC, "Apr 15, 2030").

## Key Calculation Rules

- **Interest timing:** `interest = round(balance × monthly_rate, 2)` each cycle, applied before payment.
- **Payment split:** interest-first, then principal. Final payment auto-reduced to exact balance — never overpay.
- **`fixed_months` amortization:** `payment = ceil((balance × factor + new_charges) × 100) / 100` — **must ceil to nearest cent** or per-cycle interest rounding drifts the balance past zero, adding an extra month.
- **Milestone thresholds:** anchored to original starting balance. Only the *highest* milestone crossed on a row is flagged; lower skipped milestones are backfilled with their date + joint annotation.
- **First payment date:** `start_date.day <= due_day` → same month; else next month. Short months use last available day.
- **Safety cap:** 600 iterations max.
- **Minimum-payment baseline:** `max($25, 1% of balance + monthly_interest)` — standard US credit card formula. With new monthly charges the balance can grow indefinitely; the callout handles that case with a prose message rather than a dollar amount.

## Validation

- `fixed_payment`: reject if `payment ≤ first_month_interest`; show minimum viable amount.
- `fixed_months`: warn (don't reject) if derived payment < $25.
- APR = 0: valid — skip all interest math.

## Design System

Purple/teal palette — **purple** for the user's plan stats, **teal** for milestones.

| Token | Hex | Usage |
|---|---|---|
| Purple 50 | `#EEEDFE` | Light fill (100% milestone row, metric strip) |
| Purple 400 | `#7F77DD` | Accent border |
| Purple 600 | `#534AB7` | Mid (selected mode button) |
| Purple 900 | `#26215C` | Text on light purple |
| Teal 50 | `#E1F5EE` | Light fill (milestone rows, callout background) |
| Teal 400 | `#1D9E75` | Milestone marker, callout icon |
| Teal 600 | `#0F6E56` | Strong teal |
| Teal 900 | `#04342C` | Text on light teal |

Layout order: header → InputCard → validation error banner → low-payment warning → InterestSavedCallout → MetricStrip → PayoffChart → SummaryBlock → ScheduleTable.

Flat surfaces — no gradients, no shadows. Currency: `$1,234.56`. Dates: `Apr 15, 2030`.

## Sanity-Check Example

`$5,000 balance, 18% APR, $150/month, $0 new charges`:
- Month 1: interest = $75.00, principal = $75.00, ending balance = $4,925.00
- Total: 47 months, ~$2,028 interest, payoff Apr 2030
- Saves ~$4,511 vs. minimum payments (baseline: 222 months, ~$6,539 interest)
