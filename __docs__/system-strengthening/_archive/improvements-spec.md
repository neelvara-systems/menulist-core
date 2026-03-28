# 📐 System Strengthening - Improvements Specification

**Created:** January 4, 2026  
**Status:** 🔍 Stage 3 Complete  
**Purpose:** Detailed technical specifications for all improvement items

---

## Executive Summary

This document provides **detailed technical specifications** for 17 improvement items identified in the alignment analysis. Each item includes:

- Current state
- Target state
- Implementation approach
- Files affected
- Acceptance criteria

**Scope:** Strengthening only - NO new features, NO scope expansion

---

## Priority Legend

- 🔴 **P0** - Critical for 3-year freeze reliability
- 🟠 **P1** - High priority for trust/operations
- 🟡 **P2** - Medium priority enhancements

---

## 🔴 P0-1: Menu Versioning & Rollback

### Current State

- No menu snapshots
- Campaigns don't reference menu versions
- Owner edits menu → potential breakage

### Target State

- Auto-snapshot on significant changes
- Campaigns reference `menuVersionId`
- Admin rollback capability

### Technical Specification

```typescript
// New type: src/types/menuVersion.ts
interface MenuVersionSnapshot {
  versionId: string; // UUID
  projectId: string;
  tId: string;
  sId: string;
  snapshotAt: Timestamp;
  trigger: "auto" | "manual";
  triggerReason: string; // "category_deleted", "bulk_edit", etc.
  itemCount: number;
  categoryCount: number;
  data: {
    categories: Category[];
    items: Item[];
  };
}

// Storage: platformSummary/menuVersions_{sId}
// Max 10 versions per project (rolling)
```

### Implementation Approach

1. Create snapshot on: category delete, bulk item edit, AI extraction
2. Store last 10 versions in summary doc
3. Add rollback button in project settings (admin only)
4. Campaigns store `menuVersionId` for audit

### Files to Create/Modify

| File                                 | Action                           |
| ------------------------------------ | -------------------------------- |
| `src/types/menuVersion.ts`           | CREATE - Type definitions        |
| `src/database/menuVersions/index.ts` | CREATE - DAL functions           |
| `src/lib/menu/snapshotTriggers.ts`   | CREATE - Auto-snapshot logic     |
| `src/database/projects/index.ts`     | MODIFY - Call snapshot on edits  |
| `src/types/campaigns.ts`             | MODIFY - Add menuVersionId field |

### Acceptance Criteria

- [ ] Deleting category triggers auto-snapshot
- [ ] Max 10 versions per project
- [ ] Rollback restores previous state
- [ ] Campaigns reference version ID

---

## 🔴 P0-2: Orphan Item Detection

### Current State

- Items can exist without valid category
- No validation on save
- Ghost data accumulates

### Target State

- Orphan detection on project save
- Auto-heal: orphans → "Uncategorized"
- Logging for admin visibility

### Technical Specification

```typescript
// src/lib/menu/dataIntegrity.ts

export function detectOrphanItems(
  items: Item[],
  categories: Category[]
): { orphans: Item[]; healed: Item[] } {
  const categoryIds = new Set(categories.map((c) => c.id));
  const orphans: Item[] = [];
  const healed: Item[] = [];

  for (const item of items) {
    if (!categoryIds.has(item.category)) {
      orphans.push(item);
      // Auto-heal: assign to "Uncategorized"
      item.category = "uncategorized";
      healed.push(item);
    }
  }

  return { orphans, healed };
}

export function detectGhostCategories(
  categories: Category[],
  items: Item[]
): Category[] {
  const usedCategoryIds = new Set(items.map((i) => i.category));
  return categories.filter(
    (c) => !usedCategoryIds.has(c.id) && c.id !== "uncategorized"
  );
}
```

### Files to Create/Modify

| File                             | Action                                     |
| -------------------------------- | ------------------------------------------ |
| `src/lib/menu/dataIntegrity.ts`  | CREATE - Detection functions               |
| `src/database/projects/index.ts` | MODIFY - Call on save                      |
| `src/config/features.ts`         | MODIFY - Add `ENABLE_DATA_INTEGRITY_CHECK` |

### Acceptance Criteria

- [ ] Orphan items detected on save
- [ ] Auto-healed to "Uncategorized"
- [ ] Ghost categories logged (not auto-deleted)
- [ ] Admin notified of healing

---

## 🔴 P0-3: Cost Anomaly Alerts

### Current State

- No Firebase cost monitoring
- No Gemini API alerts
- Manual budget checking

### Target State

- Daily cost aggregation
- Alert when >150% of baseline
- Slack/email notification

### Technical Specification

