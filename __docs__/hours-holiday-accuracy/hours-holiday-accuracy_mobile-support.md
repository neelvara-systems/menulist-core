# Working Hours, Holidays, and Time Slots — Mobile Support

**Status:** MobileShell parity implemented

**Last verified:** July 30, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This mobile-support doc is source-gated mobile working-hours evidence only; Hours mobile release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated mobile working-hours and Today quick-hours save QA, customer-facing public menu/OBP hours output QA, cache/deploy evidence for store-output writes, and production-host smoke.

## Source Gate

Run `npm run verify:working-hours-boundary`, `npm run test:time-slot-data-flow`, and `npm run verify:mobile-shell-route-map`.

## Current Screens

| Flow | Screen | Contract |
| --- | --- | --- |
| Current status and quick edit | `MobileHoursScreen` | Exact-store remount; store-timezone weekday/status; minute refresh; one-day patch; attempt-owned optimistic rollback |
| Full regular week | `MobileWorkingHoursEditScreen` | Exact-store remount; seven days; overnight accepted; only changed days persisted; removed days deleted |
| Special dates | `MobileSpecialHoursManager` inside Working Hours | Store-local date; closed/different hours; optional occasion; acknowledged add/edit/remove |
| Reusable category windows | `MobileTimeSlotsScreen` | Shared validation; overlaps allowed; exact-scope settlement; durable cascade recovery; context refresh |

`MobileWorkingHoursEditScreen` and `MobileTimeSlotsScreen` are More sub-screens. Today remains the normal daily entry. No mobile route bypass, reload, desktop escape, or second data loader is introduced.

## UX and Failure Rules

- Controls use the current Tailwind/mobile component layer and 44px owner actions.
- Owner copy distinguishes regular weekly hours from Temporary Status.
- Equal or malformed clock endpoints are rejected before save.
- The saved toast appears only after `assertStoreUpdateSucceeded()`.
- Failed optimistic Today/full-hours mutations restore prior `workingHours` and `hoursLastUpdatedAt`.
- If today has a special-date entry, Today shows and edits that exact date instead of changing the hidden regular weekday.
- Special-date writes wait for acknowledgement before updating owner context or showing success.
- Upcoming special dates appear first. Past dates appear newest-first below them and can be removed, but not reopened in an editor that only accepts current/future dates.
- Rollback requires the same tenant, store, and optimistic update timestamp. Switching stores or a newer same-store save prevents stale restore, toast, dialog, or loading settlement.
- Time-slot success appears only after the store write and required project cascade acknowledge success.
- Edit/delete atomically leaves an operation marker with store truth. A switch or interruption cannot settle into the next store; returning to the exact store attempts bounded recovery before another preset mutation.
- No raw exception/provider text is shown.

## Parity Notes

- Desktop and mobile both support overnight hours and overlapping presets.
- Both use the same store DAL, cache invalidation, preset normalization, exact-scope category reconciliation, and operation-owned recovery marker.
- Desktop and mobile special-date managers share the same date/range/label normalization and 64-entry bound.
- Mobile Today derives `todayKey` from the store timezone, not the handset timezone.
- Legacy multiple ranges are displayed from the first range in current editors; untouched days remain byte-preserved. Public readers can render all valid ranges.

## Pending Manual QA

- Store timezone differs from handset timezone near midnight.
- Friday overnight status at Friday 23:00, Saturday 01:00, and Saturday 02:00.
- Full-hours save success/failure/rollback and closed-day deletion.
- Special date add/edit/remove, all-day closure, different hours, and current-date Today quick edit.
- Preset create/edit/delete and category visibility at exact end time.
- iOS Safari and Android Chrome inside the installed PWA shell.
