# Canonica Scheduler Architecture Spec

## Purpose

Canonica needs one long-term scheduled-work control plane, not one scheduled Cloud Function per feature. Scheduled work must stay cost-aware, timezone-aware, and tenant-isolated.

## Requirements

- One scheduled Canonica Cloud Function owns routine scheduler ticks.
- Manual recovery uses the same scheduler path.
- Tenant discovery reads `platformSummary/canonicaTenantsSummary` first.
- Workspaces run after their own support day ends, using `timeZone` and `businessDayEndTime`.
- Duplicate scheduled/manual runs cannot process the same workspace/date at the same time.
- Normal skipped ticks should not write noisy run logs.
- Feature work such as compiled context repair must be registered inside the Canonica batch, not added as a separate scheduled function.

## Non-Goals

- Canonica must not move back into the MenuList scheduler.
- Canonica must not use MenuList restaurant defaults as product doctrine.
- Canonica must not process every active tenant on every hourly tick.
- Canonica must not add separate scheduled functions for every new governance loop.

## Owner Setting

The Canonica workspace profile stores:

- `timeZone`
- `businessDayEndTime`

Default behavior is `UTC` and `00:00`, which means the scheduler runs after the calendar day closes plus the settlement buffer.

