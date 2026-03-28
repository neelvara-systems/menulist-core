# MenuList Internal Tracking System

**Version:** 2.0  
**Status:** 🔒 LOCKED — This is the ONLY tracking allowed  
**Purpose:** Define what MenuList tracks internally to prove autonomous operation

---

## Core Principle

> **Track to prove autonomy, not to optimize engagement.**

Every metric must answer ONE of these questions:

1. Is the system running correctly?
2. Is authority transferring as designed?
3. Are costs within bounds?
4. Is the system stable over time?

**Nothing else.**

---

## The 6 Allowed Metric Categories

### Category A: System Health

| Metric                    | Type    | Purpose                    |
| ------------------------- | ------- | -------------------------- |
| `nightly_job_status`      | enum    | Job execution verification |
| `nightly_job_duration_ms` | number  | Performance baseline       |
| `fallback_triggered`      | boolean | Safety mechanism usage     |
| `silent_recovery_count`   | number  | Auto-healing frequency     |
| `firebase_cost_delta`     | number  | Cost monitoring            |

**Path:** `telemetry/jobs/{date}`

---

### Category B: Decision Execution

| Metric               | Type    | Purpose                         |
| -------------------- | ------- | ------------------------------- |
| `decision_block_id`  | string  | Which block executed            |
| `confidence_score`   | number  | Decision certainty              |
| `threshold_met`      | boolean | Did it pass gate?               |
| `action_taken`       | enum    | applied / suppressed / deferred |
| `suppression_reason` | string  | Why refused (if applicable)     |

**Path:** `telemetry/decisions/{date}/{id}`

---

### Category C: Authority Maturation

| Metric                    | Type      | Purpose                       |
| ------------------------- | --------- | ----------------------------- |
| `authority_stage`         | enum      | Current phase (1-3)           |
| `days_in_stage`           | number    | Time in current phase         |
| `last_owner_intervention` | Timestamp | When owner last touched       |
| `intervention_count_30d`  | number    | Recent intervention frequency |
| `regression_events`       | number    | Times authority decreased     |

**Path:** `telemetry/authority/{storeId}`

---

### Category D: Owner Intervention (Resistance Signals)

| Metric                    | Type    | Purpose                       |
| ------------------------- | ------- | ----------------------------- |
| `intervention_type`       | enum    | What was changed              |
| `preceding_confidence`    | number  | System confidence at time     |
| `authority_stage_at_time` | number  | Phase when it happened        |
| `persisted_7d`            | boolean | Did change stick?             |
| `system_normalized_back`  | boolean | Did system eventually revert? |

**Path:** `telemetry/interventions/{storeId}/{id}`

**Critical Rule:** Owner actions reduce system confidence; they do not define system behavior.

---

### Category E: Output Stability

| Metric                  | Type   | Purpose                |
| ----------------------- | ------ | ---------------------- |
| `menu_mutation_count`   | number | Changes per period     |
| `mutation_reason`       | enum   | Why change happened    |
| `reversal_count`        | number | Changes undone         |
| `zero_blank_violations` | number | **MUST BE ZERO**       |
| `render_hash`           | string | Menu consistency check |

**Path:** `telemetry/stability/{storeId}/{period}`

---

### Category F: Cost & Performance

| Metric               | Type   | Purpose                |
| -------------------- | ------ | ---------------------- |
| `reads_count`        | number | Firestore reads        |
| `writes_count`       | number | Firestore writes       |
| `storage_bytes`      | number | Storage usage          |
| `estimated_cost_usd` | number | Estimated monthly cost |

**Path:** `telemetry/costs/{month}`

---

## FORBIDDEN Metrics (Write This in Code)

```typescript
/**
 * FORBIDDEN METRICS - DO NOT IMPLEMENT
 *
 * ❌ Feature popularity ranking
 * ❌ Time spent per feature
 * ❌ Click/tap tracking
 * ❌ User journey funnels
 * ❌ "Most used feature" analysis
 * ❌ Engagement scores
 * ❌ Behavioral heatmaps
 * ❌ A/B test results
 * ❌ NPS or satisfaction scores
 * ❌ Session duration
 *
 * If anyone suggests these → reject immediately.
 */
```

---

## Weekly Validation Tests

### Test 1: Silence Metric

```
% of stores with zero owner logins in last 30 days
Target: > 60%
```

### Test 2: Intervention Trend

```
Owner intervention frequency (rolling 30 days)
Target: Declining or flat
```

### Test 3: Zero-Blank Guarantee

```
Zero-blank violations (all time)
Target: ALWAYS ZERO
```

### Test 4: Cost Stability

```
Monthly Firebase cost delta
Target: < 10% month-over-month
```

### Test 5: Decision Suppression Rate

```
% of decisions suppressed due to low confidence
Target: 10-30%
```

---

## Access Control

| Role        | Access Level |
| ----------- | ------------ |
| Engineering | Full         |
| Founder     | Read-only    |
| Support     | None         |
| Sales       | None         |
| Marketing   | None         |

---

## The One-Line Test

Before approving a new metric, ask:

> **"If this number drops, would I feel tempted to change user behavior?"**

- Yes → **KILL IT**
- No → Keep it

---

**Document Signature:** Founder Constitution  
**Last Updated:** January 2026
