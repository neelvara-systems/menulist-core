# Decision Intelligence - Implementation Document

**Created:** January 11, 2026  
**Status:** 🔒 **LOCKED — Production Ready**
**Source:** Codebase (Single Source of Truth)  
**Applies:** 3-Year Architecture Freeze Rule
**Last Verified:** May 7, 2026

---

## Architecture Overview

### 2-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: CLOUD FUNCTION (hourly :30, timezone-aware)       │
│                                                             │
│  computeDecisionBlocksScores (onSchedule)                  │
│  ├── Fetch storesSummary (1 read, cost-optimized)          │
│  ├── Process only stores whose business-day settlement is due│
│  ├── For each active store:                                 │
│  │     └── For each active project:                         │
│  │           ├── Read project at projects/{tId}/{sId}/{id} │
│  │           ├── Read 7-day intelligence analytics snapshot │
│  │           ├── Extract items from project.files           │
│  │           ├── Calculate scores per block type            │
│  │           ├── Store top 3 candidates per block           │
│  │           └── Set TTL (48 hours)                         │
│  └── Write: project.publicDecisionBlocks                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: RUNTIME FILTER (Client-side)                       │
│                                                             │
│  DecisionBlocks.tsx                                         │
│  ├── Read owner controls from project.menuSettings          │
│  ├── Check: isPrecomputedValid() (TTL check)               │
│  ├── If valid: computeFromPrecomputed()                    │
│  │     └── selectAvailableCandidate()                      │
│  │           ├── Check: item.active === true               │
│  │           ├── Check: item.available === true            │
│  │           ├── Check: Category time slot valid           │
│  │           └── Return first available                     │
│  ├── If valid but activation gate fails: pinned-only       │
│  └── If missing/expired: computeBlocksFallback()           │
│        └── Show owner-pinned only (no client ranking)      │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── config/
│   └── decisionBlocks.ts              # Block config, labels, duration, reason keys
├── data/
│   └── decisionBlockTranslations.ts   # i18n EN/HI translations
├── components/templates/main-app/projects/
│   ├── b2cView/output/
│   │   └── DecisionBlocks.tsx         # Customer-facing UI (576 lines)
│   ├── editorView/
│   │   └── DecisionBlocksSettingsModal.tsx  # Owner settings (429 lines)
│   └── types/
│       └── decisionBlocks.types.ts    # Client types (DecisionBlockEntry, PrecomputedDecisionBlocks)

functions/
└── src/
    ├── decisionBlocksScoring.ts       # Timezone-aware scheduler + manual trigger
    ├── constants/
    │   └── database.ts                # Collection names + helpers
    └── intelligence/
        └── shared/
            ├── scoreNormalizer.ts      # WEIGHTS, THRESHOLDS, DURATIONS, normalize() — single source of truth
            ├── analyticsAggregator.ts  # 7-day analytics fetch (shared with CMI)
            └── itemExtractor.ts       # Item extraction from project files (shared with CMI)
```

## Runtime Entry Points

| Surface | File | Responsibility |
| ------- | ---- | -------------- |
| Scheduled generation | `functions/src/decisionBlocksScoring.ts` | Hourly scheduler that processes stores whose local settlement window is due. |
| Manual recovery | `triggerDecisionBlocksScoring` in `functions/src/decisionBlocksScoring.ts` | Platform-only callable used by Scheduler Monitor to recompute Decision Blocks. |
| Public precomputed read | `src/app/client/[[...slug]]/page.tsx` | Uses `project.publicDecisionBlocks` from the already-loaded project document. |
| Customer rendering | `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx` | Applies TTL, lifecycle, owner controls, availability, and time-slot filters. |
| Desktop owner editing | `DecisionBlocksSettingsModal.tsx` | Saves pins/toggles into `project.menuSettings.decisionBlocks`. |
| Mobile owner editing | `SmartRecommendationsSheet.tsx` | Same settings model as desktop, saved through the project DAL. |

---

## Database Schema

### Project Field: `publicDecisionBlocks`

**Path:** `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks`

```typescript
interface DecisionBlocksDocument {
  tId: string;
  sId: string;
  projectId: string;

