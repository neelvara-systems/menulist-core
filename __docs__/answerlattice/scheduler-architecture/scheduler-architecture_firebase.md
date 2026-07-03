# Answerlattice Scheduler Architecture Firebase Notes

## Scheduled Function Cost

Answerlattice uses one scheduled export:

- `answerlatticeNightly`

The function runs hourly to support global timezones, but it exits after one tenant-summary read when no workspaces are due. This keeps Cloud Scheduler job count at one and avoids one scheduled function per feature.

## Firestore Reads

| Operation | Normal cost |
| --- | --- |
| Hourly no-due tick | 1 tenant-summary read |
| Due workspace selection | 1 tenant-summary read + one lock/state transaction per due workspace |
| Governance batch | Existing bounded Answerlattice reads, scoped to due tenants only |
| Compiled context repair | Only reads approved sources when source versions differ |
| Owner Daily Governance panel | 1 store read + 2 platformSummary reads + 5 capped scheduler log reads |

## Firestore Writes

| Document | Purpose |
| --- | --- |
| `platformSummary/answerlatticeSchedulerState` | Master scheduler task state |
| `platformSummary/answerlatticeSchedulerTaskLock_governance_nightly` | Global task lease |
| `platformSummary/answerlatticeNightlyState_{tId}_{sId}` | Workspace scheduler state |
| `platformSummary/answerlatticeNightlyLock_{tId}_{sId}_{YYYY-MM-DD}` | Workspace/date lease |
| `platformSummary/answerlatticeAiProviderHealth` | Daily Gemini smoke-check status with fixed failure codes and bounded source metadata |
| `answerlattice_schedulerRunLogs/{runLogId}` | Governance batch result |

## Cost Rules

- Do not add a new Answerlattice scheduled function for routine maintenance.
- Add new routine work as a task inside the centralized Answerlattice scheduler or as a step inside `runAnswerlatticeNightly()`.
- Keep timezone/EOD settings behind Answerlattice management scope and return no-store owner responses.
- Keep owner scheduler visibility summary-backed; dashboard pages must not scan tenant source collections, run scheduler logic, or expose raw scheduler errors/global run totals.
- Keep master scheduler state diagnostics bounded; task `lastError` values should be fixed failure codes with source error name/code/status metadata stored separately.
- Keep scheduler run-log diagnostics bounded; persisted task errors should use fixed scheduler failure codes, source error name/code/status metadata, and bounded detail counts rather than raw exception text.
- Keep workflow integration adapter-check failures visible as fixed scheduler diagnostics; do not collapse config-read failures into a normal no-adapter skip.
- Keep provider health diagnostics bounded; failed health checks should store fixed failure codes and source error name/code/status metadata, never raw provider messages.
- Use Firestore TTL for retention when available instead of nightly empty cleanup scans.
- Use compact summaries before collection scans.
- Use source-version checks before compiled context rebuilds.
