# Canonica Scheduler Architecture Test Cases

## Code

- `functions-canonica` TypeScript build passes.
- Root TypeScript check passes.
- `git diff --check` passes.

## Scheduler

- No-due hourly tick reads tenant summary and exits without running all tenants.
- Due workspace acquires `canonicaNightlyLock_{tId}_{sId}_{YYYY-MM-DD}` before running.
- Duplicate scheduled/manual overlap skips when the task lease is held.
- Manual trigger calls the same `runCanonicaMasterScheduler()` path.
- Existing `canonicaNightly` export name still exists.

## Settings

- GET workspace profile returns `timeZone` and `businessDayEndTime`.
- PUT workspace profile validates `HH:mm`.
- GET/PUT workspace profile require Canonica management scope.
- PUT workspace profile syncs `platformSummary/canonicaTenantsSummary`.
- Bundle product summaries include scheduler timezone/EOD metadata.

## Owner Dashboard

- Activation renders the Daily Governance panel in the right rail.
- `/api/canonica/operations/status` returns scheduler status from compact summaries and capped run logs.
- Recent governance runs are filtered to the current `tId/sId`; global scheduler logs are not shown as workspace runs.
- Raw scheduler errors, raw workspace details, and global run totals are not returned to the owner dashboard.
- The owner panel links to Settings for timezone/EOD edits and does not expose a manual full-scheduler trigger.

## MCP

- `/api/canonica/mcp` stays feature-flag gated.
- Tool registration lives in `src/lib/canonica/mcpTools.ts`.
- Tool calls are rate-limited per tenant/store session.
- `report_missing_context` records an aggregate signal without requiring a ready compiled bundle.
