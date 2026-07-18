# Public Truth Monitor Add-On - Firebase Cost Tracking

**Last Updated:** July 16, 2026
**Status:** Runtime implemented

---

## Current Runtime Cost

The implemented runtime is owner-authenticated and runs only when the owner opens or refreshes Business Health.

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Summary load | 1-2 | 0 | Store data for entitlement plus summary only when entitled |
| Manual refresh | 4-5 | 1 | Store, subscription, projects summary, selected/default project, then transaction read of existing monitor summary plus one summary write; Firestore may retry a contended transaction |
| Download report | 0 | 0 | Browser-local text export from already loaded summary |
| Mobile view | 1-2 | 0 | Same summary endpoint through shared hook |

Storage/Functions/provider cost:

| Resource | Current cost |
| --- | --- |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |

Public Truth Monitor project/scope-ID admission is cost-neutral: manual refresh request validation, summary project selection, and `readPublicTruthMonitorProjectDataServer()` now use the shared Firestore document-ID guard before selected project IDs can reach scoped or legacy project reads. The server DAL requires selected, persisted, and final project IDs to exactly match their trimmed Firestore document ID before any project document ref is built, and validates session-derived store/tenant scope IDs before store reads, project-summary reads, monitor-summary reads/writes, or scoped project paths. This adds no Firestore reads/writes/deletes for valid requests, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action; malformed project or scope IDs and whitespace-mutated selected project IDs fail on the existing request/server admission path before Firestore refs.

Public Truth Monitor session-scope admission is cost-neutral: `/api/public-truth-monitor/summary`, `/api/public-truth-monitor/refresh`, and `serverPublicTruthMonitorEntitlements.ts` now normalize authenticated session tenant/store scope as exact positive numeric Firestore document IDs before tenant access checks, Business Health permission checks, store reads, subscription lookups, project summary reads, summary reads/writes, or report entry scope persistence. This adds no Firestore reads/writes/deletes for valid requests, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action; malformed, whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, reserved, empty, or path-shaped session scope fails before Firestore document access.

Concurrent refresh hardening keeps the same normal-path summary read/write count but moves both operations into one Firestore transaction. This prevents last-writer-wins history loss. Contention can cause transaction retries, so the practical cost ceiling is the normal read/write set multiplied by Firebase retry count; the stored history remains capped at six. Production rate-limit-provider failure blocks the summary/refresh route before the protected work proceeds.

## Storage

Use capped summary documents:

```txt
platformSummary/publicTruthMonitor_{storeId}
```

Allowed fields:

- latest status
- latest module summaries
- capped history array
- next scheduled check timestamp
- entitlement snapshot
- generatedBy
- audit metadata

Retention:

```txt
maximum 6 reports per store by default
```

Do not store one document per check, one document per module, or unbounded full report archives.

## Scheduler Rule

`PUBLIC_TRUTH_MONITOR_SCHEDULER_MODE` is `manual`.

Background recurrence is not enabled in this implementation slice. If enabled later, use the existing MenuList maintenance scheduler with a per-task lease. Do not add a standalone scheduled Cloud Function by default.

## Hard Boundaries

- No Firestore rules change.
- No client direct read of `publicTruthMonitor_{storeId}`.
- No Storage write.
- No Cloud Function scheduler change.
- No provider call.
- No external URL fetch.
- No canonical MenuList truth mutation from monitor output.
