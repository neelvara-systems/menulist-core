# Canonica Scheduler Architecture Firebase Notes

## Scheduled Function Cost

Canonica uses one scheduled export:

- `canonicaNightly`

The function runs hourly to support global timezones, but it exits after one tenant-summary read when no workspaces are due. This keeps Cloud Scheduler job count at one and avoids one scheduled function per feature.

## Firestore Reads

| Operation | Normal cost |
| --- | --- |
| Hourly no-due tick | 1 tenant-summary read |
| Due workspace selection | 1 tenant-summary read + one lock/state transaction per due workspace |
| Governance batch | Existing bounded Canonica reads, scoped to due tenants only |
| Compiled context repair | Only reads approved sources when source versions differ |
| Owner Daily Governance panel | 1 store read + 2 platformSummary reads + 5 capped scheduler log reads |

## Firestore Writes

| Document | Purpose |
| --- | --- |
| `platformSummary/canonicaSchedulerState` | Master scheduler task state |
| `platformSummary/canonicaSchedulerTaskLock_governance_nightly` | Global task lease |
| `platformSummary/canonicaNightlyState_{tId}_{sId}` | Workspace scheduler state |
| `platformSummary/canonicaNightlyLock_{tId}_{sId}_{YYYY-MM-DD}` | Workspace/date lease |
| `canonica_schedulerRunLogs/{runLogId}` | Governance batch result |

## Cost Rules

- Do not add a new Canonica scheduled function for routine maintenance.
- Add new routine work as a task inside the centralized Canonica scheduler or as a step inside `runCanonicaNightly()`.
- Keep timezone/EOD settings behind Canonica management scope and return no-store owner responses.
- Keep owner scheduler visibility summary-backed; dashboard pages must not scan tenant source collections, run scheduler logic, or expose raw scheduler errors/global run totals.
- Use Firestore TTL for retention when available instead of nightly empty cleanup scans.
- Use compact summaries before collection scans.
- Use source-version checks before compiled context rebuilds.
