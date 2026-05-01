# Ops Control Room — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Superadmin access at /ops  
**Created:** February 20, 2026  
**Last Updated:** May 1, 2026
**Audience:** Developers

---

## Architecture Overview

```
Route: /ops (Next.js page)
Access: platformRole === 'PLATFORM' || 'ADMIN' (superadmin only)
Data: Fetch-on-open, manual refresh button
Layout: Single column, 5 numeric card sections
```

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
```

### POST `/api/ops/mute-alerts`

```typescript
// Request
{ durationMinutes: number }

// Response
{ success: true, mutedUntil: string }

// Access: withAuth({ requiredPlatformRole: 'PLATFORM' })
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
| **Manual Recovery**  | "Recompute DI Now" calls `triggerDecisionBlocksScoring` CF for Decision Blocks only |
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

`triggerDecisionBlocksScoring` is a recovery tool for Decision Blocks recomputation. It does **not** run the full scheduled flow, analytics settlement, billing reconciliation, or global maintenance tasks. The scheduler monitor copy must preserve this boundary so ops does not mistake a manual DI recovery run for a complete nightly settlement.

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
