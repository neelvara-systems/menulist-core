# Messaging Onboarding Dashboard — Implementation Blueprint

**Feature:** Internal Monitoring Dashboard for Messaging Onboarding Pipeline
**Status:** DOCUMENTED — Ready for Implementation
**Last Updated:** March 12, 2026

---

## 1. Architecture

```
messagingOnboardingEvents (existing)
        │
        ▼ onDocumentCreated
aggregateOnboardingMetrics (NEW CF)
        │
        ▼ FieldValue.increment()
messagingOnboardingMetrics/{YYYY-MM-DD} (NEW collection)
        │
        ▼ Dashboard reads
/ops/messaging-onboarding (NEW page)

        ┌─────────────────┐
        │ checkStuckSessions │  onSchedule(every 10 min)
        └────────┬────────┘
                 ▼
        messagingOnboardingSessions (existing)
        + systemAlerts (existing)

        ┌───────────────────────┐
        │ monitorOnboardingHealth │  onSchedule(every 15 min)
        └────────┬──────────────┘
                 ▼
        messagingOnboardingMetrics (reads)
        + systemAlerts (writes)
```

---

## 2. Database Schema

### 2.1 Daily Metrics Document

**Collection:** `messagingOnboardingMetrics/{YYYY-MM-DD}`

```typescript
interface MsgOnboardingDailyMetrics {
  date: string;                    // YYYY-MM-DD

  // System Health
  sessionsStarted: number;
  previewsGenerated: number;
  previewsOpened: number;
  publishesCompleted: number;

  // Processing Times (for P50/P90 calculation)
  totalProcessingTimeMs: number;   // Sum of all processing times
  processingTimeCount: number;     // Number of measurements

  // Failures
  validationFailures: number;
  extractionFailures: number;
  publishFailures: number;
  blankPreventionTriggers: number;
  mediaDownloadFailures: number;

  // AI Usage
  geminiValidationCalls: number;
  geminiExtractionCalls: number;
  imagesUploaded: number;

  // Lifecycle
  sessionsExpired: number;
  storageCleanups: number;
  remindersSent: number;
  cleanupErrors: number;
  lastCleanupAt: Timestamp | null;

  // Growth
  organicSessions: number;         // acquisitionSource != 'direct_share' && != 'unknown'
  acquisitionSources: {
    direct_share: number;
    obp_page: number;
    google_search: number;
    referral: number;
    unknown: number;
  };

  // Stuck Sessions (updated by checkStuckSessions)
  stuckSessionsRecovered: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.2 Existing Collections Used (Read-Only)

- `messagingOnboardingEvents` — Source for aggregation trigger
- `messagingOnboardingSessions` — Active session queries, debug tool
- `systemAlerts` — Alert creation (existing ops pattern)

---

## 3. Cloud Functions

### 3.1 aggregateOnboardingMetrics

**Trigger:** `onDocumentCreated(messagingOnboardingEvents/{eventId})`
**Purpose:** Increment daily metrics counters based on event type
**Memory:** 256MB
**Timeout:** 30s

```typescript
// Event type → metrics field mapping
const EVENT_METRICS_MAP: Record<string, string[]> = {
  'SESSION_CREATED':              ['sessionsStarted'],
  'PREVIEW_GENERATED':            ['previewsGenerated'],
  'PREVIEW_VIEWED':               ['previewsOpened'],
  'PUBLISH_COMPLETED':            ['publishesCompleted'],
  'ASSET_VALIDATION_FAILED':      ['validationFailures'],
  'EXTRACTION_FAILED':            ['extractionFailures'],
  'PUBLISH_FAILED':               ['publishFailures'],
  'BLANK_PREVENTION_TRIGGERED':   ['blankPreventionTriggers'],
  'PROVIDER_MEDIA_DOWNLOAD_FAILED': ['mediaDownloadFailures'],
  'ASSET_VALIDATION_STARTED':     ['geminiValidationCalls'],
  'EXTRACTION_STARTED':           ['geminiExtractionCalls'],
  'UPLOAD_RECEIVED':              ['imagesUploaded'],
  'SESSION_EXPIRED':              ['sessionsExpired'],
  'REMINDER_SENT':                ['remindersSent'],
};
```

**Logic:**
1. Read event doc
2. Get today's date key (UTC)
3. Look up metrics fields from EVENT_METRICS_MAP
4. `FieldValue.increment(1)` on each matched field
5. For `EXTRACTION_COMPLETED`: also increment `totalProcessingTimeMs` + `processingTimeCount`
6. For `SESSION_CREATED`: also increment `acquisitionSources.{source}`
7. Create metrics doc if it doesn't exist (set with defaults)

**Cost:** 1 Firestore write per event (atomic increment). At 20 events/session × 1000 sessions/month = 20K writes = ₹3/month.

### 3.2 checkStuckSessions

**Trigger:** `onSchedule('every 10 minutes')`
**Purpose:** Detect and auto-recover stuck sessions
**Memory:** 256MB
**Timeout:** 60s

**Logic:**
1. Feature flag check (`ENABLE_MESSAGING_ONBOARDING`)
2. Query sessions in `PROCESSING_MENU` where `updatedAt < now - 10min`
3. Query sessions in `PUBLISHING` where `updatedAt < now - 5min`
4. Query sessions in `VALIDATING_ASSETS` where `updatedAt < now - 5min`
5. For each stuck session:
   - `PROCESSING_MENU` → transition to `FAILED` (reason: "Auto-recovered: stuck in PROCESSING_MENU")
   - `PUBLISHING` → transition to `AWAITING_APPROVAL` (reason: "Auto-recovered: stuck in PUBLISHING")
   - `VALIDATING_ASSETS` → transition to `FAILED` (reason: "Auto-recovered: stuck in VALIDATING_ASSETS")
6. Log event for each recovery
7. Increment `stuckSessionsRecovered` in daily metrics
8. If any stuck sessions found: create `systemAlert` (severity: warning)

**Cost:** 3 Firestore reads per run (one per state query). 720 runs/month × 3 reads = 2,160 reads = ₹0.11/month.

### 3.3 monitorOnboardingHealth

**Trigger:** `onSchedule('every 15 minutes')`
**Purpose:** Check health thresholds and create alerts
**Memory:** 256MB
**Timeout:** 30s

**Logic:**
1. Feature flag check
2. Read today's metrics doc
3. Check 5 alert conditions:
   - Sessions started = 0 for last hour (during 8AM-10PM IST = 2:30AM-4:30PM UTC)
   - Preview rate < 40% (if sessionsStarted >= 5)
   - Publish failures > 5 in metrics
   - Avg processing time > 5 min (totalProcessingTimeMs / processingTimeCount)
   - Cost per publish > ₹20 (estimated from gemini calls / publishes)
4. For each triggered condition: create `systemAlert` doc
5. Update metrics doc `updatedAt`

**Cost:** 1 Firestore read + 0-5 writes per run. Negligible.

---

## 4. File Structure

### Cloud Functions (NEW files)

```
functions/src/
├── messagingOnboarding/
│   └── metricsAggregator.ts       # aggregateOnboardingMetrics logic
├── schedulers/
│   ├── checkStuckSessions.ts      # Stuck session recovery
│   └── monitorOnboardingHealth.ts # Health threshold alerts
```

### Dashboard (NEW files)

```
src/
├── app/(main)/ops/
│   └── messaging-onboarding/
│       └── page.tsx               # Route page
├── components/templates/main-app/platform/
│   └── messagingOnboardingMonitor/
│       └── index.tsx              # Main dashboard component
├── database/ops/
│   └── messagingOnboardingMetrics.ts  # DAL for metrics
├── lib/ops/
│   └── messagingOnboardingTypes.ts    # TypeScript types
```

### Modified Files

```
functions/src/index.ts              # Export 3 new CFs
src/config/features.ts              # Add ENABLE_MESSAGING_ONBOARDING_DASHBOARD flag
firestore.indexes.json              # Add indexes for stuck session queries
```

---

## 5. Firestore Indexes Required

```json
[
  {
    "collectionGroup": "messagingOnboardingSessions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "state", "order": "ASCENDING" },
      { "fieldPath": "updatedAt", "order": "ASCENDING" }
    ]
  }
]
```

Note: `messagingOnboardingMetrics` is queried by doc ID (date string) — no index needed.

---

## 6. DAL Functions

### messagingOnboardingMetrics.ts

```typescript
// Get today's metrics
getOnboardingMetricsToday(): Promise<MsgOnboardingDailyMetrics | null>

