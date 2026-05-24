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
- PUT workspace profile syncs `platformSummary/canonicaTenantsSummary`.
- Bundle product summaries include scheduler timezone/EOD metadata.

## MCP

- `/api/canonica/mcp` stays feature-flag gated.
- Tool registration lives in `src/lib/canonica/mcpTools.ts`.
- Tool calls are rate-limited per tenant/store session.

