# MenuList Failure Refusal Matrix

**Date:** January 2026  
**Status:** 🔒 LOCKED — ENFORCED DURING AUTOMODE  
**Purpose:** Define what MenuList will NEVER do, even under pressure

---

## Core Principle

> **When confidence, signals, or authority are insufficient, MenuList must refuse to act — calmly and silently.**

Wrong action is worse than no action.  
Guessing is forbidden.  
Infrastructure is defined more by refusal than capability.

---

## Global Refusal Rule

```
If MenuList cannot act with CONFIDENCE, AUTHORITY, and CLARITY
at the same time — it must not act at all.
```

---

## Category 1: Data Integrity Failures

_When inputs are missing, stale, or contradictory_

### MenuList will NEVER:

- ❌ Guess prices
- ❌ Invent items
- ❌ Fill missing fields with "smart defaults"
- ❌ Merge conflicting data sources
- ❌ Infer availability without confirmation

### Mandatory Behavior:

- ✅ Suppress decision
- ✅ Use last known valid state
- ✅ Activate safe mode
- ✅ Preserve menu stability

**Invariant:** Zero-blank guarantee must still hold.

---

## Category 2: Confidence Threshold Failures

_When internal confidence < required threshold_

### MenuList will NEVER:

- ❌ "Try anyway"
- ❌ Lower thresholds dynamically
- ❌ Act because similar cases succeeded
- ❌ Compensate with explanation or messaging

### Mandatory Behavior:

- ✅ Do nothing
- ✅ Log suppression
- ✅ Wait for future certainty

**Invariant:** Authority without confidence is negligence.

---

## Category 3: External Signal Conflicts

_When seasonality, trends, pricing norms disagree_

### MenuList will NEVER:

- ❌ Average conflicting signals
- ❌ Pick the most recent signal
- ❌ Follow majority patterns
- ❌ Optimize for popularity

### Mandatory Behavior:

- ✅ Defer action
- ✅ Extend observation window
- ✅ Preserve existing menu

**Invariant:** Stability beats responsiveness.

---

## Category 4: Owner Intervention Events

_When human edits, overrides, or rollbacks occur_

### MenuList will NEVER:

- ❌ Learn preferences from edits
- ❌ Mimic owner style
- ❌ Generalize from individual behavior
- ❌ Reward intervention with compliance

### Mandatory Behavior:

- ✅ Reduce confidence temporarily
- ✅ Delay authority maturation
- ✅ Observe persistence of intervention

**Invariant:** Humans signal resistance, not truth.

---

## Category 5: Rapid Environmental Change

_When promotions, shortages, or sudden demand shifts occur_

### MenuList will NEVER:

- ❌ Chase short-term spikes
- ❌ React within the same cycle
- ❌ Modify menus multiple times in short windows

### Mandatory Behavior:

- ✅ Enforce inertia rules
- ✅ Allow only lifecycle-bound changes
- ✅ Wait for signal confirmation across cycles

**Invariant:** Calm systems earn trust.

---

## Category 6: System Degradation or Partial Failure

_When jobs fail, services degrade, or retries escalate_

### MenuList will NEVER:

- ❌ Produce partial outputs
- ❌ Surface errors to owners
- ❌ Expose internal uncertainty
- ❌ Continue with incomplete execution

### Mandatory Behavior:

- ✅ Fallback to last valid menu
- ✅ Activate silent recovery
- ✅ Maintain external consistency

**Invariant:** The owner must never see instability.

---

## Category 7: Ambiguous Business Context

_When menu meaning is unclear: mixed cuisine, unclear pricing logic, experimental items_

### MenuList will NEVER:

- ❌ Impose structure aggressively
- ❌ Normalize aggressively
- ❌ Optimize categorization prematurely

### Mandatory Behavior:

- ✅ Preserve original structure
- ✅ Defer optimization
- ✅ Wait for clarity over time

**Invariant:** Premature optimization destroys trust.

---

## Category 8: Pressure From Humans (Internal or External)

_When support, sales, investors, or founders push for action_

### MenuList will NEVER:

- ❌ Act because support asked
- ❌ Act because sales asked
- ❌ Act because an investor questioned metrics
- ❌ Act to "prove intelligence"

### Mandatory Behavior:

- ✅ Follow system law only
- ✅ Log violation attempts
- ✅ Ignore urgency not backed by invariants

**Invariant:** Infrastructure does not perform.

---

## Category 9: Long Periods of No Change

_When nothing happens for weeks or months_

### MenuList will NEVER:

- ❌ Introduce change to appear active
- ❌ "Refresh" content unnecessarily
- ❌ Optimize for novelty

### Mandatory Behavior:

- ✅ Render identically
- ✅ Maintain hashes
- ✅ Preserve calm

**Invariant:** Boredom is success.

---

## Category 10: Unknown Unknowns

_When cases are not covered by existing logic_

### MenuList will NEVER:

- ❌ Guess behavior
- ❌ Degrade gracefully by inventing logic
- ❌ Hide uncertainty behind output

### Mandatory Behavior:

- ✅ Refuse action
- ✅ Preserve last known good state
- ✅ Log for audit only

**Invariant:** Silence is safer than imagination.

---

## Summary Matrix

| Category              | Trigger                | Refusal                     | Mandatory Behavior   |
| --------------------- | ---------------------- | --------------------------- | -------------------- |
| 1. Data Integrity     | Missing/stale data     | No guessing                 | Use last valid state |
| 2. Confidence         | Below threshold        | No "try anyway"             | Do nothing, log      |
| 3. Signal Conflicts   | Contradictory inputs   | No averaging                | Defer, preserve      |
| 4. Owner Intervention | Human edits            | No learning                 | Reduce confidence    |
| 5. Rapid Change       | Short-term spikes      | No chasing                  | Enforce inertia      |
| 6. System Degradation | Partial failures       | No partial output           | Silent fallback      |
| 7. Ambiguous Context  | Unclear meaning        | No aggressive normalization | Preserve original    |
| 8. Human Pressure     | Internal/external push | No performing               | Follow system law    |
| 9. Long Silence       | No activity            | No novelty injection        | Identical renders    |
| 10. Unknown Cases     | No logic coverage      | No invention                | Refuse, log          |

---

## Why This Matrix Matters

Most AI systems fail because:

- They try to be helpful
- They hate doing nothing
- They fear appearing "dumb"

MenuList succeeds because:

- It is comfortable refusing
- It values stability over cleverness
- It understands responsibility

---

## Implementation Notes

### Codebase Alignment

| Refusal Category      | Current Implementation                              |
| --------------------- | --------------------------------------------------- |
| Confidence Thresholds | `menuIntelligence.ts` - 0.8 staff, 0.7 screens      |
| Inertia Rules         | `decisionBlocksScoring.ts` - 3 days min, 2/week max |
| Safe Mode             | Fallback content in decision blocks                 |
| Zero-Blank            | 4-layer slide stack with fallbacks                  |
| Silence Governor      | Intentional quiet days logic                        |

### What Still Needs Implementation

| Refusal Category            | Gap                                |
| --------------------------- | ---------------------------------- |
| Owner Intervention Tracking | Partial - needs persistence logic  |
| Signal Conflict Detection   | Future - weather/daypart awareness |
| Violation Logging           | Needs formal logging structure     |

---

**Document Signature:** Founder Constitution  
**Authority:** Non-negotiable — Violations cause system breach.

_Infrastructure is defined by what it refuses to do._
