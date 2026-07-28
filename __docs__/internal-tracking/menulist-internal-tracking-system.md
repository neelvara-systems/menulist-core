# MenuList Internal Tracking System

**Date:** January 2026  
**Status:** 🔒 LOCKED — This is the ONLY tracking allowed  
**Author:** Cascade AI (with validation against ChatGPT recommendations)

---

## Executive Summary

This document defines what MenuList tracks internally to prove the system "keeps working when no one is watching."

**Critical distinction:**

- ChatGPT provided the philosophy
- This document provides the **validated, codebase-aligned execution**

---

# PART 1: My Validation of ChatGPT's Recommendations

## ✅ Where ChatGPT is CORRECT

| Concept                                | Why I Agree                            | Already in Codebase              |
| -------------------------------------- | -------------------------------------- | -------------------------------- |
| Track for integrity, not engagement    | Aligns with infrastructure philosophy  | ✅ Feature-flagged analytics     |
| Owner intervention = resistance signal | Smart framing, not preference learning | ⚠️ Partial (needs formalization) |
| Silence = success metric               | Matches existing inertia rules         | ✅ Silence Governor exists       |
| Never expose internal metrics          | Prevents supervision resurrection      | ✅ No dashboards exist           |
| Confidence gating before action        | Already core to decision blocks        | ✅ 0.8/0.7 thresholds            |

## ⚠️ Where ChatGPT is OVERCOMPLICATED

| Concept                        | Issue                                               | My Recommendation                          |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------ |
| 36-month AutoMode lock         | Too rigid; security patches need escape             | Use 12-month cycles with renewal           |
| "Never learn from owner edits" | Too extreme; patterns across many owners ARE signal | Learn aggregate patterns, never individual |
| 9-section AutoMode checklist   | Too many sections; creates audit fatigue            | Consolidate to 5 core checks               |
| Schema hash comparison         | Over-engineering for small team                     | Simple version tracking is enough          |

## ❌ Where ChatGPT MISSED Critical Points

| Missing Concept                | Why It Matters                                 | My Addition                    |
| ------------------------------ | ---------------------------------------------- | ------------------------------ |
| **Firebase cost tracking**     | Core project constraint; cost spikes = failure | Add cost-per-operation metrics |
| **Response time monitoring**   | Slow menus = owner checking = supervision      | Add latency metrics            |
| **Error rates by tenant**      | Multi-tenant isolation verification            | Add per-tenant error tracking  |
| **Feature flag state logging** | Know what's enabled per account                | Add flag state snapshots       |
| **Deployment correlation**     | Correlate changes with issues                  | Add deploy markers             |

---

# PART 2: The Validated Internal Tracking Blueprint

## Core Principle

> **Track to prove autonomy, not to optimize engagement.**

Every metric must answer ONE of these questions:

1. Is the system running correctly?
2. Is authority transferring as designed?
3. Are costs within bounds?
4. Is the system stable over time?

---

## Category A: System Health (Non-Negotiable)

### What to Track

| Metric                    | Type    | Purpose                       | Firestore Path            |
| ------------------------- | ------- | ----------------------------- | ------------------------- |
| `nightly_job_status`      | enum    | Job execution verification    | `telemetry/jobs/{date}`   |
| `nightly_job_duration_ms` | number  | Performance baseline          | `telemetry/jobs/{date}`   |
| `fallback_triggered`      | boolean | Safety mechanism usage        | `telemetry/jobs/{date}`   |
| `silent_recovery_count`   | number  | Auto-healing frequency        | `telemetry/jobs/{date}`   |
| `firebase_cost_delta`     | number  | Cost monitoring (MY ADDITION) | `telemetry/costs/{month}` |

### Already Implemented

- ✅ `decisionBlocksScoring.ts` logs job completion
- ⚠️ Gap: No structured Firestore collection for telemetry

### Firestore Schema

```typescript
// telemetry/jobs/{date}
interface JobTelemetry {
  date: string; // "2026-01-14"
  jobId: string; // "computeDecisionBlocksScores"
  status: "success" | "partial" | "fail";
  durationMs: number;
  storesProcessed: number;
  fallbackTriggered: boolean;
  silentRecoveryUsed: boolean;
  errorMessage?: string;
  timestamp: Timestamp;
}
```

