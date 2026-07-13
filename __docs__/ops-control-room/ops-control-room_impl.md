# Ops Control Room — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Platform-only access at /ops
**Created:** February 20, 2026  
**Last Updated:** July 13, 2026
**Audience:** Developers

---

## July 13, 2026 Current-Authorization And Bounded-Monitor Audit

- `/api/ops/safe-mode`, `/api/ops/mute-alerts`, `/api/ops/platform-notifications`, and `/api/ops/owner-notifications` keep the signed `withAuth(...PLATFORM)` gate and now also re-read the exact current `users/{uId}` record after a fail-closed per-operator limiter. A stale session is rejected before ops/private reads, provider calls, or writes after role downgrade, disablement, blocking, deletion, identity mismatch, or revocation. Malformed persisted negative lifecycle/block flags also fail closed rather than being treated as enabled authority.
- Notification monitor GETs now have their own HMAC-hashed 60/hour read limits. Both GET and POST limiters fail closed with `503` when the shared provider is unavailable; normal exhaustion remains `429` with `Retry-After`.
- Platform- and owner-notification counts are derived from the same bounded, newest-first window used for rows (`systemAlerts <= 150`, owner-notification events `<= 90`). The UI labels those metrics as recent. Collection-wide count aggregation queries were removed, so a manual refresh cannot grow in cost with collection history.
- Platform alert DTOs no longer return `acknowledgedBy`; stored title/message and unsafe metadata remain presence/length summaries. Owner notification detail keeps only the explicitly required full resolved recipient fields for platform recovery, bounds them, filters delivery rows by product, and reports the resolver's exact zero/one/two scope reads.
- Owner-notification manual handoff now transactionally verifies the source event and commits the delivery audit plus event marker together. A deleted or cross-product event produces `404` without an orphan delivery or recreated event.
- SAFE_MODE transitions are transactional and idempotent. Repeating the already-current state performs no config or alert write. A successful state transition remains authoritative even if the secondary alert write fails; that failure is logged and returned as `alertRecorded: false` instead of a false toggle failure that invites a duplicate retry.
- Platform alert actions are replay-safe: an already-acknowledged alert adds no write, manual handoff uses a stable client action ID to avoid rewriting the marker on an identical response retry, and manual alert creation derives a deterministic alert document ID so the same action cannot create or externally deliver a duplicate alert.
- `npm run verify:ops-current-authorization-boundary` plus `npm run test:notification-ops-snapshot-boundary` lock these contracts. No Firestore rules, indexes, Cloud Functions, or provider configuration changed; the app routes still require the normal Next.js release path, and no Vercel deploy was run.

## June 30, 2026 Ops Control Room Action Request/Response Guard Notes

- `/ops` keeps the same platform-only route, manual refresh model, SAFE_MODE toggle, alert-mute button, and force-republish callable behavior.
- Desktop and mobile SAFE_MODE and alert-mute browser calls use `OPS_CONTROL_ROOM_REQUEST_POLICY`, which pins no-store cache, same-origin credentials, and manual redirect handling before acknowledgement parsing.
- SAFE_MODE and alert-mute responses pass through `src/lib/ops/opsControlRoomClientResponse.ts`, which caps browser JSON parsing at 16KB and validates acknowledgement shape before showing success copy or refreshing dashboard state.
- July 13 follow-up: desktop and mobile force-republish callable results require `success`, a bounded `projectCount` from 1 to 100, one non-empty representative `projectId`, and non-empty `verification` before showing success or warning copy. Both surfaces state that all active menu projects are affected and report the confirmed count; invalid callable envelopes log `ops_control_room_force_republish_response_invalid` with bounded shape metadata.
- July 1 follow-up: Source gate: `npm run verify:ops-control-room-boundary` locks the platform-only SAFE_MODE and alert-mute mutation routes, hashed operator rate limits, bounded browser action-response parsing, read-only ops DAL, desktop/mobile force-republish envelope guards, mobile shell routing, and docs parity. The verifier does not run Firestore reads/writes, callable invocations, provider calls, browser smoke, Firebase deploy, or Vercel deploy.
- Rejected, redirected, oversized, malformed, or invalid action responses use fixed platform failure copy and bounded `ops_control_room_response_*` diagnostics only. Desktop request/network failures log bounded `ops_control_room_safe_mode_toggle_failed` or `ops_control_room_mute_alerts_failed`; mobile request/network failures log bounded `mobile_ops_safe_mode_toggle_failed` or `mobile_ops_mute_alerts_failed`.
- The June 30 browser response boundary did not change mutation route behavior; the July 13 audit above supersedes its older authorization, rate-limit, SAFE_MODE, and read-cost assumptions.

