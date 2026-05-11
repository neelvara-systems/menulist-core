# Founder Trust Layer — Implementation Blueprint

> **Version:** 1.0.0
> **Status:** ✅ IMPLEMENTED — 2026-03-09
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_TRUST_METRICS`

---

## §1 — System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         NIGHTLY BATCH (canonicaNightly.ts)               │
│                                                                          │
│  Step 1: Drift Detection ──────────────────────────────────┐            │
│  Step 2: Signal Entity Resolution                          │            │
│  Step 3: Signal Mutation                                   │            │
│  Step 4: Coverage KPI ─────────────────────────────────────┤            │
│  Step 5: Recurring Fallback Detection                      │            │
│  Step 6: Impact Tracking                                   │  Already   │
│  Step 7: Confidence Auto-Adjustment ───────────────────────┤  Exist     │
│  Step 8: Signal TTL Archive                                │            │
│  ...                                                       │            │
│  Step 13: Integration Events (if enabled)                  │            │
│  Step 14: Ticket Knowledge Loop (if enabled) ──────────────┘            │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════    │
│                                                                          │
│  NEW STEP: Trust Metrics Aggregation                                    │
│                                                                          │
│  Reads (already loaded by prior steps — 0 additional reads):            │
│  • answersSnap (from step 1: drift detection)                           │
│  • historySnap (from step 4: coverage KPI)                              │
│  • signalsByEntity (from step 1: drift detection)                       │
│  • entityMap (from step 1: drift detection)                             │
│                                                                          │
│  Computes:                                                               │
│  • coverageRate (from step 4 result)                                    │
│  • resolutionRate (derived from history + signals)                      │
│  • driftRate (from step 1 result)                                       │
│  • entityHealthAvg (from answers + entities + signals)                  │
│  • topFailingEntities (from entity-level aggregation)                   │
│  • escalationBreakdown (from history + retrieval results)               │
│                                                                          │
│  Writes:                                                                 │
│  • platformSummary/trustMetrics_{tId}_{sId} (1 write, merge)           │
│                                                                          │
│  Additional Firestore cost: 1 write per tenant per night                │
│  Additional Firestore reads: 0 (reuses data from prior steps)          │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (GovernanceHub)                         │
│                                                                          │
│  FounderTrustDashboard.tsx                                              │
│  • Reads platformSummary/trustMetrics_{tId}_{sId} (1 read)             │
│  • Displays 4 metric cards with color coding                            │
│  • Shows top 5 failing entities                                         │
│  • Shows escalation breakdown                                           │
│  • Feature-flagged: ENABLE_CANONICA_TRUST_METRICS                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## §2 — Data Model

### 2.1 — Trust Metrics Document

**Location:** `platformSummary/trustMetrics_{tId}_{sId}` (Canonica Firestore)
**Written by:** `canonicaNightly.ts` (nightly batch)
**Read by:** `FounderTrustDashboard.tsx` (1 read)

```typescript
interface CanonicaTrustMetrics {
  lastUpdated: Timestamp;
  date: string; // YYYY-MM-DD

  // 4 Core Metrics
  coverage: {
    rate: number; // 0-100 (percentage)
    hits: number; // Canonical answer served
    misses: number; // Fell through to RAG
    total: number; // hits + misses
    previousRate: number; // Yesterday's rate (for trend)
  };

  resolution: {
    rate: number; // 0-100 (percentage)
    resolved: number; // Queries without escalation
    escalated: number; // Queries with escalation signal
    total: number;
    previousRate: number; // Yesterday's rate (for trend)
  };

  drift: {
    rate: number; // 0-100 (percentage — lower is better)
    driftedCount: number; // Answers with driftFlag=true
    activeCount: number; // Total active answers
    previousRate: number; // Yesterday's rate (for trend)
  };

  entityHealth: {
    avgScore: number; // 0-100 (weighted average)
    healthyCount: number; // Entities with score ≥ 80
    attentionCount: number; // Entities with score 40-79
    criticalCount: number; // Entities with score < 40
    totalEntities: number;
    previousAvgScore: number; // Yesterday's score (for trend)
  };