---

## Category B: Decision Execution (Authority Verification)

### What to Track

| Metric               | Type    | Purpose                     | Firestore Path                    |
| -------------------- | ------- | --------------------------- | --------------------------------- |
| `decision_block_id`  | string  | Which block executed        | `telemetry/decisions/{date}/{id}` |
| `confidence_score`   | number  | Decision certainty          | `telemetry/decisions/{date}/{id}` |
| `threshold_met`      | boolean | Did it pass gate?           | `telemetry/decisions/{date}/{id}` |
| `action_taken`       | enum    | What happened               | `telemetry/decisions/{date}/{id}` |
| `suppression_reason` | string  | Why refused (if applicable) | `telemetry/decisions/{date}/{id}` |

### Already Implemented

- ✅ `menuIntelligence.ts` - Confidence scoring
- ✅ Thresholds: 0.8 staff, 0.7 screens
- ⚠️ Gap: No structured logging of decision outcomes

### Firestore Schema

```typescript
// telemetry/decisions/{date}/{decisionId}
interface DecisionTelemetry {
  decisionId: string;
  blockType:
    | "popular"
    | "quickPick"
    | "bestValue"
    | "staffPrompt"
    | "digitalScreen";
  storeId: string;
  confidenceScore: number;
  requiredThreshold: number;
  thresholdMet: boolean;
  actionTaken: "applied" | "suppressed" | "deferred";
  suppressionReason?:
    | "low_confidence"
    | "inertia_rule"
    | "silence_governor"
    | "owner_override";
  timestamp: Timestamp;
}
```

---

## Category C: Authority Maturation (The Key Metric)

### What to Track

| Metric                    | Type      | Purpose                       | Firestore Path                  |
| ------------------------- | --------- | ----------------------------- | ------------------------------- |
| `authority_stage`         | enum      | Current phase (1-3)           | `telemetry/authority/{storeId}` |
| `days_in_stage`           | number    | Time in current phase         | `telemetry/authority/{storeId}` |
| `last_owner_intervention` | Timestamp | When owner last touched       | `telemetry/authority/{storeId}` |
| `intervention_count_30d`  | number    | Recent intervention frequency | `telemetry/authority/{storeId}` |
| `regression_events`       | number    | Times authority decreased     | `telemetry/authority/{storeId}` |

### Already Implemented

- ✅ `authorityMaturation.ts` - Phase 1/2/3 analysis
- ✅ Runs nightly in `decisionBlocksScoring.ts`
- ✅ `ownerControlUsage/{tId}_{sId}` is the current aggregate authority: an exact owner/manager-only client state machine with transactional first-write/update, UTC monthly counters and shared app/Functions runtime validation
- ✅ The daily task reads the aggregate in 500-document pages, skips and counts malformed legacy/Admin rows, and exact-replaces `insights/authority_maturation_YYYY-MM-DD`
- ⚠️ Gap: Results stored in `insights` but not formal telemetry

### Firestore Schema

```typescript
// telemetry/authority/{storeId}
interface AuthorityTelemetry {
  storeId: string;
  tenantId: string;
  currentStage: 1 | 2 | 3;
  stageEnteredAt: Timestamp;
  daysInStage: number;
  lastOwnerIntervention: Timestamp | null;
  interventionCount30d: number;
  interventionCount90d: number;
  regressionEvents: number;
  lastUpdated: Timestamp;
}
```

---

## Category D: Owner Intervention Tracking (Resistance Signals)

### ChatGPT's View vs My View

| ChatGPT Says                   | My Validation                                                        |
| ------------------------------ | -------------------------------------------------------------------- |
| Track type only, never content | ✅ Agree - content is preference, type is signal                     |
| Never learn from edits         | ⚠️ Disagree - aggregate patterns across 100+ stores ARE valid signal |
| Use to delay maturation        | ✅ Agree - high intervention = not ready for Phase 3                 |

### What to Track

