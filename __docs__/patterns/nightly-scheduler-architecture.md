# Nightly Scheduler Architecture

> **Status:** PRODUCTION
> **Last Updated:** 2026-07-17
> **Entry Point:** `functions/src/decisionBlocksScoring.ts`
> **Schedule:** Every hour at :30 (timezone-aware, filters by store `timeZone` + `businessDayEndTime`; `schedulerHour` is fallback only)

**Launch boundary:** Not current launch certification or deploy approval. This scheduler architecture doc describes source design and current deploy routing; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped Functions deploy evidence, scheduler runtime evidence, and production-host smoke where relevant.

---

## 1. Architecture Overview

### Single Entry Point

All nightly batch processing runs through **one Cloud Function**: `computeDecisionBlocksScores`.

```
Cloud Scheduler (every hour at :30)
  └── computeDecisionBlocksScores (CF)
      ├── Read storesSummary (1 read)
      ├── Filter: only stores whose local business-day settlement window is due
      ├── Acquire daily platform-task lease
      ├── Skip if 0 stores match and daily platform work is already complete
      │
      ├── PER-STORE TASKS (iterate matching stores):
      │   ├── Read platformSummary/projects_{sId} active-project index
      │   ├── Decision Blocks scoring (active menu projects only)
      │   ├── Menu Intelligence (active menu projects only)
      │   ├── Store-local analytics settlement state / lock
      │   ├── OBP Analytics settlement
      │   ├── Menu + Customer App Analytics settlement
      │   ├── Owner dashboard read-model writes
      │   └── Infrastructure enrichment (piggybacked)
      │
      ├── PLATFORM TASKS (one successful suite per UTC day):
      │   ├── Authority Maturation analysis
      │   ├── Menu Drift Metrics (MOL v0)
      │   ├── Guest Feedback Retention
      │   ├── Lifecycle Messaging
      │   ├── Infrastructure Compounding (3 sub-tasks)
      │   └── Complete or fail the transactional daily lease
      │
      ├── Due-store Special Menu marker recovery
      │
      ├── Persist run log (schedulerRunLogs collection)
      └── Telegram Dead Man's Switch alert
```

### Why Single Entry Point?

| Benefit                       | Impact                                             |
| ----------------------------- | -------------------------------------------------- |
| **Consolidated store-EOD entry** | Avoids duplicate store scans and scheduler fanout |
| **1 run log**                 | Complete visibility in scheduler dashboard         |
| **1 telegram alert**          | Solo founder knows if ANYTHING failed              |
| **Shared store iteration**    | Due stores and active project inputs are reused    |
| **Consistent error handling** | All tasks use same try/catch + taskResults pattern |

### Maintenance Scheduler Boundary

MenuList has two scheduled entry points by design:

- `computeDecisionBlocksScores` — store-EOD analytics, Decision Blocks, Menu Intelligence, and intelligence platform tasks.
- `menulistMaintenanceScheduler` — high-frequency operational maintenance.

`menulistMaintenanceScheduler` runs every 2 minutes and owns a static task registry:

| Task | Cadence | Purpose |
|---|---:|---|
| `messaging_intake` | Every 2 min | Drain messaging onboarding inbound queue, process closed intake windows, retry pending preview/publish/fix messages |
| `menu_stuck_cleanup` | Every 15 min | Mark stuck/expired/cancelling extraction jobs and run extraction health checks |
| `alert_escalation` | Every 30 min | Re-send unresolved critical alert notifications |
| `chat_stats_aggregation` | Daily 1 AM UTC | Build `chatAnalytics` aggregate docs |
| `menu_old_cleanup` | Daily 3 AM UTC | Delete old terminal menu extraction jobs |
| `messaging_session_cleanup` | Daily 4 AM UTC | Expire messaging onboarding sessions, reminders, and storage cleanup |

Each task has an independent Firestore lease under `_system`, so overlapping scheduler ticks cannot duplicate sends, cleanup, or alerts while the lease is current. Outcome persistence verifies the current lease-owner token and releases that lease in the same transaction; an execution that finishes after its lease expired cannot overwrite replacement-owner state or clear the replacement lease.

Runtime-disabled tasks are removed before cadence and lease selection. In particular,
`messaging_intake` does not acquire a lease or persist a scheduler outcome while
`ENABLE_MESSAGING_ONBOARDING=false`; retention work remains independently scheduled
because disabling new provider intake must not pause declared cleanup obligations.
Successful or recorded-failure outcomes already release the current lease atomically,
so the fallback lease-release transaction runs only when outcome finalization did not
complete. This preserves overlap recovery while avoiding an extra lock read after every
normally finalized task.