// Get metrics for a specific date
getOnboardingMetrics(date: string): Promise<MsgOnboardingDailyMetrics | null>

// Get metrics for date range (last 7 days for sparklines)
getOnboardingMetricsRange(startDate: string, endDate: string): Promise<MsgOnboardingDailyMetrics[]>

// Get active sessions grouped by state
getActiveSessions(): Promise<Record<string, number>>

// Get session timeline (for debug tool)
getSessionTimeline(sessionId: string): Promise<MsgOnboardingEvent[]>

// Search session by phone (last 4 digits)
searchSessionByPhone(phoneSuffix: string): Promise<MessagingOnboardingSession[]>
```

---

## 7. Dashboard Component Structure

```
MessagingOnboardingMonitor
├── AlertPanel                    # Active alerts from systemAlerts
├── SystemHealthSection
│   ├── MetricCard × 4           # Sessions, Previews, Publishes, Avg Time
│   └── ActiveSessionsBreakdown  # By state
├── FunnelSection
│   └── FunnelChart              # 4-step funnel with rates
├── ReliabilitySection
│   ├── FailureBreakdown         # By type
│   └── StuckSessionsIndicator   # Count + last recovery
├── CostSection
│   ├── GeminiCallsCard
│   ├── CostPerPublishCard
│   └── MonthlySpendBar          # Progress vs budget
├── GrowthSection
│   ├── OORCard                  # Organic Onboarding Rate
│   └── AcquisitionSourcesPie   # Breakdown chart
├── CleanupStatus                # Last run, counts
├── DailySummary                 # Text block
└── SessionDebugTool             # Input + timeline display
```

---

## 8. Implementation Phases

### Phase 1: Data Layer (1 day)

| # | Task | File |
|---|---|---|
| 1.1 | Add `ENABLE_MESSAGING_ONBOARDING_DASHBOARD` to features.ts | `src/config/features.ts` |
| 1.2 | Create `MsgOnboardingDailyMetrics` type | `functions/src/types/messagingOnboarding.types.ts` |
| 1.3 | Create `metricsAggregator.ts` (aggregation logic) | `functions/src/messagingOnboarding/metricsAggregator.ts` |
| 1.4 | Create `checkStuckSessions.ts` | `functions/src/schedulers/checkStuckSessions.ts` |
| 1.5 | Create `monitorOnboardingHealth.ts` | `functions/src/schedulers/monitorOnboardingHealth.ts` |
| 1.6 | Export new CFs in `index.ts` | `functions/src/index.ts` |
| 1.7 | Add Firestore index for stuck session query | `firestore.indexes.json` |
| 1.8 | Add `acquisitionSource` field to session creation | `functions/src/messagingOnboarding/sessionEngine.ts` |

### Phase 2: Dashboard UI (1 day)

| # | Task | File |
|---|---|---|
| 2.1 | Create DAL for metrics | `src/database/ops/messagingOnboardingMetrics.ts` |
| 2.2 | Create types | `src/lib/ops/messagingOnboardingTypes.ts` |
| 2.3 | Create dashboard component | `src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx` |
| 2.4 | Create route page | `src/app/(main)/ops/messaging-onboarding/page.tsx` |
| 2.5 | Add to Ops Control Room navigation | `src/components/.../opsControlRoom/index.tsx` |

---

## 9. Security

- Platform-only access (`platformRole === 'PLATFORM'`)
- No PII exposure (phone numbers masked to last 4 digits in UI)
- Session debug tool only accessible to platform admins
- Metrics collection has admin-only Firestore rules

---

## 10. Cost Estimate

| Resource | Operations/month | Unit Cost | Monthly Cost |
|---|---|---|---|
| Metrics aggregation writes | 20,000 | ₹15/100K | ₹3.00 |
| Stuck session queries | 4,320 | ₹5/100K | ₹0.22 |
| Health monitor reads | 2,880 | ₹5/100K | ₹0.14 |
| Dashboard reads | ~1,000 | ₹5/100K | ₹0.05 |
| **Total** | | | **~₹3.41/month** |

---

## 11. Hardening Items (from ChatGPT review, validated)

These items are built into the dashboard system:

| Item | Implementation | Location |
|---|---|---|
| Stuck session watchdog | `checkStuckSessions` CF (every 10 min) | Phase 1.4 |
| Cleanup scheduler heartbeat | `lastCleanupAt` field updated by cleanup, monitored by health check | Phase 1.5 |
| Session doc size monitoring | Track in metrics if session doc > 200KB (future enhancement) | Deferred |
| Gemini circuit breaker | Manual via `ENABLE_MESSAGING_ONBOARDING` flag. Automated alert at cost threshold. | Phase 1.5 |
| Extraction result validation | State guard added to extractionWatcher.ts (Bug #1 fix, already done) | Done |

---

_Document Status: DOCUMENTED — Ready for Implementation. March 12, 2026._
