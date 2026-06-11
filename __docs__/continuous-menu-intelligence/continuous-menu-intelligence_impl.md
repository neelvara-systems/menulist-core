# Continuous Menu Intelligence - Implementation Plan

**Created:** January 8, 2026
**Last Updated:** June 11, 2026
**Status:** Controlled owner testing ready in audited slice; full MenuList certification pending
**Author:** Lead Architect (Cascade)
**Applies:** 3-Year Architecture Freeze Rule

> **⚠️ March 2026 Strategic Repositioning:** CMI autonomous actions (AUTO_HIDE, AUTO_PROMOTE, etc.) are architecturally classified as GrowthOS territory. Code stays in place (feature-flagged, safety-gated) but the observation layer is what MenuList owns. See `_archive/chatgpt-review-strategic-repositioning.md`.

---

## Architectural Boundary (March 2026)

### MenuList Owns (Observation Layer)

- Confidence score computation (`calculateConfidence()`)
- Time eligibility tracking (`calculateTimeEligibility()`)
- Suppression window detection (`calculateSuppressionWindows()`) — detects fatigue, logs it
- Calibration lock computation (`checkCalibrationLock()`)
- Audit log persistence (all observations logged with reasons)
- Intelligence state document write (`menuIntelligence/{tId}_{sId}_{projectId}`)
- Stability mode detection (low data → evergreen only)

### GrowthOS Owns (Optimization Layer — Deferred)

- Acting on AUTO_HIDE/PROMOTE/DEMOTE/SUPPRESS/ADJUST_TIME/STABILIZE
- Surface slot allocation (Today tab, screens, recommendations)
- Promotion rotation and attention budgeting
- Cross-restaurant learning and global intelligence
- Contextual bandits / explore-exploit algorithms

### Code Status

All autonomous action logic exists in `functions/src/intelligence/menuIntelligence.ts` and runs inside the unified hourly scheduler when a store's local settlement window is due. The actions are **computed and logged** in the intelligence state document. Downstream DAL helpers (`getItemPresentation()` and `getItemsByPriority()` in `src/lib/intelligence/dal.ts`) read this state as a priority-only layer; they do not hide menu truth. When GrowthOS launches, these become active optimization behaviors.

### Future Scoring Improvements (Documented, Not Scheduled)

| Improvement           | Current                                | Proposed                                                                 | Source             |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| Multi-signal scoring  | clicks + DB clicks + ownerBoost        | + item views + considerations + dwell                                    | ChatGPT March 2026 |
| Calibration trigger   | Fixed 21-day lock                      | Data sufficiency (`projectViews >= 2000 AND itemViews >= 200`)           | ChatGPT March 2026 |
| Fatigue model         | Day-based (`stableDays >= 5`)          | Exposure-based (`exposures > 200 AND CTR < threshold`)                   | ChatGPT March 2026 |
| CTR denominator       | `clicksByItem / totalViews` (fallback) | `clicksByItem / viewsByItem` (per-item) — **viewsByItem already exists** | ChatGPT March 2026 |
| Signal schema version | None                                   | Add `signalSchemaVersion: 1` to intelligence state                       | ChatGPT March 2026 |

### Future Signal Architecture (For Scale — 50+ Active Restaurants)

| Signal                    | Status                                    | Purpose                                                          |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `menu_view`               | ✅ Tracked (`unified.ts`)                 | Session start, traffic baseline                                  |
| `item_click`              | ✅ Tracked (`clicksByItem`)               | Strongest intent signal                                          |
| `item_impression`         | ✅ Tracked (`viewsByItem`)                | What users actually saw                                          |
| `recommendation_click`    | ✅ Tracked (`recommendationClicksByItem`) | AI recommendation interaction                                    |
| `item_considered` (dwell) | ❌ Not tracked                            | Attention without click (IntersectionObserver, 1200ms threshold) |
| `surface_exposure`        | ❌ Not tracked                            | Where item appeared (menu/screen/recommendation)                 |

### Future Client Optimization (For Scale — 100K+ Restaurants)

- Client-side session buffering (aggregate on client, one write per session)
- `navigator.sendBeacon()` for reliable page-close delivery
- `localStorage` retry queue for failed flushes
- Session batching to reduce Firestore writes from ~50/session to 1/session

---

## Analysis: ChatGPT vs. Codebase

### What Already Exists (Leverage)

