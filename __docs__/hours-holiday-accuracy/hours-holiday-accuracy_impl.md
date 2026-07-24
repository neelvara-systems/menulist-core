# Working Hours, Holidays, and Time Slots — Implementation

**Status:** Current source map

**Last verified:** July 23, 2026

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

Every owner surface additionally owns browser settlement. The complete desktop Business Settings form, mobile full-week editor, and Mobile Today screen remount by exact tenant/store and allow one relevant save per mounted scope. Captured identifiers are used for persistence; liveness/scope checks suppress delayed local state after switching stores. Mobile optimistic rollback uses the attempt timestamp as a compare-and-restore marker, so a failed older request cannot overwrite a later same-store update.

## Desktop Owner Flow

`src/components/templates/main-app/businessSettings/index.tsx` hydrates seven stable rows from the persisted map. The complete form is keyed by tenant/store and serializes saves, so every draft and post-write UI effect belongs to its source store. A dirty flag prevents unrelated settings submissions from replaying hours. A changed-day set rebuilds only touched weekday values, preserving any untouched historical multiple-window day.

`WorkingHoursTab.tsx` supports copy-Monday, clear, preview, normal/overnight selection, and rejects equal endpoints. The existing shared Business Settings submission stamps `hoursLastUpdatedAt` only when the deep patch contains hours.

Time-slot changes run through `TimeSlotPresetsTab.tsx`, `updateTimeSlotPresets()`, and `reconcileTimeSlotPresetCascade()`. Create writes only the normalized preset list. Edit/delete uses one store transaction to write the normalized list and an operation-owned `timeSlotPresetCascadePending` marker. The parent updates local and global store context only after the project cascade and exact marker clear acknowledge success.

## Mobile Owner Flow

- `MobileHoursScreen.tsx` uses the canonical store-timezone day/status engine, refreshes its clock every minute, edits only the captured current-store weekday, validates its range, and conditionally rolls back exact-scope optimistic state on rejection.
- `MobileWorkingHoursEditScreen.tsx` rehydrates/remounts with exact store truth, serializes only actual edits over a captured existing map, detects day removals, and shows saved copy only after current-scope acknowledgement.
- `MobileTimeSlotsScreen.tsx` shares strict range, overlap, durable marker recovery, and exact tenant/store settlement behavior with desktop. It refreshes global store context only after acknowledged store/cascade completion.
- All screens remain inside `MobileShell` through the existing More/Today screen contracts.

## Category Visibility

`src/hooks/useTimedCategories.ts` and `src/lib/menu/timeSlotPresetBoundary.ts` own normal and overnight category visibility, weekday restrictions, next-start computation, and range validation. `DecisionBlocks.tsx` delegates to `isWithinTimeSlot()` so recommendations cannot expose a category that the normal menu hides.

Preset references are denormalized into category snapshots. Edit/delete scans exact initiating tenant/store project pages of 100 and uses project transactions. Update reconciliation admits only projects that still reference the preset; delete reconciliation admits the complete bounded store project set because a previously removed reference cannot identify a project whose cache invalidation failed after commit. Every admitted candidate revalidates its public cache even when its transaction is already projected on retry. Partial progress is therefore idempotent for both data and cache. Only after all acknowledgements does `completeTimeSlotPresetCascade()` transactionally clear the matching store marker; another operation ID cannot clear it. Desktop and mobile attempt one recovery for a persisted marker per mounted store scope. This retains the bounded scan because preset mutations are rare and no measured workload justifies an additional reference registry or queue collection.

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
- Preset store/cascade failure: no local success state. If the store transaction committed, its durable marker remains, blocks another mutation, and is retried when the exact store screen is mounted. Project writes are idempotent and only the matching operation may clear the marker.
- Cache invalidation failure propagates through the existing DAL acknowledgement rather than reporting a confirmed owner save.

## Scalability Decision

The useful long-term fixes are canonical evaluation, leaf/deep patches, bounded diagnostics, no redundant reads, existing cache reuse, and the one-field store-local recovery marker. A new hours collection, holiday scheduler, reference index, separate cascade ledger/queue, or provider sync would add operational and Firebase cost without current evidence. Revisit only if project-cascade telemetry shows sustained owner-impacting latency or the product explicitly admits date exceptions.