  // Top 3 candidates per block (sorted by score desc)
  popular: ScoredItem[];
  quickPick: ScoredItem[];
  bestValue: ScoredItem[];

  computedAt: Timestamp;
  validUntil: Date; // TTL (48 hours from computation)

  statsUsed: {
    totalItems: number;
    itemsWithViews: number;
    itemsWithDuration: number;
  };
}

interface ScoredItem {
  itemId: string;
  itemName: string;
  category: string;
  score: number;
  reason: string; // i18n key
  reasonParams?: Record<string, any>; // { minutes: 5 }
  price?: number;
  duration?: number;
}
```

### Project Menu Settings

Owner controls are stored with the project, not in `decisionBlocks`.

```typescript
project.menuSettings.decisionBlocks = {
  enablePopular?: boolean;
  enableQuickPick?: boolean;
  enableBestValue?: boolean;
  pinnedPopular?: string;
  pinnedQuickPick?: string;
  pinnedBestValue?: string;
};
```

Generated ranking data is stored as the customer-safe `project.publicDecisionBlocks` projection so the public menu can reuse the already-loaded project document and avoid one extra Firestore read. Owner-authored controls remain separate in `project.menuSettings.decisionBlocks`, and owner-side `updateProject()` saves strip `publicDecisionBlocks` so generated scorer output is not overwritten by dashboard/mobile edit payloads.

Owner pins are evaluated before automatic candidate ranking gates in the public renderer. A pin can render even when a block lacks enough analytics coverage or the scheduler produced no candidate for that block, but it still must pass runtime safety checks: item exists, item is active, item is available, category time slot is active, the block is enabled for the business type, and Best Value is hidden when prices are hidden.

### Collection: `analytics`

**Primary scoring input:** `{tId}_{sId}_{projectId}_intelligence_7d`

**Daily source documents:** `{tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}` are settled into the compact intelligence snapshot by the nightly analytics aggregation step.

Used data:

- `viewsByItem: Record<string, number>`
- `clicksByItem: Record<string, number>`
- `recommendationClicksByItem: Record<string, number>`
- `itemNames: Record<string, string>`
- `daysWithData: number`

---

## Scoring Implementation

### Popular Right Now

```typescript
function calculatePopularScore(item, maxViews, maxClicks, maxOrders) {
  const viewScore = normalize(item.views, maxViews) * 0.4;
  const clickScore = normalize(item.clicks, maxClicks) * 0.3;
  const orderScore = normalize(item.orders, maxOrders) * 0.2;
  const boostScore = ((item.ownerBoost + 20) / 40) * 100 * 0.1;
  const bestSellerBonus = item.isBestSeller ? 10 : 0;

  return viewScore + clickScore + orderScore + boostScore + bestSellerBonus;
}
```

### Quick Pick

```typescript
function calculateQuickPickScore(item, businessCategory, maxPopularity) {
  const threshold = QUICK_PICK_THRESHOLDS[businessCategory];
  const duration = item.duration || DEFAULT_DURATIONS[businessCategory];

  // Ineligible if too slow
  if (duration > threshold * 2) return -1;

  const durationScore = Math.max(0, 100 - (duration / threshold) * 50) * 0.6;
  const popularityScore = normalize(popularity, maxPopularity) * 0.3;
  const boostScore = ((item.ownerBoost + 20) / 40) * 100 * 0.1;

  return durationScore + popularityScore + boostScore;
}
```

### Best Value

```typescript
function calculateBestValueScore(item, maxPopularity, avgPrice) {
  if (!item.price || item.price <= 0) return -1;

  const valueRatio = popularity / item.price;
  const maxValueRatio = maxPopularity / (avgPrice * 0.5);
  const valueScore = normalize(valueRatio, maxValueRatio) * 0.7;
  const popularityScore = normalize(popularity, maxPopularity) * 0.2;
  const boostScore = ((item.ownerBoost + 20) / 40) * 100 * 0.1;

  return valueScore + popularityScore + boostScore;
}
```

---

## Runtime Availability Filter

```typescript
function selectAvailableCandidate(
  candidates,
  items,
  categoryMap,
  usedItemIds,
  pinnedId,
) {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const isAvailable = (itemId) => {
    const item = itemMap.get(itemId);
    if (!item) return false;
    if (item.active === false) return false; // Permanently disabled
    if (item.available === false) return false; // Sold out
    if (!isCategoryWithinTimeSlot(categoryMap.get(item.category))) return false;
    if (usedItemIds.has(itemId)) return false; // Already used in another block
    return true;
  };

  // Try owner-pinned first
  if (pinnedId && isAvailable(pinnedId)) {
    usedItemIds.add(pinnedId);
    return { item: itemMap.get(pinnedId), reason: "decision.pinned.ownerPick" };
  }

  // Find first available from precomputed automatic candidates
  for (const candidate of candidates) {
    if (isAvailable(candidate.itemId)) {
      usedItemIds.add(candidate.itemId);
      return { item: itemMap.get(candidate.itemId), reason: candidate.reason };
    }
  }

  return undefined; // Block will be hidden
}
```

---

## i18n Implementation

### Translations File

```typescript
// src/data/decisionBlockTranslations.ts
export const DECISION_BLOCK_TRANSLATIONS = {
  en: {
    "decision.popular.food.favorite": "Customer favorite",
    "decision.quickPick.food.readyIn": "Ready in {minutes} min",
    "decision.bestValue.food.greatValue": "Great value",
    "decision.pinned.ownerPick": "Owner's choice",
    // ... more keys
  },
  hi: {
    "decision.popular.food.favorite": "ग्राहकों की पसंद",
    "decision.quickPick.food.readyIn": "{minutes} मिनट में तैयार",
    // ... more keys
  },
};
```

### Runtime Translation

```typescript
const translateReason = (reason, params) => {
  if (!reason.startsWith("decision.")) return reason;

  let translation = getDecisionBlockTranslation(reason, activeLanguage);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      translation = translation.replace(`{${key}}`, String(value));
    });
  }

  return translation;
};
```

---

## Analytics Integration

### Events

```typescript
// Render tracking (once per session)
trackDecisionBlocksRendered(["popular", "quickPick", "bestValue"]);