| Component                     | Location                                 | Relevance                                                                                   |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Decision Blocks Scheduler** | `functions/src/decisionBlocksScoring.ts` | **EXTEND THIS** - Already iterates stores/projects, fetches compact 7-day analytics snapshots, extracts items |
| GrowthOS ranking              | `src/lib/growthos/actionRanking.ts`      | Current generated-action ranking source after old Social Content engine deletion            |
| Slide Generator               | `src/lib/screen/slideGenerator.ts`       | Already uses confidence thresholds (0.7), monotonicity                                      |
| Analytics Tracking            | `src/lib/analytics/unified.ts`           | Tracks views, taps, decision block clicks                                                   |
| Confidence Thresholds         | `src/type/campaigns.ts`                  | `CONFIDENCE_THRESHOLDS` already defined                                                     |
| storesSummary Pattern         | `platformSummary/storesSummary`          | Cost-optimized store iteration (1 read vs N)                                                |
| DB_COLLECTIONS                | `functions/src/constants/database.ts`    | Centralized collection names                                                                |

### What Needs Building (Extend Existing) — ✅ BUILT (verified Feb 24, 2026)

| Component                     | Purpose                                      | Priority | Status                                                         |
| ----------------------------- | -------------------------------------------- | -------- | -------------------------------------------------------------- |
| Shared analytics module       | Extract 7-day fetch from Decision Blocks     | P0       | ✅ Built                                                       |
| Shared item extraction module | Extract item parsing from Decision Blocks    | P0       | ✅ Built                                                       |
| Menu Intelligence computation | Add to Decision Blocks loop                  | P0       | ✅ `functions/src/intelligence/menuIntelligence.ts`            |
| Intelligence state schema     | Firestore document structure (project-level) | P0       | ✅ `src/types/intelligence.ts` + `menuIntelligence` collection |
| Audit log writer              | Internal action logging                      | P0       | ✅ Built                                                       |
| Campaign engine integration   | Read intelligence state                      | P0       | ✅ `src/lib/intelligence/dal.ts`                               |
| Screen generator integration  | Read intelligence state                      | P0       | ✅ Built                                                       |

> **Codebase Evidence:** Cloud Function at `functions/src/intelligence/menuIntelligence.ts` (8 matches), integrated in `functions/src/decisionBlocksScoring.ts` (4 matches). Client-side DAL at `src/lib/intelligence/dal.ts` (10 matches). Types at `src/types/intelligence.ts`. Collection: `menuIntelligence` in `DB_COLLECTIONS`.

### ⚠️ Architecture Decision: Extend Decision Blocks, NOT Separate Job

**ChatGPT proposed:** New `menuIntelligenceJob.ts` running at 2:00 AM
**Cascade decision:** Extend `decisionBlocksScoring.ts` (hourly trigger; store-local settlement window)

**Why:**

- Decision Blocks already iterates ALL stores → ALL projects
- Decision Blocks already fetches the compact 7-day intelligence analytics snapshot (same data we need)
- Decision Blocks already extracts items from `project.files`
- One cold start instead of two
- One Firestore read instead of two (analytics)
- Single source of truth for item scoring

---

## Analytics Data Structure (Current State)

### What We Track Today

**Collection:** `analytics`
**Primary CMI/Decision Blocks input:** `{tId}_{sId}_{projectId}_intelligence_7d`
**Daily source documents:** `{tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}` are settled into the compact 7-day snapshot before CMI consumes them.

```typescript
// From src/lib/analytics/types.ts + src/lib/analytics/unified.ts
interface DailyAnalyticsDocument {
  // Aggregate metrics
  totalViews: number;           // Page loads (menu opened)
  totalClicks: number;          // Any item clicked
  totalSessions: number;        // Unique visitors (session count)

  // Per-item clicks (THE KEY SIGNAL)
  clicksByItem: {               // We have this
    [itemId: string]: number;   // e.g., "item_123": 15
  };
  itemNames: {                  // For display purposes
    [itemId: string]: string;   // e.g., "item_123": "Butter Chicken"
  };

  // Decision Blocks tracking
  totalDecisionBlocksRendered: number;
  decisionBlocksRendered: {     // Which blocks shown
    popular: number;
    quickPick: number;
    bestValue: number;
  };
  recommendationClicksByItem: { // Clicks from Decision Blocks
    [itemId: string]: number;
  };
  totalRecommendationClicks: number;
  recommendationClicks: {
    popular: number;
    quickPick: number;
    bestValue: number;
  };

  // Time patterns (aggregate, not per-item)
  hourlyViews: { [hour: string]: number };   // "00"-"23"
  hourlyClicks: { [hour: string]: number };
  hourlyRecommendationClicks: { [hour: string]: number };
  hourlyDecisionBlocksRendered: { [hour: string]: number };

  // Device/Location breakdowns
  viewsByDevice: { mobile: number; desktop: number; tablet: number; };
  clicksByDevice: { ... };
  viewsByLocation: { [locationKey: string]: number };
  clicksByLocation: { ... };

  // UTM tracking
  viewsBySource: { direct: number; [source: string]: number; };
  viewsByMedium: { ... };
  viewsByCampaign: { ... };

  lastUpdated: Timestamp;
}
```

### What We DON'T Track (Gaps)