## June 30, 2026 Business Health Monitor Response Guard Notes

- `/platform/owner-business-assistant` keeps the same platform-only route, manual refresh model, sanitized monitor route output, and bounded answer-event/feedback reads.
- The browser monitor now caps `/api/platform/owner-business-assistant/monitor` response JSON at 256KB through the shared Owner Business Assistant response reader and validates summary, event, feedback, source-coverage, and generated-at shapes before updating cards or tables.
- Rejected, oversized, malformed, or invalid responses use fixed platform failure copy and bounded `owner_business_assistant_monitor_response_*` runtime diagnostics only.
- This does not change the API route read pattern, DATA_READ limiter, Admin SDK collection reads, Cloud Functions, rules, indexes, routes, or platform permissions.

## June 29, 2026 Scheduler Display Guard Notes

- Scheduler Monitor detail rendering stays bounded for run-level and task-level error surfaces.
- `tasks[].details`, `errors[].details`, historical `tasks[].error`, run-log `errors[].error`, and failed settlement `state.error` render as safe summaries only: strings become text length metadata, arrays become array length metadata, objects become key-count metadata, and numbers/booleans remain visible.
- July 1 follow-up: Source gate: `npm run verify:scheduler-monitor-boundary` locks the read-only scheduler DAL, bounded desktop/mobile scheduler detail rendering, store-scoped `triggerStoreNightlyScheduler` manual recovery, MobileShell route mapping, and docs parity. The verifier does not run Firestore reads/writes, callable invocations, browser smoke, Firebase deploy, or Vercel deploy.
- This does not change scheduler run-log writes, settlement state reads, manual recovery behavior, Cloud Functions, rules, indexes, routes, or platform permissions.

## June 29, 2026 Messaging Onboarding Monitor Response Guard Notes

- `/ops/messaging-onboarding` keeps the same platform-only route and manual refresh model.
- The browser monitor now caps `/api/ops/messaging-onboarding` response JSON at 256KB and validates the dashboard snapshot shape before updating cards or tables.
- Rejected, oversized, malformed, or invalid responses use fixed platform failure copy and bounded `messaging_onboarding_monitor_response_*` runtime diagnostics only.
- July 1 follow-up: Source gate: `npm run verify:messaging-onboarding-monitor-boundary` locks the platform-only route, dashboard feature flag, DATA_READ limiter, control-doc health lookup, bounded Admin SDK read windows, masked event/session IDs, sanitized metadata, 256KB browser response parsing, desktop/mobile route mapping, and docs parity. The verifier does not run Firestore reads/writes, WhatsApp provider calls, browser smoke, Firebase deploy, or Vercel deploy.
- July 6 follow-up: `systemHealth/messaging_onboarding_control.lastSnapshotId` now passes through the shared Firestore document-ID guard before the route reads the latest health snapshot. Malformed, reserved, empty, or path-shaped stored snapshot IDs return the existing unknown-health state instead of building `systemHealth/{lastSnapshotId}` refs.
- This does not change the API route read pattern, DATA_READ limiter, Admin SDK collection reads, count queries, Cloud Functions, rules, indexes, routes, or platform permissions.

## June 29, 2026 Platform Notification Monitor Response Guard Notes