Each due store also has one ten-minute `_system/storeNightlyScheduler_{tId}_{sId}` execution lease shared by the hourly scheduler and `triggerStoreNightlyScheduler`. It is acquired before store project/analytics/provider work and finalized only by its exact owner. This prevents scheduled/manual overlap and cross-tab duplicate recovery from repeating coupled store effects; an expired owner cannot finalize over a replacement.

### Future Scheduler Rule

Future MenuList scheduled work must use the existing product-level scheduler entry points unless there is a documented reason not to:

- Operational maintenance tasks belong in `menulistMaintenanceScheduler` with a registry entry, cadence, timeout expectation, per-task Firestore lease, and state update.
- Store-local EOD analytics, Decision Blocks, Menu Intelligence, and store-nightly intelligence tasks belong in `computeDecisionBlocksScores`.
- Answerlattice scheduled work belongs in `functions-answerlattice/`, not in MenuList schedulers.
- New standalone scheduled Cloud Functions are exceptions. Before adding one, document the trigger/SLA reason, Firebase cost impact in INR, expected invocation/read/write shape, monitoring, and why the existing scheduler boundary is not suitable.

### Product Boundary

These MenuList entry points are for MenuList work only. Answerlattice is a separate product with its own Firebase project and Cloud Functions package:

- MenuList scheduled work: `functions/src/decisionBlocksScoring.ts` and `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- Answerlattice scheduled work: `functions-answerlattice/src/index.ts` → `answerlatticeNightly`

Do not register Answerlattice nightly tasks in MenuList schedulers. The shared codebase can reuse patterns, but the deployed scheduler runtime stays product-specific.

### Analytics Settlement Contract

Owner-facing analytics are settled per store-local business day, not raw UTC dates. Each store has a `businessDayEndTime` (`HH:mm`) that decides when a customer event belongs to the next analytics day. The scheduler records settlement state in `platformSummary/nightlyState_{tId}_{sId}` and uses a per-date lock document `platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}`. If a run is retried, the lock and idempotency guards prevent double-counting. If a night is missed, the next eligible settlement window catches up from `lastSettledLocalDate + 1`, capped to 7 dates per run.

OBP analytics and menu/customer-app analytics run in the same locked store/date phase:

```
Acquire lock for store + local date
  ├── Set state: obp_analytics
  ├── Aggregate OBP analytics + write OBP dashboard_summary
  ├── Set state: customer_analytics
  ├── Aggregate menu + customer app analytics + write dashboard_summary docs
  └── Mark date completed + update store analytics index on nightlyState
```

If OBP aggregation fails for that store/date, menu/customer-app aggregation does not run for that same settlement date.

Dashboard, weekly/monthly rollups, and intelligence read models are incremental in the steady state. The scheduler reuses the existing compact daily cache, adds the settled day when a daily doc exists, and only rebuilds from daily docs when the cache is missing, stale, or does not cover the required WTD/MTD/history window. The next nightly pass also checks the previously settled local date and applies positive deltas for delayed passive writes. Decision Blocks and Menu Intelligence consume `analytics/{tId}_{sId}_{projectId}_intelligence_7d`; missing or stale intelligence snapshots settle as empty for that run instead of opening a hidden daily-doc range query, and the scheduler run log exposes `intelligenceSnapshotMissing`.

The completed `nightlyState` doc includes a compact `analyticsIndex` with active project ids, customer analytics project ids, enabled surfaces, dashboard summary doc ids, and the last settled local date. This keeps future owner/ops guard flows pointed at one store-level state document without introducing a second store analytics index write.

### Local Emulator Testing Contract

Manual scheduler recovery should be tested locally before production when changing callable wiring, logging, or scheduler internals.

- `firebase emulators:start --only functions --project menulist-qa` runs local Functions against cloud Firebase services.
- `firebase emulators:start --only functions,firestore --project menulist-qa` runs local Functions against the local Firestore emulator.
- `functions/src/firebaseAdmin.ts` respects Firebase emulator host variables. If Firestore emulator is not running, Admin SDK uses cloud Firestore; if Firestore emulator is running, Admin SDK uses the local emulator.
- The owner app connects to the local Functions emulator in `NODE_ENV=development`; it does not connect client Firestore to the emulator by default.

For isolated scheduler tests, seed `platformSummary/storesSummary`, `platformSummary/projects_{sId}`, `projects/{tId}/{sId}/{projectId}`, and optional `analytics/{tId}_{sId}_{projectId}_intelligence_7d` in the Firestore emulator, then trigger `triggerStoreNightlyScheduler` with `{ tId, sId }`.

---

## 2. Timezone + Business-Day Scheduling

### Problem

Global clients operate in different timezones and many food businesses close after midnight. A bar that closes at 2:00 AM should not split the same service night across two analytics days. A restaurant in Sydney also needs settlement after its local business day ends, not at a fixed UTC hour.

### Solution: DST-Safe Runtime Settlement Computation

Instead of relying on a static UTC hour, the CF computes each store's local settlement window **at runtime** using its IANA `timeZone` and `businessDayEndTime`.

```
CF runs at any UTC hour:
  For each store with timeZone:
    settlementMinute = businessDayEndTime + 150 minute buffer
    if local time is inside that hourly settlement window → process this store

  For stores WITHOUT timeZone:
    fallback to stored schedulerHour derived from businessDayEndTime in UTC