| Metric                    | Type    | Purpose                       | Firestore Path                           |
| ------------------------- | ------- | ----------------------------- | ---------------------------------------- |
| `intervention_type`       | enum    | What was changed              | `telemetry/interventions/{storeId}/{id}` |
| `preceding_confidence`    | number  | System confidence at time     | `telemetry/interventions/{storeId}/{id}` |
| `authority_stage_at_time` | number  | Phase when it happened        | `telemetry/interventions/{storeId}/{id}` |
| `persisted_7d`            | boolean | Did change stick?             | `telemetry/interventions/{storeId}/{id}` |
| `system_normalized_back`  | boolean | Did system eventually revert? | `telemetry/interventions/{storeId}/{id}` |

### Already Implemented

- ✅ `ownerControlUsage/index.ts` - Basic tracking exists
- ✅ Feature-flagged with `ENABLE_OWNER_ANALYTICS`
- ⚠️ Gap: No persistence tracking (7-day follow-up)

### Firestore Schema

```typescript
// telemetry/interventions/{storeId}/{interventionId}
interface InterventionTelemetry {
  interventionId: string;
  storeId: string;
  tenantId: string;
  type:
    | "content_edit"
    | "price_override"
    | "visibility_toggle"
    | "boost_change"
    | "pin_change";
  targetItem?: string;
  precedingConfidence: number;
  authorityStageAtTime: 1 | 2 | 3;
  timestamp: Timestamp;
  // Populated after 7 days:
  persisted7d?: boolean;
  systemNormalizedBack?: boolean;
  evaluatedAt?: Timestamp;
}
```

---

## Category E: Output Stability (Calmness Verification)

### What to Track

| Metric                  | Type   | Purpose                | Firestore Path                           |
| ----------------------- | ------ | ---------------------- | ---------------------------------------- |
| `menu_mutation_count`   | number | Changes per period     | `telemetry/stability/{storeId}/{period}` |
| `mutation_reason`       | enum   | Why change happened    | `telemetry/stability/{storeId}/{period}` |
| `reversal_count`        | number | Changes undone         | `telemetry/stability/{storeId}/{period}` |
| `zero_blank_violations` | number | MUST BE ZERO           | `telemetry/stability/{storeId}/{period}` |
| `render_hash`           | string | Menu consistency check | `telemetry/stability/{storeId}/{period}` |

### Already Implemented

- ✅ 4-layer slide stack with fallbacks (zero-blank)
- ✅ Inertia rules (3 days min, 2/week max)
- ⚠️ Gap: No mutation counting or hash verification

### Firestore Schema

```typescript
// telemetry/stability/{storeId}/{period}
interface StabilityTelemetry {
  storeId: string;
  period: string; // "2026-01" (monthly)
  mutationCount: number;
  mutationReasons: {
    confidence_pass: number;
    lifecycle_event: number;
    owner_intervention: number;
    external_signal: number;
  };
  reversalCount: number;
  zeroBlankViolations: number; // ALERT if > 0
  renderHashStart: string;
  renderHashEnd: string;
  hashChanged: boolean;
  lastUpdated: Timestamp;
}
```

---

## Category F: Cost & Performance (MY ADDITION - ChatGPT Missed This)

### Why This Matters

MenuList has strict Firebase cost constraints. Cost spikes indicate:

- Runaway loops
- Inefficient queries
- Feature flag misconfiguration

### What to Track

| Metric | Type | Purpose | Current Firestore path |
| --- | --- | --- | --- |
| `readsCount` | number | Bounded Menu Drift Firestore reads | `systemTelemetry/mol_costs_{YYYY-MM-DD}` |
| `writesCount` | number | Bounded Menu Drift Firestore writes | `systemTelemetry/mol_costs_{YYYY-MM-DD}` |
| `executionMs` | number | Menu Drift execution time | `systemTelemetry/mol_costs_{YYYY-MM-DD}` |
| `storesProcessed` | number | Scope completed by the run | `systemTelemetry/mol_costs_{YYYY-MM-DD}` |
| `itemsProcessed` | number | Items projected by the run | `systemTelemetry/mol_costs_{YYYY-MM-DD}` |
| `errors` | number | Store/project failures in the run | `systemTelemetry/mol_costs_{YYYY-MM-DD}` |

### Firestore Schema

```typescript
// systemTelemetry/mol_costs_{YYYY-MM-DD}
interface MenuDriftCostTelemetry {
  type: "mol_cost_telemetry";
  functionName: "menuDriftMetrics";
  date: string;
  readsCount: number;
  writesCount: number;
  executionMs: number;
  storesProcessed: number;
  itemsProcessed: number;
  errors: number;
  timestamp: Timestamp;
  expiresAt: Timestamp; // 90-day retention boundary
}
```

