# Canonica Scheduler Architecture

Canonica scheduled work runs through one centralized scheduler entry point in `functions-canonica/`.

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

- `canonicaNightly` remains the deployed scheduled export name for compatibility.
- `canonicaNightly` now delegates to `runCanonicaMasterScheduler()`.
- `triggerCanonicaNightly` remains the manual recovery trigger and uses the same master scheduler path.
- The master scheduler runs hourly at `:30 UTC`, checks each workspace's `timeZone` and `businessDayEndTime`, then processes only due workspaces.
- Per-workspace state and locks live in `platformSummary/canonicaNightlyState_*` and `platformSummary/canonicaNightlyLock_*`.
- The actual governance batch remains in `runCanonicaNightly()` so drift, mutation, coverage, friction, graph, predictive, and compiled-context repair logic stay in one bounded batch.