  // Top Failing Entities (max 5)
  topFailingEntities: Array<{
    entityId: string;
    entityName: string;
    entityType: string;
    queryCount: number;
    escalationCount: number;
    reliabilityScore: number; // 0-100
    failureScore: number; // Weighted composite
  }>;

  // Escalation Classification Breakdown
  escalationBreakdown: {
    knowledgeGap: number; // Entity matched, no answer
    lowConfidence: number; // Answer confidence < 0.6
    entityMismatch: number; // Wrong entity resolved
    retrievalFailure: number; // No entity match
    userRequested: number; // Explicit human request
    total: number;
  };
}
```

### 2.2 — No New Collections

This feature creates **zero new Firestore collections**. All data is:

- **Computed** from existing collections during nightly batch
- **Stored** as a single document in the existing `platformSummary` collection

---

## §3 — Nightly Aggregation Logic

### 3.1 — Trust Metrics Step (Pseudo-code)

```typescript
async function aggregateTrustMetrics(
    tId: number,
    sId: number,
    // Data already loaded by prior steps:
    driftResult: DriftResult,
    coverageResult: { hits: number; misses: number; rate: number },
    answersData: any[],           // From step 1
    entityMap: Map<string, any>,  // From step 1
    signalsByEntity: Map<string, SignalCounts>  // From step 1
): Promise<void> {

    // 1. Coverage rate — already computed in step 4
    const coverageRate = Math.round(coverageResult.rate * 100);

    // 2. Resolution rate — derive from search history
    const dayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const historySnap = await db
        .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('createdOn', '>=', dayAgo)
        .limit(500)
        .get();

    let totalQueries = 0;
    let escalatedQueries = 0;
    const escalationBreakdown = {
        knowledgeGap: 0, lowConfidence: 0, entityMismatch: 0,
        retrievalFailure: 0, userRequested: 0, total: 0,
    };

    for (const doc of historySnap.docs) {
        const data = doc.data();
        totalQueries++;

        // Classify non-canonical queries
        if (!data.canonical) {
            if (data.matchedEntityIds?.length > 0 && !data.canonicalAnswerId) {
                escalationBreakdown.knowledgeGap++;
                escalatedQueries++;
            } else if (data.confidence === 'low') {
                escalationBreakdown.lowConfidence++;
                escalatedQueries++;
            } else if (data.matchedEntityIds?.length === 0) {
                escalationBreakdown.retrievalFailure++;
                escalatedQueries++;
            }
        }
    }

    // Count escalation signals separately
    const escalationSignals = await db
        .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('type', '==', 'escalation')
        .where('timestamp', '>=', dayAgo)
        .limit(200)
        .get();

    escalationBreakdown.userRequested = escalationSignals.size;
    escalationBreakdown.total = escalatedQueries + escalationSignals.size;

    const resolutionRate = totalQueries > 0
        ? Math.round(((totalQueries - escalatedQueries) / totalQueries) * 100)
        : 0;

    // 3. Drift rate — from step 1 result
    const activeAnswers = answersData.filter(a => a.status === 'active');
    const driftedAnswers = activeAnswers.filter(a => a.governance?.driftFlag);
    const driftRate = activeAnswers.length > 0
        ? Math.round((driftedAnswers.length / activeAnswers.length) * 100)
        : 0;

    // 4. Entity health — server-side version of EntityHealthScore.tsx
    const entityHealthScores: number[] = [];
    const topFailing: Array<{...}> = [];

    for (const [entityId, entity] of entityMap) {
        if (entity.status === 'deprecated') continue;

        const boundAnswers = activeAnswers.filter(a =>
            a.scope?.entityIds?.includes(entityId)
        );
        const activeForEntity = boundAnswers.filter(a => a.status === 'active');
        const driftedForEntity = activeForEntity.filter(a => a.governance?.driftFlag);
        const signals = signalsByEntity.get(entityId) || { total: 0, chat_negative: 0 };

        const coverageScore = activeForEntity.length > 0 ? 100 : 0;
        const driftScore = activeForEntity.length === 0 ? 100
            : Math.round(((activeForEntity.length - driftedForEntity.length) / activeForEntity.length) * 100);
        const signalScore = signals.total === 0 ? 100
            : Math.max(0, Math.round((1 - (signals.chat_negative / signals.total)) * 100));

        const healthScore = Math.round(
            coverageScore * 0.4 + driftScore * 0.3 + signalScore * 0.2 + 10 // index assumed 10
        );

        entityHealthScores.push(healthScore);

        // Track failing entities (with minimum query threshold)
        if (signals.total >= 20) {
            const reliability = signals.total > 0
                ? Math.round((1 - (signals.chat_negative / signals.total)) * 100) : 100;
            topFailing.push({
                entityId,
                entityName: entity.name,
                entityType: entity.type || 'feature',
                queryCount: signals.total,
                escalationCount: signals.escalation || 0,
                reliabilityScore: reliability,
                failureScore: (signals.escalation || 0) * 3 + signals.chat_negative * 2,
            });
        }
    }

    const avgHealth = entityHealthScores.length > 0
        ? Math.round(entityHealthScores.reduce((a, b) => a + b, 0) / entityHealthScores.length)
        : 0;

    // Sort and take top 5 failing
    const top5Failing = topFailing
        .sort((a, b) => b.failureScore - a.failureScore)
        .slice(0, 5);

    // 5. Read previous metrics for trend calculation
    const prevDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`trustMetrics_${tId}_${sId}`).get();
    const prev = prevDoc.exists ? prevDoc.data() : null;

    // 6. Write trust metrics
    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`trustMetrics_${tId}_${sId}`)
        .set({
            lastUpdated: Timestamp.now(),
            date: new Date().toISOString().split('T')[0],
            coverage: {
                rate: coverageRate,
                hits: coverageResult.hits,
                misses: coverageResult.misses,
                total: coverageResult.hits + coverageResult.misses,
                previousRate: prev?.coverage?.rate || 0,
            },
            resolution: {
                rate: resolutionRate,
                resolved: totalQueries - escalatedQueries,
                escalated: escalatedQueries,
                total: totalQueries,
                previousRate: prev?.resolution?.rate || 0,
            },
            drift: {
                rate: driftRate,
                driftedCount: driftedAnswers.length,
                activeCount: activeAnswers.length,
                previousRate: prev?.drift?.rate || 0,
            },
            entityHealth: {
                avgScore: avgHealth,
                healthyCount: entityHealthScores.filter(s => s >= 80).length,
                attentionCount: entityHealthScores.filter(s => s >= 40 && s < 80).length,
                criticalCount: entityHealthScores.filter(s => s < 40).length,
                totalEntities: entityHealthScores.length,
                previousAvgScore: prev?.entityHealth?.avgScore || 0,
            },
            topFailingEntities: top5Failing,
            escalationBreakdown,
        }, { merge: true });
}
```

### 3.2 — Data Reuse Strategy (ZERO Additional Reads)

| Data Needed              | Already Loaded By        | Variable          |
| ------------------------ | ------------------------ | ----------------- |
| Active canonical answers | Step 1 (drift detection) | `answersSnap`     |
| Entity map               | Step 1 (drift detection) | `entityMap`       |
| Signal counts by entity  | Step 1 (drift detection) | `signalsByEntity` |
| Coverage hits/misses     | Step 4 (coverage KPI)    | `coverageResult`  |
| Drift results            | Step 1 (drift detection) | `driftResult`     |

**Implementation Note:** The trust step performs its own queries for answers, entities, signals, and search history rather than sharing data from steps 1/4. This avoids invasive refactoring of self-contained drift detection and coverage functions. The additional reads (~5-6 per tenant per night) are negligible cost ($0.001/month at 100 tenants) and keep the architecture clean — each step is independently testable.

**Future Optimization:** If Firestore read costs become a concern at 1000+ tenants, refactor `runDriftDetection` and `aggregateCoverageKPI` to return loaded snapshots for downstream steps to reuse.

---

## §4 — Frontend Component

### 4.1 — FounderTrustDashboard.tsx

**Location:** `src/components/templates/canonica/governance/FounderTrustDashboard.tsx`

**Structure:**

```
FounderTrustDashboard
├── TrustMetricCards (4 cards: Coverage, Resolution, Drift, Health)
│   └── Each: value, trend arrow, color
├── TopFailingEntities (table, max 5 rows)
│   └── Each: name, type, reliability %, query count
└── EscalationBreakdown (simple list with percentages)
```

**Data loading:**

```typescript
const trustRef = doc(
  canonicaFirebaseClient,
  DB_COLLECTIONS.PLATFORM_SUMMARY,
  `trustMetrics_${session.tId}_${session.sId}`,
);
const trustDoc = await getDoc(trustRef);
```

**Color coding:**

```typescript
function getMetricColor(metric: string, value: number): string {
  if (metric === "drift") {
    // Inverted — lower is better
    if (value <= 5) return "#52c41a"; // green
    if (value <= 15) return "#faad14"; // amber
    return "#ff4d4f"; // red
  }
  // Standard — higher is better
  if (value >= 80) return "#52c41a";
  if (value >= 60) return "#faad14";
  return "#ff4d4f";
}
```

**Trend indicator:**

```typescript
function getTrend(
  current: number,
  previous: number,
  inverted?: boolean,
): "↑" | "→" | "↓" {
  const delta = current - previous;
  if (Math.abs(delta) < 2) return "→"; // Stable
  if (inverted) return delta > 0 ? "↓" : "↑"; // Drift: increase is bad
  return delta > 0 ? "↑" : "↓";
}
```

### 4.2 — DAL Function

**Location:** Add to existing `src/database/canonica/coverageKPI.ts` (or create `trustMetrics.ts`)

```typescript
export interface CanonicaTrustMetrics { ... }  // Matches §2.1

