# Ops Control Room — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Platform-only access at /ops
**Created:** February 20, 2026  
**Last Updated:** June 11, 2026
**Audience:** Developers

---

## June 11, 2026 Audit Notes

- Desktop and mobile Ops Control Room read Firestore only after the session has resolved to `platformRole === 'PLATFORM'`.
- `/api/ops/platform-notifications` returns `404` when `ENABLE_PLATFORM_NOTIFICATION_DASHBOARD` is disabled, before any alert reads or writes.
- `/api/ops/owner-notifications` returns `404` when `ENABLE_OWNER_NOTIFICATIONS` or `ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD` is disabled.
- `/api/ops/messaging-onboarding` returns `404` when `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` is disabled.
- `/api/ops/messaging-onboarding` reads latest health through `systemHealth/messaging_onboarding_control.lastSnapshotId` and one direct snapshot read, avoiding document-id prefix scans or a `__name__` index dependency.
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
{ success: true, SAFE_MODE: boolean }

// Access: withAuth({ requiredPlatformRole: 'PLATFORM' })
// Invalid JSON or invalid action returns 400.
```

### POST `/api/ops/mute-alerts`

```typescript
// Request
{ durationMinutes: number }

// Response
{ success: true, mutedUntil: string }

// Access: withAuth({ requiredPlatformRole: 'PLATFORM' })
// Invalid JSON or out-of-range duration returns 400.
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
- [x] SAFE_MODE toggle requires confirmation dialog
- [x] No sensitive data displayed (no user emails, no tokens)
- [x] Read-only data (except emergency controls)
- [x] Input validation with Zod on API routes

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
