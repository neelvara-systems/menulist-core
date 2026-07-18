# Working Hours, Holidays, and Time Slots — Implementation

**Status:** Current source map

**Last verified:** July 16, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This implementation doc is source-gated working-hours runtime evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.

## Source Gate

This implementation doc is source-gated by `npm run verify:working-hours-boundary`. Historical blueprint sections below are not launch approval; the superseded blueprint is archived under `_archive/pre-2026-07-16/`.

## Canonical Weekly-Hours Runtime

`src/lib/hours/hoursEngine.ts` owns parsing, normalization, store-timezone weekday resolution, status, next-opening copy, and urgent minutes-to-change.

- `normalizeWorkingHoursValue()` accepts blank/`closed`, one strict range, or comma-separated strict historical ranges.
- `parseWorkingHoursRanges()` returns bounded normalized ranges.
- `getStoreDayKey()` resolves the weekday in the store timezone with bounded fallback diagnostics.
- `getStoreStatus()` evaluates the previous day's overnight carry before today's start portions. It uses inclusive start and exclusive end.
- `getMinutesUntilStoreStatusChange()` returns only an immediate current-store-day boundary.
- Invalid configured truth logs bounded `hours_status_time_range_invalid` metadata and suppresses authority.

`src/lib/obp/hoursStatus.ts` is an adapter over this engine. It contains no second open/closed calculation.

## Write Boundary

`src/database/stores/index.tsx` normalizes `workingHours` on store create/update. Unknown weekday keys, non-record shapes, invalid clock values, equal endpoints, and malformed comma-separated content fail before Firestore. Nested delete markers remain supported for day removal.

`updateStore()` retains its existing behavior:

1. write the scoped store patch;
2. update the compact store summary when required;
3. revalidate public menu/OBP store tags;
4. advance Digital Screen content version when a relevant store-output field changed;
5. return an acknowledgement consumed by owner surfaces.

No route, collection, Function, or listener was added.

## Desktop Owner Flow

`src/components/templates/main-app/businessSettings/index.tsx` hydrates seven stable rows from the persisted map. A dirty flag prevents unrelated settings submissions from replaying hours. A changed-day set rebuilds only touched weekday values, preserving any untouched historical multiple-window day.

`WorkingHoursTab.tsx` supports copy-Monday, clear, preview, normal/overnight selection, and rejects equal endpoints. The existing shared Business Settings submission stamps `hoursLastUpdatedAt` only when the deep patch contains hours.

Time-slot changes run through `TimeSlotPresetsTab.tsx`, `updateTimeSlotPresets()`, and the project preset cascade. The parent updates local and global store context only after acknowledgement.

## Mobile Owner Flow

- `MobileHoursScreen.tsx` uses the canonical store-timezone day/status engine, refreshes its clock every minute, edits only the current store weekday, validates its range, and rolls back optimistic state on rejection.
- `MobileWorkingHoursEditScreen.tsx` rehydrates with store truth, serializes only actual edits over the existing map, detects day removals, and shows saved copy after acknowledgement.
- `MobileTimeSlotsScreen.tsx` shares strict range and overlap behavior with desktop, acknowledges store/cascade work, and refreshes global store context after success.
- All screens remain inside `MobileShell` through the existing More/Today screen contracts.

## Category Visibility

`src/hooks/useTimedCategories.ts` and `src/lib/menu/timeSlotPresetBoundary.ts` own normal and overnight category visibility, weekday restrictions, next-start computation, and range validation. `DecisionBlocks.tsx` delegates to `isWithinTimeSlot()` so recommendations cannot expose a category that the normal menu hides.

Preset references are denormalized into category snapshots. Edit/delete scans tenant/store-scoped project pages of 100, updates only projects that reference the preset, uses project transactions, and revalidates changed public project caches. This is intentionally retained because preset mutations are rare and no measured workload justifies an additional reference registry.

## Public Output

- Public menu/status badges call `getStoreStatus()`.
- OBP status delegates to the engine; today/all-day display parses validated ranges.
- `buildOpeningHours()` emits each valid range and omits malformed values.
- FAQ hours include only validated ranges.
- Output Control and trust signals consume the same saved working-hours source.

## Failure and Recovery

Hours status fallback diagnostics are bounded and contain metadata rather than raw weekly-hour payloads.
Output Control timestamp diagnostics remain bounded and suppress confidence when freshness metadata cannot be parsed safely.

- Invalid timezone: bounded diagnostic, consistent local fallback for day and minute.
- Malformed hours: no open claim; `Hours not available` on the affected status.
- Store save failure: owner surface restores previous local truth and shows fixed copy.
- Preset store/cascade failure: no local success state; retry is safe through normalized idempotent writes/transactions.
- Cache invalidation failure propagates through the existing DAL acknowledgement rather than reporting a confirmed owner save.

## Scalability Decision

The useful long-term fixes are canonical evaluation, leaf/deep patches, bounded diagnostics, no redundant reads, and existing cache reuse. A new hours collection, holiday scheduler, reference index, durable cascade ledger, or provider sync would add operational and Firebase cost without current evidence. Revisit only if project-cascade telemetry shows sustained owner-impacting latency or the product explicitly admits date exceptions.