```typescript
// functions/src/costMonitoring.ts

interface DailyCostMetrics {
  date: string;
  firestoreReads: number;
  firestoreWrites: number;
  storageBytes: number;
  geminiCalls: number;
  estimatedCostINR: number; // ₹ per user preference
}

// Thresholds
const ALERT_THRESHOLDS = {
  firestoreReads: 1.5, // 150% of 7-day avg
  geminiCalls: 2.0, // 200% of 7-day avg
  estimatedCost: 1.5, // 150% of 7-day avg
};
```

### Implementation Approach

1. Cloud Function runs daily at 3 AM
2. Query Firebase usage APIs
3. Compare against 7-day rolling average
4. Log to `systemTelemetry` collection
5. Alert via Sentry + optional Slack

### Files to Create

| File                                | Action                     |
| ----------------------------------- | -------------------------- |
| `functions/src/costMonitoring.ts`   | CREATE - Daily aggregation |
| `functions/src/alerts/costAlert.ts` | CREATE - Alert logic       |
| `src/types/telemetry.ts`            | CREATE - Type definitions  |

### Acceptance Criteria

- [ ] Daily metrics logged to Firestore
- [ ] Alert triggers at 150% threshold
- [ ] Sentry event created for anomalies
- [ ] Admin can view cost history

---

## 🔴 P0-4: AI Kill Switch

### Current State

- Rate limiting only
- No instant disable
- AI failure = user waits for timeout

### Target State

- Instant AI disable via feature flag
- Graceful fallback message
- No API calls when disabled

### Technical Specification

```typescript
// src/config/features.ts - ADD
ENABLE_AI_GENERATION: true,  // Master AI switch

// src/lib/ai/killSwitch.ts
export function isAIEnabled(): boolean {
    // Check feature flag first (instant)
    if (!FEATURE_FLAGS.ENABLE_AI_GENERATION) {
        return false;
    }
    // Future: Check runtime config for per-tenant disable
    return true;
}

export const AI_DISABLED_MESSAGE =
    "AI features are temporarily unavailable. Please try again later.";
```

### Files to Modify

| File                                      | Action                              |
| ----------------------------------------- | ----------------------------------- |
| `src/config/features.ts`                  | MODIFY - Add `ENABLE_AI_GENERATION` |
| `src/lib/ai/killSwitch.ts`                | CREATE - Kill switch logic          |
| `src/app/api/descriptions/route.ts`       | MODIFY - Check kill switch          |
| `src/app/api/image-generation/route.ts`   | MODIFY - Check kill switch          |
| `src/app/api/campaigns/generate/route.ts` | MODIFY - Check kill switch          |
| `src/app/api/campaigns/caption/route.ts`  | MODIFY - Check kill switch          |

### Acceptance Criteria

- [ ] Setting flag to false stops all AI calls
- [ ] Graceful error message returned
- [ ] No API timeouts when disabled
- [ ] Can re-enable instantly

---

## 🔴 P0-5: Blank Screen Detection

### Current State

- No monitoring of screen page
- Blank screen = silent failure
- Owner embarrassment risk

### Target State

- Client-side blank detection
- Report to server on failure
- Admin alert for blank events

### Technical Specification

```typescript
// src/app/screen/[token]/ScreenMonitor.tsx

export function useScreenHealth(slides: ScreenSlide[]) {
  useEffect(() => {
    // Blank detection
    if (slides.length === 0) {
      reportScreenHealth({
        status: "blank",
        token: screenToken,
        timestamp: new Date(),
        reason: "no_slides",
      });
    }

    // Heartbeat every 5 minutes
    const interval = setInterval(() => {
      reportScreenHealth({
        status: "healthy",
        token: screenToken,
        slideCount: slides.length,
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [slides]);
}

// API: POST /api/screen/health
// Logged to: systemTelemetry/screen_{date}
```

### Files to Create

| File                                       | Action                     |
| ------------------------------------------ | -------------------------- |
| `src/app/screen/[token]/ScreenMonitor.tsx` | CREATE - Health monitoring |
| `src/app/api/screen/health/route.ts`       | CREATE - Health endpoint   |
| `functions/src/alerts/screenHealth.ts`     | CREATE - Alert on blank    |

### Acceptance Criteria

- [ ] Blank screen triggers health report
- [ ] 5-minute heartbeat logged
- [ ] Admin alert on 3+ consecutive blanks
- [ ] Dashboard shows screen status

---

## 🟠 P1-1: Rebuild Summary Scripts

### Current State

- No automated rebuild
- Manual intervention required
- Summary drift undetected

### Target State

- One-click rebuild per collection
- Scheduled integrity check
- Admin UI for rebuild

### Technical Specification