| Missing                                  | Impact                           | Decision                                     |
| ---------------------------------------- | -------------------------------- | -------------------------------------------- |
| ~~`viewsByItem` (per-item impressions)~~ | ~~Can't calculate true CTR~~     | ✅ **IMPLEMENTED** - tracks item modal opens |
| ~~`hourlyClicksByItem` (time-of-day)~~   | ~~Can't detect best time slots~~ | ✅ **IMPLEMENTED** - tracks clicks by hour   |
| Order/purchase data                      | Can't measure conversions        | **Out of scope** - no POS integration        |
| Scroll depth / dwell time                | Can't measure item visibility    | **Acceptable** - clicks are sufficient       |

### Confidence Calculation Formula

Given the data we have:

```typescript
// True CTR per item (now possible with viewsByItem)
const itemCTR = clicksByItem[itemId] / (viewsByItem[itemId] || 1);

// Fallback engagement rate (if no per-item views)
const engagementRate = clicksByItem[itemId] / totalViews;

// Decision Block bonus (higher value interaction)
const dbClicks = recommendationClicksByItem[itemId] || 0;
const dbBonus = dbClicks * 2; // Weight 2x

// Owner influence
const ownerBoost = item.ownerBoost || 0; // -20 to +20
const bestSellerBonus = item.isBestSeller ? 10 : 0;

// Combined score (0-100 scale, then normalize to 0-1)
const rawScore =
  engagementRate * 100 * 0.5 + // 50% weight: engagement
  dbBonus * 0.2 + // 20% weight: decision block clicks
  ((ownerBoost + 20) / 40) * 20 + // 20% weight: owner boost (normalized)
  bestSellerBonus * 0.1; // 10% weight: best seller flag

const confidenceScore = Math.min(1, rawScore / 100);
```

---

## Disagreements & Adjustments

| #   | ChatGPT Said                                  | Cascade Adjustment                                | Reason                                                   |
| --- | --------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| 1   | Path: `menuIntelligence/{tenantId}/{storeId}` | Use `menuIntelligence/{tId}_{sId}_{projectId}`    | **Project-level** - matches Decision Blocks pattern      |
| 2   | New separate scheduler job                    | **Extend `decisionBlocksScoring.ts`**             | Same iteration, same analytics, one cold start           |
| 3   | Track owner memory separately                 | Use existing `suppressedTypes` in campaign engine | Already tracks owner skips; no duplication               |
| 4   | Real-time confidence updates                  | Nightly batch only                                | Firebase cost; SMB doesn't need real-time                |
| 5   | 7 loops                                       | 5 code loops                                      | Loops 6-7 are marketing/ops, not code                    |
| 6   | Complex ML scoring                            | Heuristic + memory                                | ML overkill for SMB; heuristics compound                 |
| 7   | Separate confidence display                   | Never show confidence                             | Already aligned with screen spec                         |
| 8   | Store-level intelligence                      | **Project-level intelligence**                    | Analytics are per-project; one store = multiple projects |

---

## Database Schema

### Firestore: `menuIntelligence/{tId}_{sId}_{projectId}`

**Key Pattern:** Same as Decision Blocks - one document per project, not per store.

```typescript
// Document ID helper (add to functions/src/constants/database.ts)
export function getMenuIntelligenceDocId(
  tId: string,
  sId: string,
  projectId: string,
): string {
  return `${tId}_${sId}_${projectId}`;
}
```

