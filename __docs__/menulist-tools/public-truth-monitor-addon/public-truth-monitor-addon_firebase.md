# Public Truth Monitor Add-On - Firebase Cost Tracking

**Last Updated:** July 4, 2026
**Status:** Runtime implemented

---

## Current Runtime Cost

The implemented runtime is owner-authenticated and runs only when the owner opens or refreshes Business Health.

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Summary load | 1-2 | 0 | Store data for entitlement plus summary only when entitled |
| Manual refresh | 4-5 | 1 | Store, subscription, projects summary, selected/default project, existing monitor summary, then one summary write |
| Download report | 0 | 0 | Browser-local text export from already loaded summary |
| Mobile view | 1-2 | 0 | Same summary endpoint through shared hook |

Storage/Functions/provider cost:

| Resource | Current cost |
| --- | --- |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |

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
