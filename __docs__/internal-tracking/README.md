# Internal Tracking System

> **Purpose**: Silent, backend-only infrastructure for system observation and memory.
> **Visibility**: INTERNAL ONLY - No owner/user exposure.

---

## Documents in This Folder

| Document                               | Purpose                                               | Status            |
| -------------------------------------- | ----------------------------------------------------- | ----------------- |
| `menulist-internal-tracking-system.md` | Master tracking philosophy, allowed/forbidden metrics | Reference         |
| `mol-v0-implementation-plan.md`        | Menu Observation Layer implementation spec            | Sprint 1 Complete |

---

## What This System Does

1. **Observes** - Tracks menu changes (prices, availability, items)
2. **Remembers** - Stores change history immutably
3. **Detects** - Computes drift patterns internally
4. **Stays Silent** - Zero UI, zero owner visibility

---

## Core Doctrine

> **"The system keeps working when no one is watching."**

| Law   | Statement                              |
| ----- | -------------------------------------- |
| Law 1 | Visible autonomy kills trust           |
| Law 2 | Protection beats optimization          |
| Law 3 | Observation before intelligence        |
| Law 4 | Approval workflows kill infrastructure |

---

## Allowed Tracking Categories (from Internal Tracking Spec)

| Category                | What                               | MOL v0 Status  |
| ----------------------- | ---------------------------------- | -------------- |
| A: System Health        | AI response latency, error rates   | Future         |
| B: Decision Execution   | Success rates of system decisions  | Future         |
| C: Authority Maturation | Owner engagement patterns          | Future         |
| D: Owner Intervention   | **Menu changes by owners**         | ✅ Implemented |
| E: Output Stability     | **Drift counters, mutation rates** | ✅ Implemented |
| F: Cost & Performance   | Firebase costs, function telemetry | ✅ Implemented |

---

## Forbidden Tracking (NEVER)

- Feature popularity rankings
- Click/tap tracking
- Engagement scores
- NPS or satisfaction metrics
- Session duration
- Feature discovery funnels

---

## Implementation Status

### Sprint 1 (Complete)

- ✅ Types: `src/types/menuObservation.ts`
- ✅ DAL: `src/database/menuChangeLog/index.ts`
- ✅ Change Detection: `src/database/projects/index.ts`
- ✅ Feature Flags: `ENABLE_MENU_OBSERVATION`, `MENU_OBSERVATION_DEBOUNCE_MS`

### Sprint 2 (Complete)

- ✅ Cloud Function: `functions/src/analytics/menuDriftMetrics.ts`
- ✅ Scheduler Integration: Added to `decisionBlocksScoring.ts`
- ✅ Telemetry Logging: Cost telemetry per Category F

---

## To Enable MOL v0

```typescript
// In src/config/features.ts
ENABLE_MENU_OBSERVATION: true,
```

**Note**: The current runtime enables MOL and uses compact summary mode by default. Detailed per-item mode remains an explicit higher-write diagnostic option.

---

## Related Code Files

| File                                  | Purpose                      |
| ------------------------------------- | ---------------------------- |
| `src/types/menuObservation.ts`        | All MOL types                |
| `src/database/menuChangeLog/index.ts` | Change log DAL               |
| `src/database/menuChangeLog/menuChangeLogDiagnostics.ts` | Bounded MOL failure diagnostics |
| `src/data/shared/menuDriftContribution.ts` | Bounded summary/detailed drift compatibility contract |
| `src/database/projects/index.ts`      | Change detection interceptor |
| `src/config/features.ts`              | Feature flags                |
| `src/constants/database.ts`           | Collection constants         |

**Runtime note**: MOL write paths remain non-blocking. Tracking, scoped tracking, batch-session, invalid-entry, and Firestore write failures log bounded `menu_change_log_*` diagnostics. Every pending detailed entry snapshots its validated tenant/store scope when queued; `flushPendingChanges()` drains those stored scopes and never re-resolves a possibly switched active session. Completed revision summaries and publish events bypass replacement-style debouncing so two completed operations inside five seconds cannot overwrite one another.

Default summaries carry a bounded, per-item price/availability contribution list for the nightly drift task. The Functions mirror validates the same contract, scans each store's 30-day ledger once with stable timestamp/document pagination, partitions events by active project, and writes metrics in bounded batches. Derived item documents whose events leave the rolling window are deleted, and 180-day price staleness is marked unavailable when the 30-day source window cannot prove it. If a single revision exceeds the compact contribution cap, only overflow price/availability events fall back to the existing detailed event path.

---

**Last Updated**: June 30, 2026
**Version**: 1.0
