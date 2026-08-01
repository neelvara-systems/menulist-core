# Working Hours, Holidays, and Time Slots — Specification

**Status:** Implemented source contract

**Last verified:** July 30, 2026

## Current Source Boundary

Current runtime covers owner-set weekly working hours, exact-date special hours, public open/closed status, Today quick-hours edits, and time-slot presets. Automatic holiday calendars are not shipped; owners explicitly choose each special date.

## Owner Outcome

The owner maintains regular weekly truth in one place. Customers see a status derived from that truth in the store timezone. A temporary disruption does not require rewriting the whole week.

## Functional Requirements

### Weekly hours

1. The persisted weekly map may contain only `sun`, `mon`, `tue`, `wed`, `thu`, `fri`, and `sat`.
2. A configured range uses strict 24-hour `HH:mm-HH:mm`; opening and closing must differ.
3. Missing, blank, or `closed` means no regular range for that day.
4. Overnight ranges are supported. The after-midnight portion belongs to the weekday where the range started.
5. Opening is inclusive and closing is exclusive.
6. Malformed configured current-day truth must show `Hours not available`, not a guessed open state.
7. Missing hours must not produce an open claim.
8. Existing comma-separated ranges remain readable for legacy safety. Current owner editors remain single-window and must preserve untouched ranges rather than silently flatten them.
9. Missing or invalid timezone metadata must use the shared deterministic `UTC` fallback on every owner and public surface; no surface may substitute a product-region default or the runtime-local clock.

### Special hours

1. `specialHours` is a store-document map with at most 64 valid Gregorian `YYYY-MM-DD` keys.
2. Each entry contains strict normalized hours or an empty string for closed all day, plus an optional whitespace-normalized public label of at most 80 characters.
3. A special entry replaces the regular schedule for that complete store-local date.
4. A current-date exception suppresses previous-day overnight carry. Without a current-date exception, a valid prior-date overnight range may carry normally.
5. Exact-date evaluation, next opening, urgent boundaries, OBP/menu output, owner messages, API output, and structured data must use the same normalized source.
6. Invalid special-hour shapes must fail in the DAL and be omitted by public projection/read boundaries.

### Owner mutation

1. Desktop must hydrate all seven weekday rows even when the stored map is empty or partial.
2. An unrelated Business Settings save must not write or clear working hours.
3. Desktop must write only after the owner changes hours and preserve untouched legacy day values.
4. Mobile full-hours must rehydrate on store/hour changes, write a deep patch including removals, and show success only after DAL acknowledgement.
5. Mobile Today must choose the weekday in the store timezone, validate the range, patch only that day, and roll back optimistic state on failure.
6. Successful hours writes stamp `hoursLastUpdatedAt` and use the existing public cache and Digital Screen invalidation path.
7. Every owner save captures the initiating tenant/store. Desktop/mobile drafts remount on a scope change, duplicate same-scope writes are rejected, and delayed success/failure/loading state cannot settle into another store.
8. Optimistic mobile rollback must match both the initiating tenant/store and the exact `hoursLastUpdatedAt` written by that attempt so it cannot erase a newer valid update.
9. Desktop and mobile special-date writes must acknowledge the store write before success, update `hoursLastUpdatedAt`, and invalidate public store/project tags through the existing DAL.
10. Mobile Today must show the effective exception. If today already has a special entry, its quick edit updates that date instead of silently changing the hidden weekly value.

### Time-slot presets and categories

1. Preset identifiers, labels, colors, and strict clock ranges use the shared time-slot boundary.
2. Duplicate identifiers or case-insensitive labels are rejected.
3. Overlapping presets are allowed because different categories may intentionally use overlapping windows.
4. Category `days` values are integers from 0 through 6.
5. For an overnight category slot, after-midnight visibility uses the previous weekday as its start day.
6. The ending minute is not visible.
7. Preset edit/delete updates referenced project category snapshots and revalidates affected public project caches.
8. Desktop and mobile owner contexts update only after the store write and required category cascade acknowledge success.
9. Decision Blocks and normal category rendering must share the same time-slot evaluator.
10. Preset edit/delete must atomically pair the store preset truth with an operation-owned pending-cascade marker. A later mutation is rejected until that marker is reconciled and cleared.
11. Project reconciliation must use the initiating tenant/store scope, remain idempotent after partial progress, and retain the marker on failure or store switch so the exact store can retry.

### Public and discovery output

1. Public menu, OBP, badges, trust/output controls, and structured data must use validated store truth.
2. OBP today/all-hours displays must never echo malformed raw values.
3. Structured data must omit invalid ranges and emit each valid historical range separately.
4. Current public status must refresh at minute-level boundaries on live owner/public surfaces that remain mounted.
5. OBP must visibly render upcoming special dates before weekly rows, and JSON-LD must project the same dates via `specialOpeningHoursSpecification`.
6. Public API and browser client projections must expose only normalized special-hour entries.

## Explicit Non-Goals

- Holiday calendars or automatic public-holiday closure.
- Google Business Profile hours synchronization.
- Promotions, price scheduling, booking calendars, or a general business calendar.
- A second hours document, scheduler, new API route, or provider call.
- A preset reference index, separate cascade collection, scheduled worker, or unbounded queue without measured scale evidence. The store-local recovery marker is part of the required consistency contract.

## Acceptance Evidence

- Friday `22:00-02:00` is open Friday 23:00 and Saturday 01:00, then closed at Saturday 02:00.
- Saturday `22:00-02:00` does not make Saturday 01:00 open.
- A category restricted to Friday overnight follows the same boundary.
- Empty/partial hours can be edited on desktop and mobile.
- An unrelated profile save produces no `workingHours` patch.
- Failed mobile writes restore previous truth and do not show saved copy.
- Invalid values are rejected at the store DAL and omitted from public structured data.
- Missing/invalid timezone parity produces the same status on public menu and OBP paths.
- Preset overlap behavior is identical on desktop and mobile.
- An all-day exact-date closure overrides otherwise-open weekly hours.
- An exact-date opening range overrides weekly hours and appears consistently in OBP, menu status, API output, owner messages, and structured data.