```typescript
// functions/src/maintenance/rebuildSummary.ts

export async function rebuildProjectsSummary(sId: string): Promise<void> {
  // 1. Fetch all projects for store
  // 2. Rebuild platformSummary/projects_{sId}
  // 3. Log operation to systemTelemetry
}

export async function rebuildCampaignsSummary(sId: string): Promise<void> {
  // 1. Fetch all campaigns for store
  // 2. Rebuild platformSummary/campaigns_{sId}
  // 3. Log operation
}

// Callable from admin UI or Cloud Function
```

### Files to Create

| File                                                       | Action |
| ---------------------------------------------------------- | ------ |
| `functions/src/maintenance/rebuildSummary.ts`              | CREATE |
| `src/app/api/admin/rebuild-summary/route.ts`               | CREATE |
| `src/components/templates/platform/admin/RebuildTools.tsx` | CREATE |

### Acceptance Criteria

- [ ] Admin can rebuild any summary doc
- [ ] Operation logged with before/after counts
- [ ] No data loss during rebuild
- [ ] Completes in <30 seconds per store

---

## 🟠 P1-2: Central Copy Registry

### Current State

- Strings scattered across 100+ files
- No single source of truth
- Language drift risk

### Target State

- All owner-facing text in registry
- ESLint rule for enforcement
- Type-safe string references

### Technical Specification

```typescript
// src/config/copyRegistry.ts

export const OWNER_COPY = {
  // Today Tab
  today: {
    emptyState: "Nothing to do today. Silence is okay.",
    skipConfirm: "Skip this suggestion?",
    completeSuccess: "Done! We'll remember this worked.",
  },

  // Owner Dashboard
  dashboard: {
    heroWorking: "Your menu is working!",
    heroNoData: "No activity yet this week",
    scansLabel: "Menu Scans",
    tapsLabel: "Item Taps",
  },

  // Campaigns
  campaigns: {
    mealPush: "Time to highlight a meal",
    bestseller: "Your bestseller is ready to shine",
  },

  // FORBIDDEN - never use these
  _forbidden: [
    "worked",
    "improved",
    "analytics",
    "best time",
    "AI says",
    "recommended by AI",
    "our algorithm",
  ],
} as const;

export type CopyKey = keyof typeof OWNER_COPY;
```

### ESLint Rule (Future)

```javascript
// .eslintrc.js - custom rule
"no-inline-owner-strings": "error"
```

### Files to Create

| File                         | Action               |
| ---------------------------- | -------------------- |
| `src/config/copyRegistry.ts` | CREATE - All strings |
| `src/hooks/useCopy.ts`       | CREATE - Access hook |

### Migration Approach

1. Create registry with all current strings
2. Gradually migrate components
3. Add ESLint rule (future phase)

### Acceptance Criteria

- [ ] Registry contains all owner-facing strings
- [ ] New components use registry
- [ ] Forbidden phrases documented
- [ ] Type-safe string access

---

## 🟠 P1-3: Forbidden Phrase Guard

### Current State

- No runtime check
- Forbidden words can slip in
- Trust erosion risk

### Target State

- Runtime validation on AI outputs
- Build-time check on copy
- Alert on violations

### Technical Specification

```typescript
// src/lib/trust/phraseGuard.ts

const FORBIDDEN_PHRASES = [
  "worked",
  "improved",
  "analytics",
  "best time",
  "AI says",
  "recommended by AI",
  "our algorithm",
  "based on data",
  "performance",
  "insights",
];

export function containsForbiddenPhrase(text: string): {
  hasForbidden: boolean;
  matches: string[];
} {
  const lowerText = text.toLowerCase();
  const matches = FORBIDDEN_PHRASES.filter((phrase) =>
    lowerText.includes(phrase.toLowerCase())
  );
  return {
    hasForbidden: matches.length > 0,
    matches,
  };
}

// Use in AI caption generation
export function sanitizeAIOutput(text: string): string {
  const check = containsForbiddenPhrase(text);
  if (check.hasForbidden) {
    logger.security(
      "Forbidden phrase in AI output",
      {
        matches: check.matches,
        originalText: text.substring(0, 100),
      },
      "medium"
    );

    // Fallback to safe generic text
    return OWNER_COPY.campaigns.genericCaption;
  }
  return text;
}
```

### Files to Create/Modify

| File                                     | Action             |
| ---------------------------------------- | ------------------ |
| `src/lib/trust/phraseGuard.ts`           | CREATE             |
| `src/app/api/campaigns/caption/route.ts` | MODIFY - Add guard |
| `src/app/api/descriptions/route.ts`      | MODIFY - Add guard |

### Acceptance Criteria

- [ ] AI outputs checked before return
- [ ] Forbidden phrases replaced with safe text
- [ ] Security log on violations
- [ ] No forbidden text reaches owner UI