```

**Why runtime, not stored?** DST-observing regions shift by 1 hour twice per year:

- New York winter: 2:30 AM EST = 7:30 UTC
- New York summer: 2:30 AM EDT = 6:30 UTC
- A stored `schedulerHour: 7` would run at 3:30 AM local in summer — **silent drift**

Runtime computation using `Intl.DateTimeFormat` handles DST automatically. Zero drift. Zero recalculation.

### How It Works

1. **CF runs every hour** at :30 (Cloud Scheduler: `30 * * * *`)
2. **Reads storesSummary** (1 Firestore read)
3. **For each store with `timeZone`:** Compute local hour/minute now via `Intl.DateTimeFormat`
4. **Match:** local time is in the `businessDayEndTime + 150 minutes` settlement window
5. **Fallback:** Stores without `timeZone` use stored `schedulerHour`, derived from `businessDayEndTime` in UTC
6. **Early exit** if 0 stores match (no wasted compute)

### Data Flow

```
Store Creation / Update
  → Save timeZone to store doc (e.g., 'Asia/Kolkata')
  → Save businessDayEndTime to store doc (e.g., '03:00')
  → Sync timeZone + businessDayEndTime + schedulerHour fallback to storesSummary

Cloud Function (runs every hour at :30):
  → Reads storesSummary (1 read)
  → For store with timeZone='Asia/Kolkata' and businessDayEndTime='03:00':
       settlement window starts at 05:30 local
       if now is in that hourly window → process this store
  → DST changes? Intl.DateTimeFormat handles it automatically