```typescript
// Zod schema for validation
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

const ConfidenceDataSchema = z.object({
  score: z.number().min(0).max(1),
  trend: z.enum(["rising", "stable", "falling"]),
  lastUpdated: z.instanceof(Timestamp),
  stableDays: z.number().default(0),
  // 7-day rolling metrics
  views7d: z.number().default(0),
  taps7d: z.number().default(0),
  engagementRate: z.number().default(0), // taps / views
});

const SuppressionWindowSchema = z.object({
  suppressedAt: z.instanceof(Timestamp),
  suppressUntil: z.instanceof(Timestamp),
  reason: z.enum(["fatigue", "low_confidence", "owner_skip", "time_window"]),
});

const TimeEligibilitySchema = z.object({
  breakfast: z.boolean().default(true),
  lunch: z.boolean().default(true),
  dinner: z.boolean().default(true),
  lateNight: z.boolean().default(true),
});

const StoreCalibrationSchema = z.object({
  locked: z.boolean().default(false),
  lockedAt: z.instanceof(Timestamp).optional(),
  baselineConfidence: z.number().default(0.5),
  fatigueThreshold: z.number().default(5), // days
  autoActionsEnabled: z.boolean().default(true),
});

/**
 * Reason Factors - WHY an action was taken
 * Internal reference only, never shown to owners
 */
const ReasonFactorsSchema = z.object({
  // Primary signals (from analytics)
  clicks7d: z.number(), // Item clicks in last 7 days
  pageViews7d: z.number(), // Total page views (denominator)
  engagementRate: z.number(), // clicks / pageViews (0-1)
  decisionBlockClicks7d: z.number(), // Clicks from Decision Blocks

  // Owner signals
  ownerBoost: z.number().default(0), // -20 to +20
  isBestSeller: z.boolean().default(false),

  // Trend signals
  previousScore: z.number().optional(), // Score from yesterday
  scoreDelta: z.number().optional(), // Change in score
  stableDays: z.number().default(0), // Days at same tier

  // Comparative signals (why X and not Y)
  rankInCategory: z.number().optional(), // Position among category items
  categoryItemCount: z.number().optional(), // Total items in category
  percentileInProject: z.number().optional(), // Percentile vs all items
});

const AuditLogEntrySchema = z.object({
  action: z.enum([
    "AUTO_HIDE",
    "AUTO_DEMOTE",
    "AUTO_PROMOTE",
    "AUTO_SUPPRESS",
    "AUTO_ADJUST_TIME",
    "AUTO_STABILIZE",
    "CALIBRATION_LOCKED",
    "STABILITY_MODE_ON",
    "STABILITY_MODE_OFF",
  ]),
  itemId: z.string().optional(),
  itemName: z.string().optional(), // For human-readable logs
  previousValue: z.any().optional(),
  newValue: z.any().optional(),
  timestamp: z.instanceof(Timestamp),
  reversible: z.boolean(),
  reversed: z.boolean().default(false),
  reversedAt: z.instanceof(Timestamp).optional(),

  // NEW: Detailed reason tracking (internal reference)
  reason: z.object({
    primary: z.string(), // e.g., "Low engagement (2.1%)"
    factors: ReasonFactorsSchema, // All contributing data
    comparison: z.string().optional(), // e.g., "Item Y had 5.2% engagement"
    threshold: z.string().optional(), // e.g., "Required: ≥3.5%"
  }),
});

export const MenuIntelligenceStateSchema = z.object({
  // Identity (project-level, same as Decision Blocks)
  tId: z.string(),
  sId: z.string(),
  projectId: z.string(),

  // Item-level data
  itemConfidence: z.record(z.string(), ConfidenceDataSchema),
  suppressionWindows: z.record(z.string(), SuppressionWindowSchema),
  timeEligibility: z.record(z.string(), TimeEligibilitySchema),

  // Project-level calibration (not store-level)
  projectCalibration: StoreCalibrationSchema, // Renamed but same structure

  // Metadata
  computedAt: z.instanceof(Timestamp), // Matches Decision Blocks
  validUntil: z.instanceof(Timestamp), // TTL - same pattern
  runCount: z.number().default(0),
  daysSinceCreation: z.number().default(0),

  // Recent audit log (last 50 entries, older archived)
  recentAuditLog: z.array(AuditLogEntrySchema).max(50),

  // Stability mode
  stabilityMode: z.boolean().default(false),
  stabilityModeReason: z.string().optional(),

  // Stats (matches Decision Blocks pattern)
  statsUsed: z.object({
    totalItems: z.number(),
    itemsWithViews: z.number(),
    itemsWithConfidence: z.number(),
  }),
});

export type MenuIntelligenceState = z.infer<typeof MenuIntelligenceStateSchema>;
export type ConfidenceData = z.infer<typeof ConfidenceDataSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type ReasonFactors = z.infer<typeof ReasonFactorsSchema>;

/**
 * Example Audit Log Entry (for internal reference):
 *
 * {
 *   action: "AUTO_PROMOTE",
 *   itemId: "item_butter_chicken",
 *   itemName: "Butter Chicken",
 *   previousValue: { tier: "CAUTIOUS", score: 0.58 },
 *   newValue: { tier: "CONFIDENT", score: 0.67 },
 *   timestamp: Timestamp.now(),
 *   reversible: true,
 *   reason: {
 *     primary: "High engagement (6.8%) for 3+ stable days",
 *     factors: {
 *       clicks7d: 47,
 *       pageViews7d: 692,
 *       engagementRate: 0.068,
 *       decisionBlockClicks7d: 12,
 *       ownerBoost: 5,
 *       isBestSeller: true,
 *       previousScore: 0.58,
 *       scoreDelta: 0.09,
 *       stableDays: 4,
 *       rankInCategory: 1,
 *       categoryItemCount: 8,
 *       percentileInProject: 92
 *     },
 *     comparison: "Next best: Paneer Tikka (4.2% engagement)",
 *     threshold: "Required: ≥5% engagement, 3+ stable days"
 *   }
 * }
 */
```

### Firestore Security Rules Addition

```javascript
// Add to existing firestore.rules
match /menuIntelligence/{docId} {
  // docId format: {tId}_{sId}_{projectId}
  // Only Cloud Functions can write (admin SDK)
  // Owners can read their own project's state (for debugging if ever needed)
  allow read: if request.auth != null &&
    docId.split('_')[0] == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tId;
  allow write: if false; // Admin SDK only
}
```

