# Safety Cap Annotation — Design Spec

**Date:** 2026-06-01
**Status:** Approved

---

## Problem

When a user's own simulation hits the 600-month safety cap, the MetricStrip silently shows "600 months" with no indication that the schedule is truncated. The user cannot tell whether 600 months is the true payoff duration or an engine limit, and has no guidance on what to do next.

The engine already has `baselineHitSafetyCap` for the minimum-payment comparison, but no equivalent signal for the user's own schedule.

---

## Scope

Applies to `fixed_payment` mode only in practice. The 600-month cap is hit when:
- The payment barely exceeds first-month interest, so the balance shrinks glacially, or
- New monthly charges exceed the principal portion of each payment, so the balance grows.

Both cases receive the same annotation (one message, not two).

---

## Design

### 1. Engine — `hitSafetyCap` flag

**`src/engine/types.ts`** — add to `SimulationResult`:

```ts
hitSafetyCap?: boolean   // true when user's own schedule hit the 600-month limit
```

**`src/engine/calculator.ts`** — after the main loop, detect the cap:

```ts
const hitSafetyCap =
  schedule.length === SAFETY_CAP &&
  schedule[schedule.length - 1].endingBalance > 0
```

Include `hitSafetyCap` in the returned `SimulationResult` object.

### 2. MetricStrip — superscript + footnote

**`src/components/MetricStrip.tsx`**

When `result.hitSafetyCap` is true:

- Render the "Time to payoff" value as `600 months ¹` using a `<sup>` element for the footnote marker.
- Below the four-tile grid, render a footnote line:

  > ¹ Simulation cap reached (50 years). Increase your monthly payment to see a full payoff date.

Footnote styling: 13px, color `#5F5E5A`, no border or background — plain prose beneath the strip.

### 3. No changes to other tiles

"Total paid" and "Interest paid" accurately reflect 600 months of payments and need no annotation. "Payoff date" shows the 600th payment date; the footnote implicitly covers this by explaining the limit applies to the entire schedule.

---

## Out of Scope

- Distinguishing "very slow but will converge" from "balance growing indefinitely" — one message covers both.
- Changes to validation, the chart, SummaryBlock, or ScheduleTable.
- Tooltip or hover interaction — superscript footnote only.