```

### Storage

| Location                                       | Field           | Type            | Purpose                                 |
| ---------------------------------------------- | --------------- | --------------- | --------------------------------------- |
| `stores/{sId}`                                 | `timeZone`      | `string` (IANA) | Primary — DST-safe runtime source       |
| `stores/{sId}`                                 | `businessDayEndTime` | `string` (`HH:mm`) | Owner-configured analytics day cutoff |
| `stores/{sId}`                                 | `schedulerHour` | `number` (0-23) | UTC fallback derived from business-day cutoff |
| `platformSummary/storesSummary → stores.{sId}` | `timeZone`      | `string` (IANA) | CF reads this for runtime computation   |
| `platformSummary/storesSummary → stores.{sId}` | `businessDayEndTime` | `string` (`HH:mm`) | CF reads this without fetching every store |
| `platformSummary/storesSummary → stores.{sId}` | `schedulerHour` | `number` (0-23) | CF fallback                             |

### Auto-Detection

When a store is created or updated with a `timeZone`:

- `timeZone` synced to storesSummary (primary scheduling source)
- `businessDayEndTime` synced to storesSummary (primary business-day source)
- `computeSchedulerHour(timeZone, businessDayEndTime)` also stored as fallback
- Runtime: CF uses `timeZone` first, `schedulerHour` only if `timeZone` missing

### Multi-Outlet Inheritance

When creating an outlet store:

- `timeZone`, `businessDayEndTime`, and `schedulerHour` can be inherited from the master store
- If master has `businessDayEndTime: 03:00`, outlets use the same business-day cutoff unless overridden
- Outlet can override independently if needed

---

## 3. Task Inventory

### Per-Store Tasks (run inside store iteration loop)

| Task                    | Feature Flag                    | Cost/Store         | Description                                |
| ----------------------- | ------------------------------- | ------------------ | ------------------------------------------ |
| Project index read      | Always                          | 1 read             | Reads `platformSummary/projects_{sId}` to avoid querying every project |
| Store execution lease   | Each scheduled/manual store attempt | 2 transaction reads + 2 writes for an admitted run; 1 read and 0 writes when another current owner is rejected | One acquisition and one owner-fenced completion under `_system`; no new collection or index |
| Decision Blocks scoring | Always                          | Active projects only | Precompute DI block candidates per project |
| Menu Intelligence       | Always                          | Active projects only | Compute intelligence state per project     |
| OBP Analytics           | `ENABLE_OBP_ANALYTICS`          | Store/date scoped  | Settled before menu analytics in same lock |
| Menu + Customer App Analytics | Always                    | Store/date scoped  | Uses daily docs queried by `tId`, `sId`, `grain`, `localDate` |
| Dashboard read models  | Always                          | 1 write per settled surface/project with data | Writes `{tId}_{sId}_{projectId}_dashboard_summary` for low-read owner dashboards |
| Store enrichment        | `ENABLE_STORE_TRUTH_CONFIDENCE` | 0 extra reads      | Piggybacked on project reads               |

### Platform-Wide Daily Tasks

The scheduler still wakes hourly so each store can settle after its own local
business day. Platform-wide scans do not follow that hourly cadence. A
transactional `_system/decisionBlocksPlatformDaily` lease admits at most one
successful suite per UTC day, permits one concurrent owner, and retries a failed
suite only after the bounded retry delay. Completion transactionally verifies
the current lease-owner token, so an expired owner cannot publish stale
completion/failure state over a replacement run. The daily suite can run even when no
store is due in that hour; store-local settlement remains independent.

| Task | Feature Flag | Cost shape | Description |
| --- | --- | --- | --- |
| Authority Maturation | Always | document-ID pages of at most 500 rows under the daily lease | Strictly projects owner-control aggregates, isolates malformed rows, computes Phase 1/2/3 progression, and exact-replaces the daily insight summary |
| Menu Drift Metrics | Always | bounded daily store/project/change-log pages | 30-day rolling drift counters |
| Guest Feedback Retention | `ENABLE_GUEST_FEEDBACK_RETENTION` | bounded expired-row query/deletes | 90-day privacy retention |
| Lifecycle Messaging | Always | bounded subscription/message queries | renewal reminders, suspension warnings, retry, digest |
| Special Menu Recovery | `ENABLE_SPECIAL_MENU_SWITCHING` | once for each due-store cohort | fallback marker repair; precise transitions use the two-minute maintenance task |
| Extraction Learning | `ENABLE_EXTRACTION_LEARNING` | one bounded daily platform pass | owner correction aggregation |
| Store Truth Confidence | `ENABLE_STORE_TRUTH_CONFIDENCE` | one bounded daily platform pass | composite reliability score |
| Staleness Check | `ENABLE_STALENESS_CHECK` | one bounded daily platform pass | 90-day reconfirmation detection |

Subscription reconciliation, reseller expiry, retention cleanup, precise
special-menu transitions, and other operational tasks use
`menulistMaintenanceScheduler`, where each task has its own cadence and lease.
Answerlattice intelligence runs only in its isolated Functions project.

---

## 4. Cost Analysis

### Invocation Shape

| Scenario | Store-local work | Platform-wide work |
| --- | --- | --- |
| No store due; daily suite already complete | one summary/lease admission path, then exit | none |
| Stores due; daily suite already complete | only those stores | none |
| No store due; daily suite first eligible run | none | one daily suite |
| Stores due; daily suite first eligible run | only those stores | one daily suite |

Do not put currency estimates in this architecture guide. Real spend comes from
Cloud Billing export; operation counts and provider calls come from Cost
Posture and scheduler run logs.

### Cost Optimizations Applied

1. **storesSummary pattern** — 1 read instead of N store reads
2. **Runtime timezone filtering** — Only process stores whose local hour = 2 AM
3. **Early exit** — Skip entire run if 0 stores match
4. **Piggybacked enrichment** — Store truth data collected during project reads (0 extra reads)
5. **Batch writes** — Store enrichment collected in loop, written once at end
6. **Dynamic imports** — Feature-flagged tasks use `await import()` to avoid cold start bloat
7. **DST-safe** — No stored UTC hour to drift; runtime computation via `Intl.DateTimeFormat`
8. **Project summary index** — Active project IDs come from `platformSummary/projects_{sId}`; full project docs are fetched only for active schedulable projects
9. **Store/date analytics query** — Daily analytics docs include `tId`, `sId`, `grain`, and `localDate`, so settlement reads only the docs for that store/date instead of scanning all store analytics history
10. **Analytics-first store flow** — OBP/menu/customer-app settlement completes before Decision Blocks and Menu Intelligence, so intelligence never runs on stale settlement state
11. **Dashboard read-model docs** — Owner dashboards read one settled summary doc per surface/project instead of rebuilding WTD/MTD/4-week views from daily docs on every visit
12. **Compact deep analytics rows** — Menu dashboard summary stores capped `daily30d` rows for recent trend/device/location/intent cards; older owner-selected ranges are not rebuilt from daily docs on the owner client
13. **Intelligence input read model** — Menu settlement writes `{tId}_{sId}_{projectId}_intelligence_7d`; Decision Blocks and Menu Intelligence read that one doc instead of querying 7 daily docs per project
14. **Scheduler-cycle local cache** — Owner-side settled analytics cache invalidates after the next expected store-local scheduler completion window, not at midnight
15. **Idempotent lifetime rollups** — Summary docs are checked before lifetime increments, preventing duplicate scheduled/manual runs from inflating totals
16. **Monthly TTL cleanup** — Daily analytics cleanup runs during monthly settlement instead of every night for every project
17. **Platform daily lease** — Global scans run once per UTC day instead of once for every populated timezone hour; a failed suite waits before a bounded retry. Due-store Special Menu marker recovery stays outside this lease because it must follow every timezone cohort.

---

## 5. File Map

### Core

| File                                     | Purpose                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `functions/src/decisionBlocksScoring.ts` | MenuList store-EOD entry point — unified MenuList scheduler |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts` | MenuList operational maintenance scheduler with per-task leases |
| `functions/src/aggregateCustomerAnalytics.ts` | Menu + Customer App analytics settlement helpers |
| `functions/src/analytics/dashboardSummaryAggregation.ts` | Menu and Customer App owner-dashboard read-model writer |
| `functions/src/analytics/obpAnalyticsAggregation.ts` | OBP analytics settlement helper |
| `functions/src/constants/features.ts`    | All `FUNCTION_FLAGS` for task gating           |
| `src/database/platformSummary/index.ts`  | `StoreSummaryData` type + sync functions       |
| `src/database/analytics/index.ts`        | Daily analytics write metadata used by scheduler queries |
| `src/lib/utils/schedulerHour.ts`         | `computeSchedulerHour()` — client-side         |
| `functions/src/utils/schedulerHour.ts`   | `computeSchedulerHour()` — server-side         |