- `/ops/platform-notifications` keeps the same platform-only route, manual refresh model, bounded action body, simple Firestore document ID event selectors, actions update only existing alert documents, and hashed per-operator action limiter.
- The browser monitor now caps `/api/ops/platform-notifications` load and action response JSON at 256KB and validates the snapshot/action envelope before updating table/detail state or showing action success copy.
- Rejected, oversized, malformed, or invalid responses use fixed platform failure copy and bounded `platform_notification_monitor_response_*` runtime diagnostics only.
- June 30 follow-up: route-side query validation, rate-limit, and action-validation security logs use bounded route metadata instead of raw session/request context, and invalid attempted action text is summarized as presence/length metadata.
- July 1 follow-up: Source gate: `npm run verify:platform-notifications-boundary` locks the platform-notification registry mirror, platform-only route/body/rate-limit boundaries, bounded monitor response parsing, safe stored-alert display summaries, table-level scroll/readability anchors, and docs parity. The verifier does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy.
- July 5 follow-up: `/api/ops/platform-notifications` now accepts `eventId` only when it is a simple Firestore document ID, and acknowledge/manual-handoff actions return `404` instead of creating a partial alert when the selected alert document does not exist. Explicit manual alert creation still uses the registered `createManualAlert` action.
- The July 13 audit above replaces collection-wide count queries with one bounded recent window and adds current persisted platform authorization plus fail-closed GET/POST limits. Acknowledge is write-idempotent, while manual-handoff and manual-alert requests require a stable bounded action ID for replay safety. Valid behavior remains platform-only.

## June 29, 2026 Owner Notification Monitor Response Guard Notes

- `/ops/owner-notifications` keeps the same platform-only route, product/feature gates, manual refresh model, bounded action body, simple Firestore document ID event selectors, and hashed per-operator action limiter.
- The browser monitor now caps `/api/ops/owner-notifications` load and recovery-action response JSON at 256KB and validates the snapshot/action envelope before updating table/detail state or showing action success copy.
- Rejected, oversized, malformed, or invalid responses use fixed platform failure copy and bounded `owner_notification_monitor_response_*` runtime diagnostics only.
- June 30 follow-up: route-side query validation, rate-limit, and action-validation security logs use bounded route metadata instead of raw session/request context, and invalid attempted action text is summarized as presence/length metadata.
- July 5 follow-up: `/api/ops/owner-notifications` now accepts selected/recovery `eventId` values only when they are simple Firestore document IDs before direct event reads, delivery detail queries, retry, manual send, or manual handoff actions.
- The July 13 audit above adds current persisted platform authorization and fail-closed GET/POST limits, derives recent counts from the bounded scan, records exact resolver reads, filters cross-product delivery rows, and makes manual-handoff audit writes atomic.

## June 29, 2026 Entity Block Response Guard Notes