// Click tracking
trackDecisionBlockClick(
  blockType, // 'popular' | 'quickPick' | 'bestValue'
  itemId,
  itemName,
  category,
  price,
);
```

### CTR Calculation

```
CTR = DECISION_BLOCK_CLICK / DECISION_BLOCKS_RENDERED
```

---

## Security

| Check                  | Implementation                               |
| ---------------------- | -------------------------------------------- |
| Cloud Function auth    | Scheduler-triggered (not public)             |
| Manual recovery auth   | Callable requires authenticated `PLATFORM` role |
| Multi-tenant isolation | `{tId}_{sId}_{projectId}` document keys      |
| No sensitive data      | Only item IDs + scores stored                |
| Owner controls         | Via `menuSettings.decisionBlocks` in project |
| Public precomputed read | Server-side Admin SDK read, not a client Firestore rules dependency |

---

## Performance

| Metric               | Value    | Rationale                 |
| -------------------- | -------- | ------------------------- |
| Scheduler timeout    | 540s     | Process 1000+ projects    |
| TTL                  | 48 hours | Buffer if scheduler fails |
| Candidates per block | 3        | Fallback for unavailable  |
| storesSummary read   | 1        | Cost optimization         |

---

## Feature Flag

```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  ENABLE_DECISION_BLOCKS: true,
};
```

---

## Owner Settings UI

```typescript
// DecisionBlocksSettingsModal.tsx
interface DecisionBlocksSettings {
  enablePopular?: boolean; // Default: true
  enableQuickPick?: boolean; // Default: true
  enableBestValue?: boolean; // Default: true
  pinnedPopular?: string; // itemId
  pinnedQuickPick?: string; // itemId
  pinnedBestValue?: string; // itemId
}
```

---

## CMI Integration

Decision Blocks scheduler also computes Menu Intelligence:

```typescript
// After Decision Blocks computed (line 604-629)
const analytics = await fetch7DayAnalytics(db, tId, sId, projectId);
const items = extractActiveItems(projectData, analytics);
const intelligence = computeIntelligenceState(
  items,
  analytics,
  currentIntelligence,
);
await db
  .collection(DB_COLLECTIONS.MENU_INTELLIGENCE)
  .doc(miDocId)
  .set(intelligence);