---

## API Endpoints

### No New API Endpoints Required

Per frontend-first principle:

- Intelligence state is written by Cloud Functions only
- Campaign engine reads state directly via DAL (server component)
- Screen generator reads state directly via DAL
- No client-side API calls needed

---

## File Structure

```
functions/src/
├── intelligence/
│   ├── shared/                          # NEW: Shared modules (reusable)
│   │   ├── analyticsAggregator.ts       # Extract from decisionBlocksScoring.ts
│   │   ├── itemExtractor.ts             # Extract from decisionBlocksScoring.ts
│   │   └── scoreNormalizer.ts           # Extract normalize() function
│   ├── decisionBlocks.ts                # REFACTOR: Uses shared modules
│   └── menuIntelligence.ts              # NEW: Core intelligence logic (uses shared)
├── decisionBlocksScoring.ts             # MODIFY: Add menuIntelligence computation
├── constants/
│   └── database.ts                      # ADD: MENU_INTELLIGENCE collection, getMenuIntelligenceDocId()
└── utils/
    └── auditLog.ts                      # NEW: Audit log writer

src/
├── lib/
│   ├── intelligence/
│   │   ├── types.ts                     # NEW: TypeScript types (shared with functions)
│   │   └── dal.ts                       # NEW: Data access layer for reading state
│   ├── campaigns/
│   │   └── engine.ts                    # MODIFY: Read intelligence state
│   └── screen/
│       └── slideGenerator.ts            # MODIFY: Read intelligence state
└── types/
    └── intelligence.ts                  # NEW: Shared types
```

### Architecture: Shared Modules Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    decisionBlocksScoring.ts                      │
│       (Hourly trigger; store-local settlement window)            │
├─────────────────────────────────────────────────────────────────┤
│  For each store → For each project:                              │
│                                                                  │
│  1. analyticsAggregator.fetch7DayAnalytics() ─────┐              │
│  2. itemExtractor.extractActiveItems()       ─────┼─► SHARED     │
│  3. scoreNormalizer.normalize()              ─────┘              │
│                                                                  │
│  4. decisionBlocks.computeScores()     → project.publicDecisionBlocks │
│  5. menuIntelligence.computeState()    → menuIntelligence/{docId}     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Runtime Implementation Status

| Area | Runtime status | Evidence |
| ---- | -------------- | -------- |
| Shared analytics snapshot reader | Implemented | `functions/src/intelligence/shared/analyticsAggregator.ts` reads `analytics/{tId}_{sId}_{projectId}_intelligence_7d` and returns empty analytics when the snapshot is missing or stale. |
| Shared item extractor | Implemented | `functions/src/intelligence/shared/itemExtractor.ts` extracts active items and merges compact analytics data. |
| Shared score normalizer | Implemented | `functions/src/intelligence/shared/scoreNormalizer.ts` owns score constants and normalization helpers. |
| Menu Intelligence state computation | Implemented | `functions/src/intelligence/menuIntelligence.ts` computes confidence, priority, suppression observations, calibration, and audit context. |
| Scheduler integration | Implemented | `functions/src/decisionBlocksScoring.ts` computes Decision Blocks and Menu Intelligence in the same per-project loop. |
| Decision Blocks write model | Implemented | Scheduler writes customer-safe `project.publicDecisionBlocks`; there is no separate active `decisionBlocks` collection dependency. |
| Client DAL | Implemented | `src/lib/intelligence/dal.ts` exposes `getMenuIntelligence()`, `getItemPresentation()`, and `getItemsByPriority()`. |
| Firestore rules | Implemented | `firestore.rules` allows authenticated tenant/platform reads of `menuIntelligence` and denies client writes. |
| GrowthOS/screen consumers | Not certified in this audit slice | The DAL is available, but downstream GrowthOS/screen behavior needs its own feature loop before certification. |

---

## Security Considerations

### Authentication & Authorization

| Check               | Implementation         | Reference                     |
| ------------------- | ---------------------- | ----------------------------- |
| Cloud Function auth | Admin SDK only         | No user-facing endpoints      |
| Firestore rules     | Read-only for owners   | See rules above               |
| No API routes       | DAL pattern only       | `src/lib/intelligence/dal.ts` |
| Rate limiting       | Built into job (batch) | N/A for nightly job           |

### Data Validation

| Point              | Validation         | Reference                     |
| ------------------ | ------------------ | ----------------------------- |
| Intelligence state | Zod schema         | `MenuIntelligenceStateSchema` |
| Confidence scores  | Range 0-1          | `ConfidenceDataSchema`        |
| Timestamps         | Firebase Timestamp | No manual handling            |

### Audit Trail