### Task Modules (imported dynamically)

| File                                                  | Task                        |
| ----------------------------------------------------- | --------------------------- |
| `functions/src/analytics/authorityMaturation.ts`      | Authority Maturation        |
| `functions/src/analytics/menuDriftMetrics.ts`         | Menu Drift Metrics          |
| `functions/src/analytics/guestFeedbackRetention.ts`   | Guest Feedback Retention    |
| `functions/src/analytics/extractionLearning.ts`       | Extraction Learning Loop    |
| `functions/src/analytics/storeTruthConfidence.ts`     | Store Truth Confidence      |
| `functions/src/analytics/stalenessCheck.ts`           | Periodic Staleness Check    |
| `functions/src/analytics/obpAnalyticsAggregation.ts`  | OBP Analytics               |
| `functions/src/messaging/messagingEngine.ts`          | Lifecycle Messaging         |
| `functions/src/schedulers/menuJobCleanup.ts`          | Maintenance extraction cleanup tasks |
| `functions/src/schedulers/messagingSessionCleanup.ts` | Maintenance messaging session cleanup |

### Deprecated

| File                                          | Status                         | Reason                                                            |
| --------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `functions/src/schedulers/masterScheduler.ts` | **DEPRECATED** as scheduled CF | Tasks migrated to decisionBlocksScoring.ts. Manual triggers kept. |
| Standalone `cleanupStuckMenuJobs`, `cleanupOldMenuJobs`, `msgIntakeProcessor`, `msgSessionCleanup`, `alertEscalation`, `aggregateDailyChatStats` scheduled exports | **DEPRECATED** | Tasks migrated to `menulistMaintenanceScheduler`; manual callables remain where applicable. |

---

## 6. Adding a New Nightly Task