---

## 🟠 P1-4: QR Menu Offline Fallback

### Current State

- Menu page requires network
- Offline = blank page
- Poor UX in low connectivity

### Target State

- Service Worker caches menu
- Offline fallback shows cached menu
- "Offline - data may be stale" banner

### Technical Specification

```typescript
// public/menu-sw.js (Service Worker)

const CACHE_NAME = "menu-cache-v1";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/menu/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          // Update cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        });

        return cached || networkFetch;
      })
    );
  }
});
```

### Files to Create

| File                                     | Action                     |
| ---------------------------------------- | -------------------------- |
| `public/menu-sw.js`                      | CREATE - Service Worker    |
| `src/app/menu/[token]/OfflineBanner.tsx` | CREATE - Offline indicator |
| `src/hooks/useOfflineMenu.ts`            | CREATE - Offline detection |

### Acceptance Criteria

- [ ] Menu loads offline after first visit
- [ ] Offline banner shows clearly
- [ ] Cache refreshes when online
- [ ] Works on 2G/slow connections

---

## 🟡 P2-1: Server-Side Caching (Redis)

### Current State

- No server-side cache
- Every request hits Firestore
- Repeated queries expensive

### Target State

- Redis cache for hot data
- Menu data cached 5 minutes
- Analytics cached 1 hour

### Technical Specification

```typescript
// src/lib/cache/redis.ts

// Using Upstash Redis (already have for rate limiting)
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  const fresh = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}

// Cache keys
// menu:{token} - 5 min
// analytics:{tId}_{sId}_{date} - 1 hour
// screen:{token} - 1 min
```

### Files to Create

| File                     | Action                   |
| ------------------------ | ------------------------ |
| `src/lib/cache/redis.ts` | CREATE - Cache utilities |
| `src/lib/cache/keys.ts`  | CREATE - Key patterns    |

### Acceptance Criteria

- [ ] Menu data cached for 5 minutes
- [ ] Cache hit reduces Firestore reads
- [ ] Cache invalidates on menu edit
- [ ] Graceful fallback if Redis down

---

## 🟡 P2-2: Summary Drift Detection

### Current State

- No validation that summary = source
- Manual checking only
- Data inconsistency risk

### Target State

- Nightly integrity check
- Alert on drift
- Auto-repair option

### Technical Specification

```typescript
// functions/src/maintenance/driftDetection.ts

interface DriftReport {
  collection: string;
  documentId: string;
  driftType: "count_mismatch" | "missing_item" | "extra_item";
  expected: number;
  actual: number;
  severity: "low" | "medium" | "high";
}

export async function detectSummaryDrift(sId: string): Promise<DriftReport[]> {
  const reports: DriftReport[] = [];

  // Check projects summary
  const projectsSummary = await getProjectsSummary(sId);
  const actualProjects = await getAllProjects(sId);

  if (Object.keys(projectsSummary.projects).length !== actualProjects.length) {
    reports.push({
      collection: "projects",
      documentId: `projects_${sId}`,
      driftType: "count_mismatch",
      expected: actualProjects.length,
      actual: Object.keys(projectsSummary.projects).length,
      severity: "high",
    });
  }

  return reports;
}
```

### Acceptance Criteria

- [ ] Nightly drift check runs
- [ ] Drift >5% triggers alert
- [ ] Report logged to systemTelemetry
- [ ] Auto-repair available (admin trigger)

---

## Implementation Phases (Recommended Order)

### Week 1: Critical Safety

1. P0-4: AI Kill Switch (1 day)
2. P0-2: Orphan Item Detection (1 day)
3. P0-3: Cost Anomaly Alerts (2 days)

### Week 2: Operational Readiness

4. P1-1: Rebuild Summary Scripts (2 days)
5. P0-5: Blank Screen Detection (2 days)

### Week 3: Trust Psychology

6. P1-2: Central Copy Registry (3 days)
7. P1-3: Forbidden Phrase Guard (1 day)

### Week 4: Data Safety

8. P0-1: Menu Versioning (3 days)
9. P1-4: QR Menu Offline (2 days)

### Future (Post-Launch)

10. P2-1: Server-Side Caching
11. P2-2: Summary Drift Detection

---

## Risk Assessment

| Risk                                | Mitigation                       |
| ----------------------------------- | -------------------------------- |
| Menu versioning adds storage cost   | Rolling 10-version limit         |
| Copy registry migration is large    | Gradual adoption, no hard cutoff |
| Redis adds infrastructure           | Using existing Upstash           |
| Blank detection has false positives | Require 3 consecutive reports    |

---

**Document Status:** ✅ Stage 3 Complete  
**Last Updated:** January 4, 2026
