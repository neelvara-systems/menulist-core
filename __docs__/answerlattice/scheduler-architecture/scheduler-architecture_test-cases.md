# Answerlattice Scheduler Architecture Test Cases

## Code

- `functions-answerlattice` TypeScript build passes.
- Root TypeScript check passes.
- `git diff --check` passes.

## Scheduler

- No-due hourly tick reads tenant summary and exits without running all tenants.
- Due workspace acquires `answerlatticeNightlyLock_{tId}_{sId}_{YYYY-MM-DD}` before running.
- Duplicate scheduled/manual overlap skips when the task lease is held.
- Manual trigger calls the same `runAnswerlatticeMasterScheduler()` path.
- Existing `answerlatticeNightly` export name still exists.

## Settings

- GET workspace profile returns `timeZone` and `businessDayEndTime`.
- PUT workspace profile validates `HH:mm`.
- GET/PUT workspace profile require Answerlattice management scope.
- PUT workspace profile syncs `platformSummary/answerlatticeTenantsSummary`.
- Bundle product summaries include scheduler timezone/EOD metadata.

## Owner Dashboard

- Activation renders the Daily Governance panel in the right rail.
- `/api/answerlattice/operations/status` returns scheduler status from compact summaries and capped run logs.
- Recent governance runs are filtered to the current `tId/sId`; global scheduler logs are not shown as workspace runs.
- Raw scheduler errors, raw workspace details, and global run totals are not returned to the owner dashboard.
- The owner panel links to Settings for timezone/EOD edits and does not expose a manual full-scheduler trigger.

## MCP

- `/api/answerlattice/mcp` stays feature-flag gated.
- Tool registration lives in `src/lib/answerlattice/mcpTools.ts`.
- Tool calls are rate-limited per tenant/store session.
- `report_missing_context` records an aggregate signal without requiring a ready compiled bundle.