- Entity Blocks keeps the same platform-only mutation route, route body cap, tenant/store/user writes, Firebase Auth disable/token-revoke handling, public cache invalidation, and Business Health packet invalidation.
- The shared desktop/mobile browser DAL calls `/api/platform/entity-blocks` with no-store cache, same-origin credentials, and manual redirect handling, then caps response JSON at 64KB and requires `success: true`, a returned entity object, the requested entity ID, and the requested blocked state before local table state or success copy is updated.
- Malformed, oversized, rejected, or invalid acknowledgements use fixed platform failure copy and bounded `platform_entity_block_response_*` runtime diagnostics only.
- July 1 follow-up: Source gate: `npm run verify:platform-entity-blocks-boundary` locks the platform-only tenant/store/user block route, 64KB request/response caps, Firebase Auth disable/token-revoke handling, tenant-to-store block mirroring, public menu/OBP/screen/Business Health cache invalidation, desktop/mobile shared client, MobileShell route mapping, and docs parity. The verifier does not run Firestore reads/writes, Firebase Auth writes, browser smoke, Firebase deploy, or Vercel deploy.
- July 5 follow-up: entity ID values now use the shared Firestore document-ID boundary before the platform route reads or writes `tenants`, `stores`, or `users` documents. Numeric IDs remain accepted when finite; string IDs reject path-shaped or reserved Firestore document IDs. This keeps valid platform block/unblock behavior unchanged and adds no Firestore reads/writes/deletes beyond existing valid block actions.
- July 6 follow-up: entity-block target IDs now use strict platform entity-block document-ID normalization before `getEntityDocRef()`, tenant-to-store direct mirror writes, store-summary key fanout, or public-cache invalidation. Tenant/store targets require exact positive safe-integer document IDs; user targets keep strict simple Firestore document IDs without whitespace mutation. Malformed, reserved, empty, path-shaped, whitespace-mutated, decimal, zero, negative, unsafe, or nonnumeric tenant/store targets fail before entity-block Firestore refs. This keeps valid platform block/unblock behavior unchanged and adds no Firestore reads/writes/deletes beyond existing valid block actions.
- July 6 follow-up: `/api/platform/entity-blocks` now applies the shared `PLATFORM_ENTITY_BLOCK_MUTATION` rate limit after the feature flag and before bounded body parsing, entity validation, Firestore reads/writes, Firebase Auth disable/token-revoke work, public cache invalidation, screen wakeups, or Business Health packet invalidation. The limiter uses HMAC-hashed platform-operator key material and a 20-per-hour ceiling, returns 429 with retry headers, and keeps valid platform block/unblock behavior unchanged.
- July 11 follow-up: tenant and store block mutations now re-read exact document identity and ownership inside Firestore transactions. Tenant state, up to 200 existing store mirrors, and the single `storesSummary` mirror commit together; derived cache, screen, and Business Health refresh begins afterward in chunks of 20. Drifted `tenantId`/`storeId` fields, ambiguous store ownership, over-limit scope, or contention fail closed instead of redirecting or partially committing the block.
- July 11 user-auth follow-up: user block/unblock writes the current Firestore access decision and a unique `authSyncRevision`/pending marker before Firebase Auth work. Up to five reconciliation attempts apply the latest desired disabled state, compare the revision in a transaction, and clear pending state only when stable. A superseded request returns conflict; a provider failure leaves the Firestore block and observable pending marker intact instead of returning stale success.

## June 27, 2026 Diagnostics Notes

- Ops DAL, Scheduler DAL, Scheduler Monitor, and alert creation/delivery failure paths now use `src/lib/ops/opsDiagnostics.ts`.
- Diagnostics record normalized `ops_*` failure codes with bounded alert/store/tenant/run/filter metadata and source error name/code/status only.
- Manual recovery failures still show the run-log ID when Firebase Functions returns one, but no longer show raw callable/provider error messages in the platform toast.
- Functions-side ops triggers now apply the same boundary for `verifyMenuPublish`, `forceRepublish`, `gcpBudgetAlertWebhook`, and `backfillStoresSummary`: callable errors use fixed operator copy, and Functions logs use stable `OPERATIONS_*` codes plus bounded store/tenant/requester/public URL metadata and source error name/code/status only.
- July 13 follow-up: `forceRepublish` no longer authorizes a project touch from a signed platform claim and caller-supplied paths alone. One Firestore transaction requires canonical numeric tenant/store IDs, the claim's canonical user ID, current persisted platform authority, active mutually consistent tenant/store documents, and at most 100 project documents. It touches every active, undeleted project whose embedded scope is absent/legacy-compatible or matches the canonical path; deleted, inactive, malformed-ID, and mismatched-scope rows are excluded. Above the cap, the callable returns fixed `resource-exhausted` copy and logs `OPERATIONS_FORCE_REPUBLISH_PROJECT_LIMIT_EXCEEDED` without partial writes. The subsequent health write repeats current user/tenant/store/platform and public-host validation transactionally, so a downgrade or scope change cannot produce a stale-authority project or health mutation.
- This does not change dashboard reads, scheduler queries, alert writes, Telegram/platform delivery attempts, callable invocation count, Cloud Function trigger shape, rules, indexes, routes, or platform permissions.

## June 11, 2026 Audit Notes

