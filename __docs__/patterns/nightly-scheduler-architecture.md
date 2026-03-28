# Nightly Scheduler Architecture

> **Status:** PRODUCTION
> **Last Updated:** 2026-03-03
> **Entry Point:** `functions/src/decisionBlocksScoring.ts`
> **Schedule:** Every hour at :30 (timezone-aware, filters by store's `schedulerHour`)

---

## 1. Architecture Overview

### Single Entry Point

All nightly batch processing runs through **one Cloud Function**: `computeDecisionBlocksScores`.

```
Cloud Scheduler (every hour at :30)
  └── computeDecisionBlocksScores (CF)
      ├── Read storesSummary (1 read)
      ├── Filter: only stores where schedulerHour === currentUTCHour
      ├── Skip if 0 stores match (early exit — saves compute)
      │
      ├── PER-STORE TASKS (iterate matching stores):
      │   ├── Decision Blocks scoring (per-project)
      │   ├── Menu Intelligence (per-project)
      │   └── Infrastructure enrichment (piggybacked)
      │
      ├── PLATFORM TASKS (once per run):
      │   ├── Authority Maturation analysis
      │   ├── Menu Drift Metrics (MOL v0)
      │   ├── Guest Feedback Retention
      │   ├── Subscription Reconciliation
      │   ├── OBP Analytics
      │   ├── Lifecycle Messaging
      │   ├── Special Menu Switching
      │   ├── Infrastructure Compounding (3 sub-tasks)
      │   ├── Reseller License Expiry
      │   ├── AI Insights (feedback intelligence, KB quality, weekly narrative, health signals)
      │   └── Canonica Nightly (7-step batch)
      │
      ├── Persist run log (schedulerRunLogs collection)
      └── Telegram Dead Man's Switch alert
```

### Why Single Entry Point?

| Benefit                       | Impact                                             |
| ----------------------------- | -------------------------------------------------- |
| **1 cold start** instead of 3 | Saves ~$0.30/night (~$9/month)                     |
| **1 run log**                 | Complete visibility in scheduler dashboard         |
| **1 telegram alert**          | Solo founder knows if ANYTHING failed              |
| **Shared store iteration**    | Stores read once, all tasks reuse                  |
| **Consistent error handling** | All tasks use same try/catch + taskResults pattern |

---

## 2. Timezone-Aware Scheduling

### Problem

Global clients operate in different timezones. A restaurant in Sydney needs nightly scoring at 2:30 AM AEST, not 2:30 AM UTC (which is 12:30 PM AEST — peak business hours).

### Solution: DST-Safe Runtime Timezone Computation

Instead of storing a static UTC hour (which drifts with DST), the CF computes each store's local hour **at runtime** using its IANA `timeZone`.

```
CF runs at any UTC hour:
  For each store with timeZone:
    localHour = getLocalHour(now, store.timeZone)
    if (localHour === 2)  → process this store

  For stores WITHOUT timeZone:
    fallback to stored schedulerHour (default: 2 UTC)
```

**Why runtime, not stored?** DST-observing regions shift by 1 hour twice per year:

- New York winter: 2:30 AM EST = 7:30 UTC
- New York summer: 2:30 AM EDT = 6:30 UTC
- A stored `schedulerHour: 7` would run at 3:30 AM local in summer — **silent drift**

Runtime computation using `Intl.DateTimeFormat` handles DST automatically. Zero drift. Zero recalculation.

### How It Works

1. **CF runs every hour** at :30 (Cloud Scheduler: `30 * * * *`)
2. **Reads storesSummary** (1 Firestore read)
3. **For each store with `timeZone`:** Compute local hour now via `Intl.DateTimeFormat`
4. **Match:** `localHour === 2` (target: 2:30 AM local)
5. **Fallback:** Stores without `timeZone` use stored `schedulerHour` (default 2 UTC)
6. **Early exit** if 0 stores match (no wasted compute)

### Data Flow

```
Store Creation / Update
  → Save timeZone to store doc (e.g., 'Asia/Kolkata')
  → Sync timeZone + schedulerHour to storesSummary

Cloud Function (runs every hour at :30):
  → Reads storesSummary (1 read)
  → For store with timeZone='Asia/Kolkata':
       localHour = getLocalHour(now, 'Asia/Kolkata') → 2 (if it's 2 AM IST)
       2 === 2 → process this store
  → DST changes? Intl.DateTimeFormat handles it automatically
```

### Storage

| Location                                       | Field           | Type            | Purpose                                 |
| ---------------------------------------------- | --------------- | --------------- | --------------------------------------- |
| `stores/{sId}`                                 | `timeZone`      | `string` (IANA) | Primary — DST-safe runtime source       |
| `stores/{sId}`                                 | `schedulerHour` | `number` (0-23) | Fallback only (stores without timeZone) |
| `platformSummary/storesSummary → stores.{sId}` | `timeZone`      | `string` (IANA) | CF reads this for runtime computation   |
| `platformSummary/storesSummary → stores.{sId}` | `schedulerHour` | `number` (0-23) | CF fallback                             |

### Auto-Detection

When a store is created or updated with a `timeZone`:

- `timeZone` synced to storesSummary (primary scheduling source)
- `computeSchedulerHour(timeZone)` also stored as fallback
- Runtime: CF uses `timeZone` first, `schedulerHour` only if `timeZone` missing

### Multi-Outlet Inheritance

When creating an outlet store:

- `schedulerHour` is inherited from the master store
- If master has `schedulerHour: 21` (India), all outlets get `schedulerHour: 21`
- Outlet can override independently if needed

---

## 3. Task Inventory

### Per-Store Tasks (run inside store iteration loop)

| Task                    | Feature Flag                    | Cost/Store         | Description                                |
| ----------------------- | ------------------------------- | ------------------ | ------------------------------------------ |
| Decision Blocks scoring | Always                          | ~7 reads + 1 write | Precompute DI block candidates per project |
| Menu Intelligence       | Always                          | ~3 reads + 1 write | Compute intelligence state per project     |
| Store enrichment        | `ENABLE_STORE_TRUTH_CONFIDENCE` | 0 extra reads      | Piggybacked on project reads               |

### Platform Tasks (run once per CF invocation)

| Task                        | Feature Flag                         | Cost              | Description                                                      |
| --------------------------- | ------------------------------------ | ----------------- | ---------------------------------------------------------------- |
| Authority Maturation        | Always                               | ~100 reads        | Phase 1/2/3 progression analysis                                 |
| Menu Drift Metrics          | Always                               | ~50 reads         | 30-day rolling drift counters                                    |
| Guest Feedback Retention    | `ENABLE_GUEST_FEEDBACK_RETENTION`    | Variable          | Delete expired feedback (90-day TTL)                             |
| Subscription Reconciliation | `ENABLE_SUBSCRIPTION_RECONCILIATION` | ~50 reads         | Razorpay ↔ Firestore sync                                        |
| OBP Analytics               | `ENABLE_OBP_ANALYTICS`               | ~50 reads         | Weekly OBP summary aggregation                                   |
| Lifecycle Messaging         | Always                               | ~20 reads         | Renewal reminders + suspension warnings                          |
| Special Menu Switching      | `ENABLE_SPECIAL_MENU_SWITCHING`      | ~10 reads/store   | Activate/deactivate scheduled menus                              |
| Extraction Learning         | `ENABLE_EXTRACTION_LEARNING`         | ~30 reads         | Owner correction aggregation                                     |
| Store Truth Confidence      | `ENABLE_STORE_TRUTH_CONFIDENCE`      | ~50 reads         | Composite reliability score                                      |
| Staleness Check             | `ENABLE_STALENESS_CHECK`             | ~20 reads         | 90-day reconfirmation detection                                  |
| Reseller License Expiry     | `ENABLE_RESELLER_DASHBOARD`          | ~10 reads         | Manual license auto-expiry                                       |
| Feedback Intelligence       | Always                               | Variable          | AI feedback analysis                                             |
| KB Quality                  | Always                               | Variable          | Article quality scoring                                          |
| Weekly Narrative            | Always (Sundays only)                | Variable          | AI weekly digest                                                 |
| Health Signals              | Always (Sundays only)                | Variable          | Trust/Loyalty/Risk computation                                   |
| Canonica Nightly            | `ENABLE_CANONICA_NIGHTLY`            | ~300 reads/tenant | 7-step: drift→resolve→mutate→coverage→fallback→impact→confidence |

---

## 4. Cost Analysis

### Per Invocation (hourly)

| Scenario                         | Stores Matched | Estimated Cost                          |
| -------------------------------- | -------------- | --------------------------------------- |
| No stores for this hour          | 0              | ~$0.001 (1 read + cold start amortized) |
| 10 stores (small deployment)     | 10             | ~$0.05                                  |
| 100 stores (medium)              | 100            | ~$0.50                                  |
| 1000 stores (large, distributed) | ~42/hour avg   | ~$0.20/hour                             |

### Monthly Total

| Scale                   | Monthly Cost |
| ----------------------- | ------------ |
| 10 stores (all same TZ) | ~$1.50       |
| 100 stores (mixed TZ)   | ~$15         |
| 1000 stores (global)    | ~$150        |

### Cost Optimizations Applied

1. **storesSummary pattern** — 1 read instead of N store reads
2. **Runtime timezone filtering** — Only process stores whose local hour = 2 AM
3. **Early exit** — Skip entire run if 0 stores match
4. **Piggybacked enrichment** — Store truth data collected during project reads (0 extra reads)
5. **Batch writes** — Store enrichment collected in loop, written once at end
6. **Dynamic imports** — Feature-flagged tasks use `await import()` to avoid cold start bloat
7. **DST-safe** — No stored UTC hour to drift; runtime computation via `Intl.DateTimeFormat`

---

## 5. File Map

### Core

| File                                     | Purpose                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `functions/src/decisionBlocksScoring.ts` | Single entry point — unified nightly scheduler |
| `functions/src/constants/features.ts`    | All `FUNCTION_FLAGS` for task gating           |
| `src/database/platformSummary/index.ts`  | `StoreSummaryData` type + sync functions       |
| `src/lib/utils/schedulerHour.ts`         | `computeSchedulerHour()` — client-side         |
| `functions/src/utils/schedulerHour.ts`   | `computeSchedulerHour()` — server-side         |

### Task Modules (imported dynamically)

| File                                                  | Task                        |
| ----------------------------------------------------- | --------------------------- |
| `functions/src/analytics/feedbackIntelligence.ts`     | Feedback Intelligence       |
| `functions/src/analytics/kbQuality.ts`                | KB Quality Analysis         |
| `functions/src/analytics/weeklyNarrative.ts`          | Weekly Narrative            |
| `functions/src/analytics/healthSignalsComputation.ts` | Health Signals              |
| `functions/src/analytics/authorityMaturation.ts`      | Authority Maturation        |
| `functions/src/analytics/menuDriftMetrics.ts`         | Menu Drift Metrics          |
| `functions/src/analytics/guestFeedbackRetention.ts`   | Guest Feedback Retention    |
| `functions/src/analytics/extractionLearning.ts`       | Extraction Learning Loop    |
| `functions/src/analytics/storeTruthConfidence.ts`     | Store Truth Confidence      |
| `functions/src/analytics/stalenessCheck.ts`           | Periodic Staleness Check    |
| `functions/src/analytics/obpAnalyticsAggregation.ts`  | OBP Analytics               |
| `functions/src/billing/reconcileSubscriptions.ts`     | Subscription Reconciliation |
| `functions/src/messaging/messagingEngine.ts`          | Lifecycle Messaging         |
| `functions/src/canonica/canonicaNightly.ts`           | Canonica Nightly (7-step)   |

### Deprecated

| File                                          | Status                         | Reason                                                            |
| --------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `functions/src/schedulers/masterScheduler.ts` | **DEPRECATED** as scheduled CF | Tasks migrated to decisionBlocksScoring.ts. Manual triggers kept. |

---

## 6. Adding a New Nightly Task

1. Create task logic in `functions/src/analytics/` or relevant folder
2. Export a single `async function processXxxForAllStores(): Promise<Result>`
3. Add feature flag in `functions/src/constants/features.ts` (default: `false`)
4. Add task block in `decisionBlocksScoring.ts` (before the run log section):

```typescript
if (FUNCTION_FLAGS.ENABLE_YOUR_TASK) {
  try {
    const taskStart = Date.now();
    logger.info("=== Starting Your Task ===");
    const { processYourTask } = await import("./analytics/yourTask");
    const result = await processYourTask();
    logger.info("Your Task completed", result);
    taskResults.push({
      name: "your_task",
      status: "success",
      durationMs: Date.now() - taskStart,
      details: result,
    });
  } catch (error: any) {
    logger.error("Your Task failed:", error.message);
    taskResults.push({
      name: "your_task",
      status: "failed",
      error: error.message,
    });
  }
} else {
  taskResults.push({ name: "your_task", status: "skipped" });
}
```

5. Deploy: `firebase deploy --only functions:computeDecisionBlocksScores`

**Rules:**

- Always use dynamic import (`await import()`) to avoid cold start bloat
- Always wrap in try/catch — one task failure must NOT block others
- Always push to `taskResults` (success, failed, or skipped)
- Always gate with feature flag (default OFF)
- Never add a separate scheduled CF — add it here

---

## 7. Observability

### Run Logs

Every run persists to `schedulerRunLogs` collection:

- Trigger type (scheduled vs manual)
- Start/end timestamps + duration
- Per-task breakdown (name, status, duration, details)
- Error details (capped at 50)

### Telegram Alert

Every run sends a Dead Man's Switch telegram alert:

- Store/project counts
- Success/fail/skip counts
- Intelligence results
- Duration
- If this alert doesn't arrive → scheduler didn't complete

### Manual Trigger

```typescript
exports.triggerDecisionBlocksScoring = onCall(...)
```

Call via Firebase Console for testing specific stores.

---

## 8. Observability

### Store Mismatch Telemetry

Every run compares `expectedStoreCount` (stores matched by timezone filter) vs `processedStoreCount` (success + failed + skipped). If mismatch > 0:

- Logged as warning: `[Scheduler] STORE MISMATCH: expected=X, processed=Y`
- Persisted in run log: `storeMismatch: true`
- Included in telegram alert: `⚠️ STORE MISMATCH`

This catches filtering bugs, schema drift, or silent store processing failures.

### Run Log Fields

| Field                   | Type      | Purpose                                  |
| ----------------------- | --------- | ---------------------------------------- |
| `schedulerHour`         | `number`  | Which UTC hour this run processed        |
| `totalStoresInPlatform` | `number`  | Total stores in storesSummary            |
| `totalStores`           | `number`  | Stores matched for this hour             |
| `storeMismatch`         | `boolean` | True if expected ≠ processed             |
| `tasks`                 | `array`   | Per-task name, status, duration, details |

---

## 9. Future Scale Notes (Do Nothing Now)

### storesSummary Document Size

At 5k+ stores, the `storesSummary` document may become:

- Large (approaching Firestore 1MB doc limit)
- Write-contention heavy (many concurrent syncs)

**Future solution:** Partition into `platformSummary/storesByHour/{0-23}` — each doc contains only stores for that hour. CF reads 1 doc for its hour. Zero filtering needed.

**Not needed now.** Current design is appropriate up to ~3-5k stores.

### Canonica Cost Density

Canonica nightly costs ~300 reads/tenant. If many tenants are in the same timezone, that hour’s invocation becomes heavy. Current filtering distributes by timezone, not by tenant grouping.

**Mitigation if needed:** Add per-hour tenant caps or stagger Canonica across sub-hours.

---

## Version History

| Date       | Change                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 2026-03-03 | DST-safe runtime timezone computation (replaces stored schedulerHour comparison)                   |
| 2026-03-03 | Added store mismatch telemetry (expected vs processed count)                                       |
| 2026-03-03 | Timezone-aware scheduling (hourly + store timezone filter)                                         |
| 2026-03-03 | Merged masterScheduler tasks (feedback intelligence, KB quality, weekly narrative, health signals) |
| 2026-03-03 | Removed duplicate canonicaNightly CF from schedulers.ts                                            |
| 2026-03-03 | Added Canonica nightly as task block                                                               |
| 2026-03-03 | Initial architecture documentation                                                                 |