```

---

## Scheduler Monitor Dashboard

### Overview

A dedicated monitoring page at `/ops/scheduler` provides real-time visibility into nightly scheduler health, run history, per-task breakdown, and error inspection.

### Access

- **Route:** `/ops/scheduler`
- **Access:** `platformRole === 'PLATFORM'` only (superadmin)
- **Navigation:** Ops Control Room → "Scheduler Monitor" button, or direct URL

### Dashboard Sections

| Section               | What It Shows                                                                        |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Health Badge**      | Overall status: Healthy (green) / Warning (orange) / Critical (red) / No Data (grey) |
| **Last Run Summary**  | Timestamp, duration, stores/projects processed, runs in last 7 days, avg duration    |
| **Task Breakdown**    | Per-task status for all 8 sub-tasks with timing and details                          |
| **Error Details**     | Expandable error list with tId, sId, projectId, and error message                    |
| **Run History Table** | Filterable by status (success/partial/failed) and trigger (scheduled/manual)         |
| **Manual Trigger**    | "Run Scheduler Now" button — calls `triggerDecisionBlocksScoring` callable CF        |
| **Quick Reference**   | Schedule, timeout, task list, TTL, dead man's switch info                            |

### Health Status Logic

| Status       | Condition                                                                        |
| ------------ | -------------------------------------------------------------------------------- |
| **Healthy**  | Last run succeeded and is within 26 hours                                        |
| **Warning**  | Last run had errors (partial), or 1-2 consecutive failures, or last run >26h ago |
| **Critical** | 3+ consecutive failures                                                          |
| **No Data**  | No scheduler runs found in Firestore                                             |

### Data Model

**Collection:** `schedulerRunLogs`

```typescript
interface SchedulerRunLog {
  trigger: "scheduled" | "manual";
  triggeredBy: string; // 'system' or userId
  startedAt: Timestamp;
  completedAt: Timestamp;
  durationMs: number;
  status: "success" | "partial" | "failed";
  totalStores: number;
  totalProjects: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  intelligenceSuccess: number;
  intelligenceFailed: number;
  tasks: SchedulerTaskResult[];
  errors: Array<{ tId; sId; projectId?; error }>;
}
```

### File Structure

```
src/
├── app/(main)/ops/scheduler/page.tsx               # Page route
├── components/templates/main-app/platform/
│   └── schedulerMonitor/index.tsx                   # Dashboard UI (~350 lines)
├── database/ops/scheduler.ts                        # DAL (read-only, ~3 reads/load)
└── lib/ops/schedulerTypes.ts                        # Shared types

functions/
└── src/decisionBlocksScoring.ts                     # CF writes run log after each run
```

### Firestore Indexes Required

```
schedulerRunLogs: status ASC + startedAt DESC
schedulerRunLogs: trigger ASC + startedAt DESC
```

### Firebase Cost

~3 reads per dashboard load. At 2-3 loads/day = ~270 reads/month = ~₹0.08/month.

---

## Document History

| Date       | Version | Change                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-01-11 | v1.0    | Initial implementation document from codebase                                                                                                                                                                                                                                                                                                                |
| 2026-02-09 | v1.1    | Refactor: decisionBlocksScoring.ts now imports WEIGHTS/THRESHOLDS/DURATIONS/normalize from shared scoreNormalizer.ts (eliminates duplication). Removed dead types (SCORING_WEIGHTS, DisplayBlock, MenuItemStatsDaily, MenuItemStatsAggregated) from decisionBlocks.types.ts. Updated file structure to include shared intelligence modules. Status → LOCKED. |
| 2026-02-20 | v1.2    | Added Scheduler Monitor Dashboard: persistent run logs (`schedulerRunLogs` collection), per-task tracking (8 tasks), health badge, error inspection, manual trigger, Firestore indexes. CF now persists detailed run results after each execution.                                                                                                           |

---

_Status: 🔒 LOCKED — Production Ready_
