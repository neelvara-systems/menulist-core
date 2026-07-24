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
- AI provider health state is exact and bounded: the daily Gemini smoke check replaces its summary with one allowlisted success or failure shape, validates prior completion before a daily skip, prunes stale opposite-state/private fields, and keeps provider failures distinct from fixed-code persistence failures.
- The master scheduler runs hourly at `:30 UTC`, checks each workspace's `timeZone` and `businessDayEndTime`, then processes only due workspaces.
- Per-workspace state and locks live in `platformSummary/answerlatticeNightlyState_*` and `platformSummary/answerlatticeNightlyLock_*`.
- The actual governance batch remains in `runAnswerlatticeNightly()` so drift, mutation, coverage, friction, graph, predictive, and compiled-context repair logic stay in one bounded batch.