export const getTrustMetrics = async (
    tId: number, sId: number
): Promise<CanonicaTrustMetrics | null> => {
    return await apiCallComposer(
        async () => {
            const docRef = doc(canonicaFirebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY, `trustMetrics_${tId}_${sId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as CanonicaTrustMetrics;
            }
            return null;
        },
        "getTrustMetrics"
    );
};
```

---

## §5 — Feature Flag

### Frontend

```typescript
// src/config/features.ts
ENABLE_CANONICA_TRUST_METRICS: false,
```

### Cloud Functions

```typescript
// functions/src/constants/features.ts
ENABLE_CANONICA_TRUST_METRICS: false,
```

### Gate Logic

```typescript
// Nightly batch
if (!FUNCTION_FLAGS.ENABLE_CANONICA_TRUST_METRICS) {
  console.log("[Canonica Trust] Metrics disabled. Skipping.");
  return;
}

// Frontend
if (!FEATURE_FLAGS.ENABLE_CANONICA_TRUST_METRICS) return null;
```

---

## §6 — File Structure

### New Files (2-3)

| File                                                                     | Purpose                       | Lines (est.)   |
| ------------------------------------------------------------------------ | ----------------------------- | -------------- |
| `src/components/templates/canonica/governance/FounderTrustDashboard.tsx` | Trust dashboard UI            | ~200           |
| `src/database/canonica/trustMetrics.ts`                                  | DAL for trust metrics read    | ~30            |
| `src/types/canonica/index.ts`                                            | Add CanonicaTrustMetrics type | +60 (additive) |

### Modified Files (4)

| File                                                     | Change                                                         | Lines (est.) |
| -------------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| `functions-canonica/src/canonica/canonicaNightly.ts`     | Add trust metrics aggregation step + pass data between steps   | +80          |
| `src/config/features.ts`                                 | Add `ENABLE_CANONICA_TRUST_METRICS` flag                       | +15          |
| `functions-canonica/src/constants/features.ts`           | Add `ENABLE_CANONICA_TRUST_METRICS` flag (in `FUNCTION_FLAGS`) | +1           |
| `src/components/templates/canonica/governance/index.tsx` | Add Trust tab (same pattern as Friction/Branding tabs)         | +15          |

### GovernanceHub Integration Pattern

The trust dashboard tab follows the exact same conditional pattern used by existing feature-flagged tabs in `governance/index.tsx`:

```typescript
// In governance/index.tsx — add alongside existing conditional tabs
if (FEATURE_FLAGS.ENABLE_CANONICA_TRUST_METRICS) {
    items.push({
        key: 'trust',
        label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LuShieldCheck /> System Trust
            </span>
        ),
        children: <FounderTrustDashboard tId={tId} sId={sId} />,
    });
}
```

**Position:** Insert as first conditional tab (before Branding/Friction) — trust is the most important governance metric.

---

## §7 — Backwards Compatibility

| Concern                    | Assessment                                                |
| -------------------------- | --------------------------------------------------------- |
| Existing nightly batch     | ✅ Safe — new step is additive, runs after existing steps |
| Existing CoverageKPI       | ✅ Unaffected — trust metrics are separate doc            |
| Existing EntityHealthScore | ✅ Unaffected — client-side computation unchanged         |
| Existing governance UI     | ✅ Unaffected — trust dashboard is a new tab              |
| Existing types             | ✅ Additive — new interface, no changes to existing       |
| Feature flag OFF state     | ✅ Zero impact — step skipped, UI hidden                  |

---

## §8 — ADRs (Architecture Decision Records)

### ADR-1: Zero New Collections

**Decision:** Compute trust metrics from existing collections, store in `platformSummary`.
**Rationale:** ChatGPT proposed 6 new collections. Canonica's architecture already captures all needed data across `aiSearchHistory`, `canonica_signalEvents`, and `canonica_canonicalAnswers`. Adding parallel collections would duplicate data and increase Firestore cost.
**Consequence:** Slightly more complex aggregation logic in nightly batch, but zero ongoing storage cost.

### ADR-2: Nightly Batch (Not Real-Time)

**Decision:** Aggregate trust metrics once per night, not in real-time or every 6 hours.
**Rationale:** Canonica's architecture is batch-oriented. Real-time metrics would require onChange triggers and counters, adding complexity. Founders check trust weekly, not per-minute.
**Consequence:** Dashboard shows data from last night's run. Acceptable latency for governance metrics.

### ADR-3: Server-Side Entity Health (Duplicate of Client-Side)

**Decision:** Compute entity health server-side for the trust metrics doc, even though `EntityHealthScore.tsx` computes it client-side.
**Rationale:** The trust dashboard needs aggregated entity health (average + counts) in a single read. Client-side computation requires loading ALL entities + ALL answers (N reads). Server-side pre-computation keeps the dashboard at 1 read.
**Consequence:** Entity health logic exists in two places (client + server). Accept this duplication for cost optimization.

### ADR-4: Resolution Rate Definition

**Decision:** Resolution = queries where canonical answer was served OR RAG answer was served without escalation signal.
**Rationale:** Aligns with Intercom's definition (resolved without human handoff). A query is "escalated" if confidence is 'low' OR an escalation signal event exists.
**Consequence:** Resolution rate may differ slightly from naive "canonical only" metric. More accurate representation of actual user experience.

### ADR-5: Minimum Query Threshold for Entity Rankings

**Decision:** Require 20+ queries in 24h window before an entity appears in "top failing" list.
**Rationale:** Low-volume entities produce noisy metrics. One bad query out of 2 total = 50% failure rate, which is misleading. Industry standard (Intercom, Zendesk) filters by volume.
**Consequence:** New/rare entities won't appear in failing list even if all queries fail. Acceptable trade-off.

---

## §9 — Performance Constraints

| Constraint                  | Target                   | Achieved By                        |
| --------------------------- | ------------------------ | ---------------------------------- |
| Dashboard load              | < 1 second               | Single Firestore read (~500 bytes) |
| Nightly step duration       | < 5 seconds per tenant   | Reuses data from prior steps       |
| Additional Firestore reads  | 0-1 per tenant per night | Data reuse from steps 1 + 4        |
| Additional Firestore writes | 1 per tenant per night   | Single `platformSummary` doc       |
| Document size               | < 2 KB                   | 4 metrics + 5 entities + breakdown |

---

## §10 — Observability

The trust metrics step logs to the existing nightly result:

```typescript
result.trustMetrics = {
  coverageRate: coverageRate,
  resolutionRate: resolutionRate,
  driftRate: driftRate,
  entityHealthAvg: avgHealth,
  failingEntities: top5Failing.length,
};
```

Visible in:

- Nightly scheduler console logs
- `schedulerRunLogs` collection (if scheduler monitoring enabled)
- Existing Telegram summary (if ops alerts enabled)