| Requirement            | Implementation                                             |
| ---------------------- | ---------------------------------------------------------- |
| All actions logged     | `AuditLogEntry` schema                                     |
| Reversibility tracked  | `reversed`, `reversedAt` fields                            |
| Recent log in document | Last 50 entries                                            |
| Old logs archived      | Cloud Function archives to `auditLogArchive` subcollection |

---

## Firebase Cost Analysis

### Per-Project Daily Cost (Extended Decision Blocks)

| Operation                     | Count | Unit Cost | Daily Cost |
| ----------------------------- | ----- | --------- | ---------- |
| Analytics read (7-day)        | 1     | ₹0.0025   | ₹0.0025    |
| Decision Blocks write         | 1     | ₹0.075    | ₹0.075     |
| Menu Intelligence read (prev) | 1     | ₹0.0025   | ₹0.0025    |
| Menu Intelligence write       | 1     | ₹0.075    | ₹0.075     |

**Per-project daily: ~₹0.155** (~$0.002)

### Cost Savings vs Separate Scheduler

| Approach                 | Analytics Reads | Cold Starts | Cost/Project |
| ------------------------ | --------------- | ----------- | ------------ |
| Separate Job (ChatGPT)   | 2×              | 2           | ₹0.31        |
| Extended Decision Blocks | 1×              | 1           | ₹0.155       |
| **Savings**              | **50%**         | **50%**     | **50%**      |

### Scale Projection

| Projects | Daily Cost | Monthly Cost |
| -------- | ---------- | ------------ |
| 100      | ₹15.50     | ₹465         |
| 1,000    | ₹155       | ₹4,650       |
| 10,000   | ₹1,550     | ₹46,500      |

---

## Validation Report

### Pre-Implementation Validation

| Check                           | Status  | Evidence                                            |
| ------------------------------- | ------- | --------------------------------------------------- |
| Current action ranking          | ✅ PASS | `src/lib/growthos/actionRanking.ts`                 |
| Old Social Content engine       | Removed | Deleted to avoid duplicate generated-action systems |
| Existing analytics tracking     | ✅ PASS | `src/lib/analytics/unified.ts:102-126`              |
| **Decision Blocks Scheduler**   | ✅ PASS | `functions/src/decisionBlocksScoring.ts`            |
| 7-day analytics fetch           | ✅ PASS | `decisionBlocksScoring.ts:298-343`                  |
| Item extraction from files      | ✅ PASS | `decisionBlocksScoring.ts:349-388`                  |
| storesSummary cost optimization | ✅ PASS | `decisionBlocksScoring.ts:508-511`                  |
| Multi-tenant pattern            | ✅ PASS | `__docs__/client-menu/multi-tenant-architecture.md` |
| Timestamp handling              | ✅ PASS | Uses `firebase-admin/firestore` Timestamp           |
| No manual timestamp in UI       | ✅ PASS | DAL handles conversion                              |

### Current Audit Validation

| Check | Status | Evidence |
| ----- | ------ | -------- |
| Compact analytics snapshot path used | Verified | `fetch7DayAnalytics()` reads only `*_intelligence_7d` and returns empty analytics on stale/missing input. |
| Manual Decision Blocks recovery avoids daily analytics scans | Fixed | `computeForProject()` now fetches the compact snapshot when no prefetched analytics is supplied. |
| Decision Blocks customer runtime uses store-local category slots | Fixed | `DecisionBlocks.tsx` receives `storeTimeZone` from `MenuPageNew`. |
| CMI DAL never hides menu items | Verified | `getItemPresentation()` always returns `visible: true`; `getItemsByPriority()` sorts and does not filter out items. |
| Downstream GrowthOS/screen presentation | Not certified in this slice | Queued for the remaining feature inventory audit. |
| Function deployment | Pending | Cloud Function deploy is pending because targeted Firebase Functions deploy fails on `ecomsai` billing-disabled Secret Manager 403 after local function build/lint passes. |

---

## Testing Guide

### Manual Testing Steps

#### Test 1: Nightly Job Execution

1. Deploy function to staging: `firebase deploy --only functions:computeDecisionBlocksScores`
2. Trigger manually via Firebase Console OR use `triggerDecisionBlocksScoring` callable
3. Verify BOTH outputs are written:
   - `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks`
   - `menuIntelligence/{tId}_{sId}_{projectId}` (new)
4. Verify `itemConfidence` populated for all menu items
5. Verify `computedAt` and `validUntil` timestamps set

#### Test 2: Confidence Calculation

1. Create test store with known analytics data
2. Run intelligence job
3. Verify confidence scores match expected calculation:
   - High views + high taps → high confidence
   - High views + low taps → medium confidence
   - Low views → low confidence

#### Test 3: Suppression Windows

1. Simulate item shown 5+ consecutive days
2. Run intelligence job
3. Verify item added to `suppressionWindows`
4. Verify item excluded from Today/Screens

