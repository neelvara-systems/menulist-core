# Answerlattice Scheduler Architecture

Answerlattice scheduled work runs through one centralized scheduler entry point in `functions-answerlattice/`.

## Documents

- [Spec](./scheduler-architecture_spec.md)
- [Implementation](./scheduler-architecture_impl.md)
- [Firebase Cost](./scheduler-architecture_firebase.md)
- [Mobile Support](./scheduler-architecture_mobile-support.md)
- [Test Cases](./scheduler-architecture_test-cases.md)
- [Marketing](./scheduler-architecture_marketing.md)
- [Website](./scheduler-architecture_website.md)
- [Helpdoc](./scheduler-architecture_helpdoc.md)

## Current Contract

- `answerlatticeNightly` remains the deployed scheduled export name for compatibility.
- `answerlatticeNightly` now delegates to `runAnswerlatticeMasterScheduler()`.
- `triggerAnswerlatticeNightly` remains the manual recovery trigger and uses the same master scheduler path.
- Manual trigger logs and invalid-scope responses are bounded: no raw request IP, raw `tId/sId`, or local exception text is emitted from the entrypoint.
- Master scheduler task outcomes are bounded: `platformSummary/answerlatticeSchedulerState` stores fixed task failure codes plus source error name/code/status metadata instead of raw exception text.
- Governance batch diagnostics are bounded: run-log errors use fixed scheduler failure codes, scoped/global message labels, source error name/code/status metadata, and bounded detail counts instead of raw exception text or raw diagnostic objects in workflow event payloads.
- AI provider health state is exact and bounded: the daily Gemini smoke check replaces its summary with one allowlisted success or failure shape, validates prior completion before a daily skip, prunes stale opposite-state/private fields, and keeps provider failures distinct from fixed-code persistence failures. A provider request that completes is scheduler activity; only the coherent same-day no-op is reported as inactive. Persisted per-task outcomes replace their own state map so stale reasons and error details cannot leak across runs.
- The master scheduler runs hourly at `:30 UTC`, checks each workspace's `timeZone` and `businessDayEndTime`, then processes only due workspaces.
- Per-workspace state and locks live in `platformSummary/answerlatticeNightlyState_*` and `platformSummary/answerlatticeNightlyLock_*`.
- The actual governance batch remains in `runAnswerlatticeNightly()` so drift, mutation, coverage, friction, graph, predictive, and compiled-context repair logic stay in one bounded batch.
- Completed governance evidence is Firestore-safe: the run log keeps a flat `tenantRuns` summary array for compatibility and a scope-keyed `tenantRunsByScope` map for detailed tasks, diagnostics, and read windows. This avoids unsupported nested arrays and prevents completed runs from remaining falsely stuck at `running`.
- `npm run test:answerlattice-master-scheduler:emulator` is the release gate for combined behavior: two due tenants, non-due and inactive isolation, stale-credit recovery, expired and held leases, idempotent repeat ticks, malformed-evidence partial failure, compiled bundles, scheduler state, and durable run-log completion.
- The hosted release gate uses disposable QA-only scopes and two scheduler attempts. The first must complete all 20 governance tasks for both due tenants, publish non-empty compiled context, rebuild graph/trust/knowledge/predictive summaries, and recover one stale reservation exactly once. The second ordinary hourly attempt must advance scheduler state without another governance run or credit mutation. Production receives only the identical validated source and indexes; it does not receive fixtures or a forced invocation.
- Scheduler query indexes are direction-specific. Friction retention requires `answerlattice_frictionDailyStats(pId,tId,sId,date ASC)` and chat continuation requires `chatSessions(pId,tId,sId,modifiedOn ASC)`. The Admin initializer recovers the managed Storage bucket from validated `FIREBASE_CONFIG.storageBucket` when no explicit Answerlattice bucket override is present.
