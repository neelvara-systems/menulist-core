# MenuList Internal Telemetry Blueprint

**Date:** January 2026  
**Status:** 🔒 LOCKED — NO ADDITIONS ALLOWED  
**Purpose:** Define what MenuList tracks internally (and nothing else)

---

## Core Principle

> **Telemetry exists to validate correctness, not to influence behavior.**

Every metric below answers exactly one of these questions:

1. Did the system run?
2. Did it decide correctly?
3. Did it act with sufficient confidence?
4. Is authority transferring safely?

**Nothing else.**

---

## What This Is NOT

This is NOT:

- ❌ Analytics
- ❌ Engagement metrics
- ❌ Feature popularity tracking
- ❌ User behavior analysis
- ❌ A/B test results
- ❌ Growth metrics

**Tracking exists to verify system integrity and authority maturation.**

---

## The 5 Allowed Metric Categories

Only these 5 categories may exist. Anything outside is forbidden.

---

## Category A: System Liveness & Integrity

**Why:** If this fails, nothing else matters.

| Metric                    | Type    | Description               |
| ------------------------- | ------- | ------------------------- |
| `nightly_job_status`      | enum    | success / partial / fail  |
| `nightly_job_duration_ms` | number  | Execution time            |
| `retry_count_per_job`     | number  | Recovery attempts         |
| `fallback_triggered`      | boolean | Did fallback activate?    |
| `silent_recovery_used`    | boolean | Did silent recovery work? |

**Purpose:** Ensures MenuList always runs. Detects infrastructure decay.

🚫 **Never use to optimize speed unless failures occur.**

---

## Category B: Decision Block Execution

**Why:** MenuList decides. Decisions must be auditable, not popular.

| Metric                            | Type              | Description       |
| --------------------------------- | ----------------- | ----------------- |
| `decision_block_invoked`          | {block_id, count} | Which blocks ran  |
| `decision_block_completed`        | boolean           | Did it finish?    |
| `decision_block_aborted`          | boolean           | Did it abort?     |
| `decision_block_confidence_score` | number            | Final confidence  |
| `decision_block_threshold_met`    | boolean           | Passed threshold? |

**Purpose:** Verifies decisions are happening. Confirms confidence gates respected.

🚫 **Never rank blocks by "usage".**  
🚫 **Never boost blocks because they run less.**

---

## Category C: Confidence & Safety

**Why:** Authority without confidence is negligence.

| Metric                               | Type    | Description             |
| ------------------------------------ | ------- | ----------------------- |
| `confidence_fail_rate_per_block`     | number  | % below threshold       |
| `safe_mode_triggered`                | boolean | Did safe mode activate? |
| `decision_suppressed_low_confidence` | count   | Suppressions logged     |
| `manual_owner_override_used`         | count   | Override count only     |

**Purpose:** Confirms MenuList refuses to act when unsure.

🚫 **Never surface to users.**  
🚫 **Never "optimize" to reduce suppressions.**

---

## Category D: Authority Maturation

**Why:** The only longitudinal insight that matters.

| Metric                         | Type  | Description              |
| ------------------------------ | ----- | ------------------------ |
| `authority_stage`              | enum  | Phase 0 → 3              |
| `time_in_current_stage`        | days  | Duration in phase        |
| `authority_regression_events`  | count | Regressions              |
| `owner_intervention_frequency` | rate  | Interventions per period |

**Purpose:** Measures trust transfer objectively.

⚠️ **May influence policy, never UI.**

---

## Category E: Output Stability & Mutation

**Why:** MenuList must be calm, not noisy.

| Metric                   | Type  | Description                            |
| ------------------------ | ----- | -------------------------------------- |
| `menu_mutation_count`    | count | Changes made                           |
| `mutation_reason`        | enum  | confidence_pass / lifecycle / external |
| `mutation_reversal_rate` | %     | Reverted changes                       |
| `zero_blank_violation`   | count | MUST ALWAYS BE ZERO                    |

**Purpose:** Ensures MenuList doesn't thrash. Protects brand stability.

🚫 **Never increase mutation frequency intentionally.**

---

## Owner Intervention Telemetry (Special Case)

This is allowed per Authority Maturation Doctrine but constrained:

### What to Track

| Metric                        | Type    | Purpose                                                                       |
| ----------------------------- | ------- | ----------------------------------------------------------------------------- |
| `owner_intervention_occurred` | boolean | Did owner intervene?                                                          |
| `intervention_type`           | enum    | content_edit / price_override / visibility_toggle / manual_publish / rollback |
| `preceding_decision_block_id` | string  | What triggered it?                                                            |
| `preceding_confidence_score`  | number  | System confidence at time                                                     |
| `authority_stage_at_time`     | enum    | Current phase                                                                 |
| `intervention_persisted_7d`   | boolean | Did it stick?                                                                 |
| `system_reasserted_control`   | boolean | Did system normalize back?                                                    |

### What to NEVER Do

- ❌ Train models on owner edits
- ❌ Generalize across owners
- ❌ "Learn preferences"
- ❌ Auto-apply patterns
- ❌ Surface this data

**Owner actions reduce system confidence; they do not define system behavior.**

---

## Explicitly Forbidden Metrics

Write this in code comments:

```typescript
// FORBIDDEN METRICS - DO NOT IMPLEMENT
// ❌ Feature popularity
// ❌ Time spent
// ❌ Click tracking
// ❌ Adoption funnels
// ❌ "Most used feature"
// ❌ "Least used feature"
// ❌ Engagement scores
// ❌ Behavioral heatmaps
// If an engineer suggests one → reject the PR.
```

---

## Storage & Access Rules

### Storage

- Append-only logs
- Immutable after write
- Retention: 18–24 months (rolling)

### Access Allowed

- ✅ Engineering
- ✅ System audits
- ✅ Incident response

### Access Forbidden

- ❌ Product marketing
- ❌ Growth team
- ❌ Sales enablement

---

## Decision Firewall Rule

> **No product decision may be justified using telemetry alone.**

Telemetry CAN:

- Block a release
- Trigger an audit
- Force a rollback

Telemetry can NEVER:

- Justify a feature
- Justify education
- Justify UI changes

---

## The One-Line Test

Before approving a new metric, ask:

> **"If this number drops, would I feel tempted to change user behavior?"**

- Yes → **KILL IT immediately**
- No → Keep it

---

## Codebase Alignment

### Already Implemented

| Metric Category     | Location                                       |
| ------------------- | ---------------------------------------------- |
| Nightly job status  | `decisionBlocksScoring.ts` logs                |
| Confidence scores   | `menuIntelligence.ts`                          |
| Authority stages    | `authorityMaturation.ts`                       |
| Owner control usage | `ownerControlUsage/index.ts` (feature-flagged) |

### Needs Implementation

| Metric Category          | Gap                       |
| ------------------------ | ------------------------- |
| Mutation tracking        | Need structured logging   |
| Intervention persistence | Need 7-day follow-up      |
| Formal telemetry schema  | Need Firestore collection |

---

## Firestore Schema (Recommended)

```
telemetry/
  ├── system_liveness/
  │   └── {date}/
  │       └── {job_run_id}
  ├── decision_execution/
  │   └── {date}/
  │       └── {block_execution_id}
  ├── authority_maturation/
  │   └── {store_id}/
  │       └── {snapshot_date}
  └── owner_interventions/
      └── {store_id}/
          └── {intervention_id}
```

---

**Document Signature:** Founder Constitution  
**Authority:** Non-negotiable — No metrics outside this list.

_Tracking exists to validate authority, not to optimize engagement._
