# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page credit card payoff simulator. Full requirements are in `docs/credit-card-payoff-simulator-spec.md`. No code exists yet — this is a greenfield implementation.

## Architecture

This is a pure frontend project (no backend required). All computation runs client-side. The recommended stack is plain HTML/CSS/JS or a lightweight framework (React/Vue/Svelte) — defer to the spec's UI requirements rather than framework conventions.

**Core modules to implement:**

- **Simulator engine** — the calculation loop (Appendix A of the spec). Keep this framework-agnostic and pure (no DOM dependencies) so it can be unit-tested independently.
- **Minimum-payment baseline** — a second simulation run used only for the "interest saved" callout; reuses the same engine with a variable payment of `max($25, 2% × balance)`.
- **UI layer** — renders inputs, schedule table, chart, and summary block.

## Calculation Rules (Critical)

These are easy to get wrong — read the spec carefully before implementing:

- **Interest timing:** accrues the day *before* the payment due date; payment applies interest-first, then principal.
- **Milestone tracking:** anchored to the original starting balance (not current balance); flags only the *highest* milestone crossed on a given row; lower milestones are skipped in the schedule but still get dates in the summary (backfill with joint-reach annotation).
- **Final payment:** automatically reduced to clear exact remaining balance — never overpay.
- **First payment date logic:** if `start_date.day <= due_day`, use that month; otherwise push to next month. Short months use last available day.
- **Loop safety cap:** abort at 600 iterations with an error.
- **Rounding:** round dollar values to 2 decimals on each row; keep running totals in full precision during the loop. Use one rounding method consistently (banker's or half-up).
- **Fixed months mode with new charges:** use the corrected amortization formula: `monthly_payment = (balance × factor) + new_monthly_charges`.

## Validation

- `fixed_payment` mode: reject if `monthly_payment ≤ first_month_interest`; show minimum viable payment.
- `fixed_months` mode: warn (don't reject) if derived payment < $25.
- APR = 0 is valid — skip all interest math.

## Design System

Purple/teal palette — **purple** for the user's plan stats, **teal** for milestones.

| Token | Hex |
|---|---|
| Purple 50 (light fill) | `#EEEDFE` |
| Purple 400 (accent border) | `#7F77DD` |
| Purple 600 (mid) | `#534AB7` |
| Purple 900 (text on light) | `#26215C` |
| Teal 50 (light fill) | `#E1F5EE` |
| Teal 400 (milestone marker) | `#1D9E75` |
| Teal 600 (strong) | `#0F6E56` |
| Teal 900 (text on light) | `#04342C` |

Layout order: header → input card → interest-saved callout (teal, suppressed if savings ≤ 0) → 4-stat metric strip (purple) → balance-over-time chart with milestone markers → payment schedule table.

- Milestone rows: teal background, milestone % as pill badge in the date cell.
- Final payoff row (100%): purple background.
- Flat surfaces — no gradients or shadows.
- Currency: thousands separators + 2 decimal places. Dates: `MMM D, YYYY`.

## Sanity-Check Example

`$5,000 balance, 18% APR, $150/month`:
- Month 1: interest = $75.00, principal = $75.00, ending balance = $4,925.00
- Total: 47 months, $2,028 interest, payoff Apr 2030
- Saves ~$4,312 vs. minimum payments
