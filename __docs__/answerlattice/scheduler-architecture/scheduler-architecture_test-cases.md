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
- Each instrumented tenant task shares one observer and persists its bounded source-window snapshot on both success and failure.
- Duplicate source/window observations aggregate operation count, documents returned, configured limits, and saturation.
- Invalid observations are ignored and more than eight unique windows cannot expand a task run log.
- Source-window telemetry adds no Firestore query or extra run-log write.
- The platform intake monitor validates tuple shape, returns at most 80 windows, and labels values as logical observations rather than billed reads.
- `npm run test:answerlattice-scheduler-read-telemetry` covers aggregation, saturation, invalid input, the eight-window cap, and snapshot isolation.
- `npm run test:answerlattice-master-scheduler:emulator` runs the real master scheduler against Firestore and Storage emulators with two due tenants, one active non-due tenant, and one inactive tenant.
- The combined gate proves one stale reservation is refunded exactly once, its pointer is deleted, its operation is marked refunded, and a repeat tick neither refunds nor reruns completed tenant dates.
- An expired task lease is reclaimable; an active task lease skips only its own task while independent tasks continue.
- Malformed reservation evidence yields a partial scheduler result, retains forensic evidence, mints no credits, and does not fail provider-health or governance tasks.
- Completed nightly logs persist `status: success`, flat compatibility summaries, and detailed `tenantRunsByScope` evidence without unsupported nested arrays.
- Owner Operations reads flat `taskCount`/`errorCount`; the platform intake monitor reads detailed scope-keyed task/read-window maps and remains compatible with legacy array logs.
- Hosted QA proves the first scheduled execution completes 20 tasks for each of two due tenants, emits zero tenant errors, rebuilds a non-empty compiled context bundle, indexes the fixture entity, writes trust and intake summaries, rebuilds predictive cache, and refunds one valid stale reservation exactly once.
- The active non-due and inactive controls never receive nightly state. The next untouched hourly scheduler attempt advances the master state while matching governance-run count remains one and recovery reports zero refunds.
- Both ascending scheduler indexes must read back `READY`; both scheduler Functions must read back `ACTIVE`; the Cloud Scheduler job must read back `ENABLED` at `30 * * * *` UTC with an empty status object.
- QA cleanup must remove every owned entity, store, subscription, reservation, operation, nightly state, registry entry, owned run log, and compiled-context Storage prefix. No production fixture is allowed.

## Settings

- GET workspace profile returns `timeZone` and `businessDayEndTime`.
- PUT workspace profile validates IANA timezone, exact `HH:mm`, HTTP(S)-only product URL, and expected revision.
- GET/PUT workspace profile require Answerlattice management scope.
- PUT workspace profile atomically syncs the store, one tenant-summary shard, compiled source version, and stale manifest.
- A stale profile revision returns conflict without overwriting current timing.
- An unchanged profile writes nothing and does not increment the compiled source version.
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