#### Test 4: Time Eligibility

1. Simulate item with low engagement at dinner time
2. Run intelligence job
3. Verify `timeEligibility.dinner = false`
4. Verify item still eligible for lunch

#### Test 5: Calibration Lock

1. Create store with 21+ days history
2. Run intelligence job
3. Verify `storeCalibration.locked = true`
4. Verify subsequent runs don't change baseline

#### Test 6: Audit Log

1. Trigger auto-demote action
2. Verify `recentAuditLog` contains entry
3. Verify entry has correct action type, timestamp, reversible flag

---

## Pseudo-Code: Extended Decision Blocks Scheduler

```typescript
// functions/src/decisionBlocksScoring.ts (MODIFIED - not new file)

import { computeIntelligenceState } from "./intelligence/menuIntelligence";
import { fetch7DayAnalytics } from "./intelligence/shared/analyticsAggregator";
import { extractActiveItems } from "./intelligence/shared/itemExtractor";
import { DB_COLLECTIONS, getMenuIntelligenceDocId } from "./constants/database";

// Inside computeForProject() function, AFTER computing decision blocks:
async function computeForProject(
  db: FirebaseFirestore.Firestore,
  tId: string,
  sId: string,
  projectId: string,
  projectData: FirebaseFirestore.DocumentData,
  businessCategory: string = "specialty",
): Promise<{
  decisionBlocks: DecisionBlocksDocument | null;
  intelligence: MenuIntelligenceState | null;
}> {
  // 1. Use SHARED analytics aggregator (extracted from current lines 298-343)
  const analytics = await fetch7DayAnalytics(db, tId, sId, projectId);

  // 2. Use SHARED item extractor (extracted from current lines 349-388)
  const items = await extractActiveItems(projectData);

  if (items.length === 0) {
    return { decisionBlocks: null, intelligence: null };
  }

  // 3. Compute Decision Blocks (existing logic, uses shared normalize())
  const decisionBlocks = computeDecisionBlocks(
    items,
    analytics,
    businessCategory,
  );

  // 4. NEW: Compute Menu Intelligence State (uses SAME items + analytics)
  const currentIntelligence = await fetchCurrentIntelligence(
    db,
    tId,
    sId,
    projectId,
  );
  const intelligence = computeIntelligenceState(
    items,
    analytics,
    currentIntelligence,
    { tId, sId, projectId },
  );

  return { decisionBlocks, intelligence };
}

// In main scheduler loop (computeDecisionBlocksScores):
for (const projectDoc of projectsQuery.docs) {
  // ... existing validation ...

  try {
    const { decisionBlocks, intelligence } = await computeForProject(
      db,
      tId,
      sId,
      projectId,
      projectData,
      businessCategory,
    );

    // Write Decision Blocks (existing)
    if (decisionBlocks) {
      const dbDocId = getDecisionBlocksDocId(tId, sId, projectId);
      await db
        .collection(DB_COLLECTIONS.DECISION_BLOCKS)
        .doc(dbDocId)
        .set(decisionBlocks, { merge: true });
      results.decisionBlocksSuccess++;
    }

    // Write Menu Intelligence (NEW)
    if (intelligence) {
      const miDocId = getMenuIntelligenceDocId(tId, sId, projectId);
      await db
        .collection(DB_COLLECTIONS.MENU_INTELLIGENCE)
        .doc(miDocId)
        .set(intelligence, { merge: true });
      results.intelligenceSuccess++;
    }
  } catch (error: any) {
    // Error handling covers both
    results.failedCount++;
    results.errors.push({ tId, sId, projectId, error: error.message });
  }
}
```

---

## Key Functions

### `calculateConfidence()`

```typescript
function calculateConfidence(
  analytics: { views: number; taps: number },
  previousConfidence?: ConfidenceData,
): ConfidenceData {
  const { views, taps } = analytics;
  const engagementRate = views > 0 ? taps / views : 0;

  // Base score from engagement
  let score = 0.5; // Default baseline

  if (views >= 50 && engagementRate >= 0.15) {
    score = 0.8; // High engagement
  } else if (views >= 20 && engagementRate >= 0.1) {
    score = 0.65; // Good engagement
  } else if (views >= 10) {
    score = 0.5; // Baseline
  } else {
    score = 0.4; // Low data
  }

  // Apply slow build / fast break
  if (previousConfidence) {
    const delta = score - previousConfidence.score;
    if (delta > 0) {
      // Trust builds slowly: max +0.05/day
      score = Math.min(previousConfidence.score + 0.05, score);
    } else if (delta < -0.1) {
      // Trust breaks fast: immediate
      score = score;
    }
  }

  // Determine trend
  const trend = !previousConfidence
    ? "stable"
    : score > previousConfidence.score + 0.02
      ? "rising"
      : score < previousConfidence.score - 0.02
        ? "falling"
        : "stable";

  // Track stable days
  const stableDays =
    trend === "stable" ? (previousConfidence?.stableDays || 0) + 1 : 0;

  return {
    score,
    trend,
    lastUpdated: Timestamp.now(),
    stableDays,
    views7d: views,
    taps7d: taps,
    engagementRate,
  };
}
```