- Desktop and mobile Ops Control Room routes use signed platform-session admission; every scoped mutation/monitor API in the July 13 audit also verifies the current persisted platform user before private reads or writes.
- `/api/ops/platform-notifications` returns `404` when `ENABLE_PLATFORM_NOTIFICATION_DASHBOARD` is disabled, before any alert reads or writes.
- `/api/ops/owner-notifications` returns `404` when `ENABLE_OWNER_NOTIFICATIONS` or `ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD` is disabled.
- Ops mutation routes use platform-role gates, bounded bodies, and HMAC-hashed operator key material for their rate-limit keys before write/recovery work.
- `/api/ops/messaging-onboarding` returns `404` when `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` is disabled.
- `/api/ops/messaging-onboarding` applies the shared `DATA_READ` gate with HMAC-hashed platform user key material after the dashboard feature flag, then reads latest health through `systemHealth/messaging_onboarding_control.lastSnapshotId` and one direct snapshot read, avoiding document-id prefix scans or a `__name__` index dependency.
- `/api/platform/entity-blocks` returns `404` when `ENABLE_PLATFORM_ENTITY_BLOCKS` is disabled.
- Invalid JSON on ops mutations is handled as invalid input instead of a generic server failure.
- Chrome visual QA found the desktop header action group could overflow horizontally; the action group now wraps inside the content column.
- Chrome visual QA found platform notification messages could collapse in the alert table; the table now keeps a readable Message column with table-level horizontal scroll.

## Architecture Overview

```
Route: /ops (Next.js page)
Access: platformRole === 'PLATFORM'
Data: Fetch-on-open after platform session confirmation, manual refresh button
Layout: Single column, 5 numeric card sections
```

## Linked Platform Monitors

The Ops Control Room links internal platform-role-only monitors without adding owner-facing navigation:

- `/ops/scheduler` for scheduler runs and manual recovery.
- `/ops/extraction` for extraction/job review and cost telemetry.
- `/platform/cost-posture` for known internal cost signals, source coverage, billing-export readiness, and cost guardrails.
- `/ops/messaging-onboarding` for WhatsApp onboarding intake operations.
- `/ops/platform-notifications` for founder/operator alerts from `systemAlerts`, including acknowledgement and manual Email/WhatsApp Web handoff.
- `/ops/owner-notifications` for owner email/WhatsApp delivery tracking and retry.

## File Structure

```
src/
├── app/
│   └── (main)/
│       └── ops/
│           └── page.tsx              # NEW — Ops control room page
├── components/
│   └── templates/
│       └── main-app/
│           └── platform/
│               └── opsControlRoom/
│                   └── index.tsx      # Lean v1 — all sections in one file
├── database/
│   └── ops/
│       └── index.ts                  # NEW — DAL for ops data
└── app/
    └── api/
        └── ops/
            ├── safe-mode/
            │   └── route.ts          # NEW — Enable/disable SAFE_MODE
            ├── platform-notifications/
            │   └── route.ts          # Platform alert tracking + manual handoff
            └── mute-alerts/
                └── route.ts          # NEW — Mute alerts for deploy
```

## Database Access Layer (DAL)

### `src/database/ops/index.ts`

```typescript
/**
 * Ops Control Room DAL
 * Fetches system health, adoption, and integrity data.
 * All queries are read-only and optimized for minimal Firestore reads.
 *
 * @see __docs__/ops-control-room/
 */

// Section 1: System State
export async function getSystemState(): Promise<SystemState> {
  // Read ops_config/system (SAFE_MODE status)
  // Count stores by health.status
  // Read last alert from systemAlerts
}

// Section 2: Adoption Pulse (last 24h)
export async function getAdoptionPulse(): Promise<AdoptionPulse> {
  // Count stores created in last 24h
  // Count projects with publish in last 24h
  // Count stores with publish in last 7 days (active)
  // Count feedback docs in last 24h
}

// Section 3: Store Integrity
export async function getIntegritySignals(): Promise<IntegritySignals> {
  // Count stores without active project
  // Count stores unpublished >48h after creation
  // Count stores with zero publish in 60 days
}

// Section 4: Recent Alerts
export async function getRecentAlerts(limit: number = 10): Promise<Alert[]> {
  // Query systemAlerts ordered by timestamp desc, limit 10
}
```

## API Contracts

### POST `/api/ops/safe-mode`

```typescript
// Request
{ action: 'activate' | 'deactivate', reason?: string }

// Response
{ success: true, SAFE_MODE: boolean, changed?: boolean, alertRecorded?: boolean }

// Access: withAuth({ requiredPlatformRole: 'PLATFORM' })
// Then exact current users/{uId} platform/lifecycle/revocation verification.
// Invalid JSON or invalid action returns 400.
// Security logs use bounded route metadata; reason text is summarized.
// Repeating the current state is a no-write success.
```