1. Decide the cadence from behavior, not convenience:
   - store-EOD analytics/intelligence belongs inside the store-local loop;
   - platform-wide analytics/intelligence belongs behind the existing platform
     daily lease and in `PLATFORM_DAILY_TASK_NAMES`;
   - operational cleanup, retry, provider, or maintenance work belongs in
     `menulistMaintenanceScheduler` with its own cadence and lease.
2. Create one bounded task function and document reads, writes, deletes,
   provider calls, maximum pages, retry behavior, and failure observability.
3. Add a Functions flag defaulting off when the task is a new capability.
4. Use stable failure codes and bounded diagnostic context. Never persist or log
   raw provider or exception messages.
5. Add source and emulator regression coverage.
6. Run `npm run verify:functions-deploy-preflight`, then deploy only affected
   MenuList Functions to `menulist-qa` through
   `__docs__/production-readiness/external-certification-runbook.md` Gate 1.
   Production requires QA evidence and explicit approval.

**Rules:**

- Prefer dynamic import (`await import()`) for optional task modules
- Always wrap in try/catch — one task failure must NOT block others
- Always push to `taskResults` (success, failed, or skipped)
- New capabilities use a feature flag defaulting off
- MenuList store-EOD tasks stay in `decisionBlocksScoring.ts`
- Different-cadence operational work stays in `menulistMaintenanceScheduler`
- For Answerlattice work, add the task in `functions-answerlattice/`, not in this MenuList scheduler

---

## 7. Observability

### Run Logs

Every run writes a time-bounded `schedulerRunLogs` document:

- Trigger type (scheduled vs manual)
- Start/end timestamps + duration
- Per-task breakdown (name, status, duration, details)
- Error details (capped at 50)
- `expiresAt` for configured retention cleanup

The run-log consumer contract includes both store-EOD and consolidated maintenance task names. An all-failed maintenance attempt is stored as `failed`, not `partial`; mixed attempted outcomes are `partial`. Operator “Runs (7d)” uses an exact count aggregation while task/error details remain bounded recent-row projections.

### Telegram Alert

Every run sends a Dead Man's Switch telegram alert:

- Store/project counts
- Success/fail/skip counts
- Intelligence results
- Duration
- If this alert doesn't arrive → scheduler didn't complete

### Sentry / Firebase Logs

Analytics settlement uses targeted logs only. The scheduler records Sentry-backed warnings/errors for:

- Store/date settlement failure with `tId`, `sId`, `settlementDate`, and phase
- Project aggregation failure with `projectId`
- OBP and menu dashboard-summary rebuilds from daily docs
- Weekly/monthly rollup cache misses that fall back to daily-doc reads
- Late-event correction applied for menu, Customer App, or OBP daily rows
- Missing/stale `intelligence_7d` snapshots
- Malformed scheduler-hour timezones that fall back to the UTC settlement hour through bounded `scheduler_hour_timezone_validation_failed` / `SCHEDULER_HOUR_TIMEZONE_VALIDATION_FAILED` diagnostics

Successful per-event customer tracking is not logged. Successful nightly loops are visible through `schedulerRunLogs` and Telegram, not Sentry issue spam.

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

### Answerlattice Scheduler Scale

Answerlattice scale is managed separately in `functions-answerlattice/`. It now has its own centralized scheduler (`functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts`) behind the existing `answerlatticeNightly` export. Answerlattice uses the same high-level discipline as MenuList: one scheduled export, tenant/workspace summary discovery, runtime timezone + EOD filtering, and per-workspace/date locks. It does not run inside the MenuList scheduler and does not use MenuList restaurant-specific defaults.

---

## Version History

| Date       | Change                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 2026-03-03 | DST-safe runtime timezone computation (replaces stored schedulerHour comparison)                   |
| 2026-05-25 | Added Answerlattice centralized scheduler note: separate product scheduler with one scheduled export, timezone/EOD filtering, and workspace/date locks |
| 2026-03-03 | Added store mismatch telemetry (expected vs processed count)                                       |
| 2026-03-03 | Timezone-aware scheduling (hourly + store timezone filter)                                         |
| 2026-03-03 | Merged masterScheduler tasks (feedback intelligence, KB quality, weekly narrative, health signals) |
| 2026-05-11 | Reconfirmed product boundary: Answerlattice nightly lives in `functions-answerlattice/`, not MenuList scheduler |
| 2026-03-03 | Removed duplicate answerlatticeNightly CF from MenuList schedulers                                      |
| 2026-03-03 | Initial architecture documentation                                                                 |