### `canAutoAct()`

```typescript
function canAutoAct(state: MenuIntelligenceState | null): boolean {
  if (!state) return false;
  if (state.stabilityMode) return false;
  if (!state.storeCalibration.autoActionsEnabled) return false;
  return true;
}
```

---

## The 6 Production Metrics (CEO-Level, Internal Only)

These metrics decide if Continuous Menu Intelligence is working. **Never show to owners.**

### 1️⃣ Zero-Intervention Days (ZID) — The North Star

**Definition:** Consecutive days a store runs with no skips, no overrides, no uploads, no config changes.

| Target   | Meaning                 |
| -------- | ----------------------- |
| 30+ days | Strong habit            |
| 60+ days | Infrastructure          |
| 90+ days | Extremely hard to churn |

### 2️⃣ Today Open → Action Completion Time

**Definition:** Time between opening Today tab and first action (or skip).

| Benchmark     | Status                   |
| ------------- | ------------------------ |
| < 20 seconds  | Excellent                |
| 20–45 seconds | Acceptable               |
| > 60 seconds  | Bad (thinking happening) |

### 3️⃣ Empty-State Retention Parity

**Definition:** Retention of users who see "Nothing to do" vs users who see an action.

**Critical:** If retention is equal or higher for empty-state → silence is trusted.

### 4️⃣ Public Surface Trust Rate

**Definition:** Ratio of screen active time vs owner preview/manual checks.

**Signal:** Screens run daily + owner preview frequency goes DOWN = trust going UP.

### 5️⃣ Override Half-Life

**Definition:** Average time an owner override stays active before auto-expiry or removal.

**Healthy:** Short overrides (events, festivals) → system resumes naturally.
**Red flag:** Long-lasting overrides → system isn't good enough.

### 6️⃣ Support Ticket Intent Ratio

| Bucket                    | Examples                                            | Target |
| ------------------------- | --------------------------------------------------- | ------ |
| **Bad (strategic doubt)** | "Why did it show this?", "Can I control X?"         | < 20%  |
| **Good (operational)**    | "Screen didn't load", "Item sold out still showing" | > 80%  |

**When users stop questioning intent → they've surrendered decision-making.**

### The Meta-Metric (CEO Only)

> **"How boring is MenuList on a good day?"**
> If nothing happens and nobody complains — you are winning.

---

### `checkCalibrationLock()`

```typescript
function checkCalibrationLock(
  state: MenuIntelligenceState | null,
  newConfidence: Record<string, ConfidenceData>,
): StoreCalibration {
  const daysSinceCreation = state?.daysSinceCreation || 0;

  // Already locked
  if (state?.storeCalibration?.locked) {
    return state.storeCalibration;
  }

  // Check for lock at day 21
  if (daysSinceCreation >= 21) {
    // Calculate baseline from average confidence
    const scores = Object.values(newConfidence).map((c) => c.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      locked: true,
      lockedAt: Timestamp.now(),
      baselineConfidence: avgScore,
      fatigueThreshold: 5,
      autoActionsEnabled: true,
    };
  }

  return (
    state?.storeCalibration || {
      locked: false,
      baselineConfidence: 0.5,
      fatigueThreshold: 5,
      autoActionsEnabled: true,
    }
  );
}
```

---

## Document History

| Date       | Version | Change                                                                                                                                                                                                                                                          |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-01-08 | v1.0    | Initial implementation plan from ChatGPT + codebase cross-reference                                                                                                                                                                                             |
| 2026-01-11 | v1.1    | Implementation complete — shared modules extracted, integrated into Decision Blocks scheduler                                                                                                                                                                   |
| 2026-02-09 | v1.2    | Refactor audit: Fixed inaccurate comment in intelligence.ts (Zod → plain TS interfaces). Verified types sync between Cloud Function and frontend. Fixed firebase doc (incorrect function names, wrong feature flag). Status → LOCKED.                           |
| 2026-03-21 | v1.3    | Decision Blocks Hardening: statsUsed enrichment (7 new CF fields), lifecycle states (COLD/LEARNING/STABLE), global activation gate, block-level eligibility gates, minimum viability rule (≥2), hard stale guard (72h). Source: ChatGPT review (~40% accuracy). |
| 2026-06-11 | v1.4    | Production-readiness audit slice: current runtime status added, compact analytics snapshot cost contract documented, stale build-plan tables replaced, and CMI DAL confirmed as priority-only/no hiding. |

---

_Status: Controlled owner testing ready in audited slice; full MenuList certification pending_