### POST `/api/ops/mute-alerts`

```typescript
// Request
{ durationMinutes: number }

// Response
{ success: true, mutedUntil: string }

// Access: withAuth({ requiredPlatformRole: 'PLATFORM' })
// Then exact current users/{uId} platform/lifecycle/revocation verification.
// Invalid JSON or out-of-range duration returns 400.
// Security logs use bounded route metadata.
```

## UI Design (Lean v1)

### Section 1: System State Card

```
┌─ System State ─────────────────────────────────────────┐
│                                                         │
│  Store Health    SAFE_MODE      Last Alert              │
│  ✅ 34 OK        🟢 OFF         None in 24h            │
│  ⚠️ 2 WARNING                                          │
│  ❌ 0 FAILED                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Section 2: Adoption Pulse Card

```
┌─ Adoption Pulse (24h) ─────────────────────────────────┐
│                                                         │
│  New Stores: 2    Published: 5    Active (7d): 34      │
│  Feedback: 12     AI Gens: 8                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Section 3: Integrity Card

```
┌─ Store Integrity Signals ──────────────────────────────┐
│                                                         │
│  No project: 0    Unpublished >48h: 3                  │
│  No publish 60d: 1                                     │
│                                                         │
│  ⚠️ 3 stores need attention                            │
└─────────────────────────────────────────────────────────┘
```

### Section 5: Emergency Controls