This is an operation-count sample, not Firebase billing data and not an
estimated-cost ledger. The writer exact-replaces the latest daily sample,
fails independently from the completed Menu Drift task, and shares no browser
read surface. Firestore TTL must be enabled through
`scripts/setup-firestore-ttl.sh`; source configuration alone is not evidence
that the remote policy is active.

---

# PART 3: Explicitly FORBIDDEN Metrics

Write this in code comments:

```typescript
/**
 * FORBIDDEN METRICS - DO NOT IMPLEMENT
 * Violates MenuList Authority Doctrine
 *
 * ❌ Feature popularity ranking
 * ❌ Time spent per feature
 * ❌ Click/tap tracking
 * ❌ User journey funnels
 * ❌ "Most used feature" analysis
 * ❌ "Least used feature" analysis
 * ❌ Engagement scores
 * ❌ Behavioral heatmaps
 * ❌ A/B test results (no A/B tests exist)
 * ❌ NPS or satisfaction scores
 * ❌ Session duration
 * ❌ Login frequency (except for authority maturation)
 *
 * If anyone suggests these → reject immediately.
 * These create engagement optimization pressure.
 * MenuList optimizes for SILENCE, not engagement.
 */
```

---

# PART 4: Access Control

| Role        | Access Level | Allowed Actions                 |
| ----------- | ------------ | ------------------------------- |
| Engineering | Full         | Read, analyze, build alerts     |
| Founder     | Read-only    | View dashboards (internal only) |
| Support     | None         | Cannot access telemetry         |
| Sales       | None         | Cannot access telemetry         |
| Marketing   | None         | Cannot access telemetry         |

---

# PART 5: The Validation Tests (Use Weekly)

## Test 1: Silence Metric

```
% of stores with zero owner logins in last 30 days
Target: > 60%
```

If below → Authority transfer is failing

## Test 2: Intervention Trend

```
Owner intervention frequency (rolling 30 days)
Target: Declining or flat
```

If rising → System confidence issues

## Test 3: Zero-Blank Guarantee

```
Zero-blank violations (all time)
Target: ALWAYS ZERO
```

If > 0 → P0 incident

## Test 4: Cost Stability

```
Monthly Firebase cost delta
Target: < 10% month-over-month
```

If spiking → Runaway process or misconfiguration

## Test 5: Decision Suppression Rate

```
% of decisions suppressed due to low confidence
Target: 10-30%
```

If < 10% → Acting too aggressively
If > 30% → System lacks confidence (needs investigation)

---

# PART 6: Implementation Priority

## Phase 1 (Immediate - Week 1-2)

1. Create `telemetry` Firestore collection
2. Add job status logging to `decisionBlocksScoring.ts`
3. Add decision outcome logging to `menuIntelligence.ts`

## Phase 2 (Week 3-4)

1. Formalize authority maturation telemetry
2. Add 7-day intervention persistence tracking
3. Create cost monitoring cron job

## Phase 3 (Week 5-6)

1. Add stability/mutation tracking
2. Create internal audit dashboard (engineering-only)
3. Set up alert thresholds

---

# PART 7: My Final Verdict

## Agreement with ChatGPT: 80%

The core philosophy is sound:

- Track for integrity, not engagement
- Owner actions are resistance signals
- Silence = success

## Disagreements: 20%

1. **36-month AutoMode is too rigid** → Use 12-month cycles
2. **"Never learn from owners"** → Aggregate patterns ARE valid
3. **Missing cost tracking** → Critical for this project
4. **Missing performance metrics** → Slow = checking = supervision

## What ChatGPT Got Very Right

> "If this number drops, would I change the product?" If yes → kill the metric.

This is the right test. Every metric in this doc passes that test.

## The Ultimate Success Metric

> **The owner forgets when they last touched the menu.**

Not retention. Not engagement. Not NPS.
**Forgetting is the success metric.**

---

**Document Signature:** Cascade AI (Validated against ChatGPT)  
**Authority:** This is the ONLY internal tracking spec.

_Tracking exists to prove autonomy, not to optimize engagement._
