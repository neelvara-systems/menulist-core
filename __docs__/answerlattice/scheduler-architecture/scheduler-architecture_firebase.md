# Answerlattice Scheduler Architecture Firebase Notes

## Scheduled Function Cost

Answerlattice uses one scheduled export:

- `answerlatticeNightly`

The function runs hourly to support global timezones. Tenant discovery reads the legacy aggregate plus at most 64 bounded registry-shard documents, then exits without tenant work when no workspace is due. This keeps Cloud Scheduler job count at one, avoids one scheduled function per feature, and removes the single-document write hotspot from tenant lifecycle updates.

## Firestore Reads

| Operation | Normal cost |
| --- | --- |
| Hourly no-due tick | Up to 65 registry reads: one legacy aggregate plus at most 64 shards |
| Due workspace selection | Same bounded registry read + one lock/state transaction per due workspace |
| Governance batch | Existing bounded Answerlattice reads, scoped to due tenants only |
| Compiled context repair | Only reads approved sources when source versions differ |
| Owner Daily Governance panel | 1 store read + 2 platformSummary reads + 5 capped scheduler log reads |

Merged registry entries are accepted only when they have exact Answerlattice product, map-key/embedded-scope agreement, active/entity-ready booleans, and canonical positive safe-integer identity. Rejected entries do not create tenant work. When every entry is rejected, the existing bounded entity fallback may read up to its maintained 1,000-document ceiling and repair the sharded summary with numeric identity.

The shared app and Functions shard calculators use FNV-1a over the canonical `tId_sId` key and fold high bits before modulo-64 selection. This prevents correlated numeric tenant/store sequences from occupying only half the shards. The behavioral contract verifies that a correlated 2,000-workspace sequence reaches all 64 shard IDs, and app/Functions implementations must remain identical.

## Firestore Writes

| Document | Purpose |
| --- | --- |
| `platformSummary/answerlatticeTenantsSummaryShard_{00..63}` | Bounded tenant registry partitions with `summaryType=answerlattice_tenant_registry_shard`; lifecycle writes touch one shard and bulk repair writes at most 64 in one batch |
| `platformSummary/answerlatticeTenantsSummary` | Legacy read-only compatibility aggregate during migration; new lifecycle writers target shards |
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
- Preserve registry lifecycle on profile-only updates; only onboarding/entity lifecycle producers may explicitly set `active` or `hasEntities`.