```
┌─ Emergency Controls ───────────────────────────────────┐
│                                                         │
│  [🔴 Enable SAFE_MODE]  [🟢 Disable SAFE_MODE]         │
│  [⏸️ Mute Alerts 20min]                                │
│                                                         │
│  Status: All systems normal                             │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Page + Data Layer (est. 3-4 hours)

| Task                  | File                                                         | Description                 |
| --------------------- | ------------------------------------------------------------ | --------------------------- |
| Create ops page       | `src/app/(main)/ops/page.tsx`                                | Route with superadmin check |
| Create DAL            | `src/database/ops/index.ts`                                  | Data fetching functions     |
| Create main component | `src/components/templates/platform/opsControlRoom/index.tsx` | Layout with 5 sections      |
| Create section cards  | `opsControlRoom/*.tsx`                                       | 5 card components           |

### Phase 2: Emergency Controls (est. 1-2 hours)

| Task                   | File                                   | Description               |
| ---------------------- | -------------------------------------- | ------------------------- |
| Create safe-mode API   | `src/app/api/ops/safe-mode/route.ts`   | SAFE_MODE toggle endpoint |
| Create mute-alerts API | `src/app/api/ops/mute-alerts/route.ts` | Alert mute endpoint       |
| Wire EmergencyControls | Component                              | Connect to APIs           |

## Scheduler Monitor Sub-Page (Added Feb 20, 2026)

### Route: `/ops/scheduler`

A dedicated page for monitoring the unified timezone-aware scheduler. The scheduler runs hourly at `:30`, but each store settles at its local 2:30 AM window.

### File Structure

```
src/
├── app/(main)/ops/scheduler/page.tsx                    # Page route
├── components/templates/main-app/platform/
│   └── schedulerMonitor/index.tsx                       # Dashboard UI
├── database/ops/scheduler.ts                            # DAL (read-only)
└── lib/ops/schedulerTypes.ts                            # Shared types
```

### Features

| Feature              | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| **Health Badge**     | Green/orange/red/grey based on recent run outcomes                 |
| **Last Run Summary** | Timestamp, duration, stores/projects counts                        |
| **Task Breakdown**   | Per-task status for scheduler sub-tasks with timing                 |
| **Analytics Settlement State** | Reads `platformSummary/nightlyState_*` to show store-local settlement health |
| **Error Details**    | Expandable error list with tId/sId/projectId                       |
| **Run History**      | Filterable table by status and trigger type                        |
| **Manual Recovery**  | Store selector from `platformSummary/storesSummary` calls `triggerStoreNightlyScheduler` for the selected store |
| **Quick Reference**  | Schedule, timeout, tasks list, TTL info                            |

### Navigation

- From Ops Control Room: "Scheduler Monitor" button in header
- Direct URL: `/ops/scheduler`

### DAL: `src/database/ops/scheduler.ts`

```typescript
getSchedulerHealthSummary(); // ~1 read (last 10 runs)
getSchedulerRunHistory(filter); // ~1 read (last 20 runs, filterable)
getSchedulerRunDetails(runId); // ~1 read (single run)
getSchedulerSettlementSummary(); // ~1 read (nightlyState_* docs, limit 50)
```

### Diagnostics

Ops runtime diagnostics are centralized in `src/lib/ops/opsDiagnostics.ts`.

Covered failure paths:

- Ops Control Room DAL read fallbacks
- Scheduler run-history, health, run-details, and settlement read fallbacks
- Scheduler Monitor load and manual recovery failures
- Alert document creation failures
- Non-blocking Telegram and platform alert delivery failures

Diagnostics must not log raw alert messages, Telegram tokens/chat IDs, store records, run-log documents, tenant/store IDs, provider payloads, or callable exception text.

Scheduler Monitor detail rendering must also stay bounded. `tasks[].details`, `errors[].details`, historical `tasks[].error`, run-log `errors[].error`, and failed settlement `state.error` text are rendered as safe summaries only: strings become text length metadata, arrays become array length metadata, objects become key-count metadata, and numbers/booleans remain visible. Do not render raw detail JSON or stored scheduler error text in the desktop or mobile scheduler monitors.

### Manual Trigger Boundary

`triggerStoreNightlyScheduler` is the manual recovery tool for a failed store-level nightly run. It requires only the selected store from `storesSummary`, does not expose project IDs in the UI, and runs analytics settlement, Decision Blocks, and Menu Intelligence for all active projects under that store. Global maintenance tasks remain owned by the scheduled platform-wide flow.

Manual recovery run logs are written before the heavy work begins:

- Document id: `manual_store_{tId}_{sId}_{timestamp}`
- Initial status: `running`
- Final status: `success`, `partial`, or `failed`
- Required diagnostic fields: `runLogId`, `manualScope`, `phase`, `tasks`, and `errors[]`
- Error entries include safe internal debugging fields: `phase`, `operation`, `code`, `error`, optional `projectId`, optional `settlementDate`, and optional `details`

This is required so platform ops can inspect the failed phase first, fix the cause, and then rerun recovery from the store selector.

---

## Security Checklist

- [x] Route restricted to superadmin (platformRole check)
- [x] API routes use `withAuth({ requiredPlatformRole: 'PLATFORM' })`
- [x] High-risk ops APIs re-prove the current persisted platform user after a fail-closed per-operator limiter
- [x] SAFE_MODE toggle requires confirmation dialog
- [x] No sensitive data displayed (no user emails, no tokens)
- [x] Read-only data (except emergency controls)
- [x] Input validation with Zod on API routes
- [x] Notification monitor reads/counts are bounded and recent-window semantics are explicit

## Estimated Firestore Reads Per Page Load

### Ops Control Room (`/ops`)

| Query                      | Reads             |
| -------------------------- | ----------------- |
| ops_config/system          | 1                 |
| stores (health summary)    | 1 (count query)   |
| stores (integrity signals) | 3 (count queries) |
| systemAlerts (recent)      | 1 (limit 10)      |
| stores (adoption pulse)    | 2 (count queries) |
| **Total**                  | **~8 reads**      |

### Scheduler Monitor (`/ops/scheduler`)

| Query                      | Reads          |
| -------------------------- | -------------- |
| schedulerRunLogs (health)  | 1 (limit 10)   |
| schedulerRunLogs (history) | 1 (limit 20)   |
| platformSummary/nightlyState_* | 1 (limit 50) |
| **Total**                  | **~3-4 reads** |

Negligible cost. Admin-only pages, loaded manually.

---

**Implementation Status:** ✅ IMPLEMENTED — Superadmin access at /ops and /ops/scheduler
