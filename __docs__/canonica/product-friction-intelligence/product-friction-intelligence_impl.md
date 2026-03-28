# Product Friction Intelligence — Implementation Blueprint

> **Version:** 1.0.0
> **Status:** DOCUMENTED — Implementation Pending
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_FRICTION_INTELLIGENCE`

---

## §1 — System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    EXISTING CANONICA PIPELINE                        │
│                                                                      │
│  signalEmitter ──→ canonica_signalEvents ──→ signalMutation          │
│                          │                        │                  │
│                          │                        ▼                  │
│                          │               mutationProposals            │
│                          │                                           │
│  aiSearchHistory ──→ coverageKPI (nightly)                          │
└──────────┬───────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│              NEW: FRICTION INTELLIGENCE LAYER                        │
│                                                                      │
│  STEP 9 — Nightly Friction Aggregation                              │
│  canonica_signalEvents + aiSearchHistory                             │
│       ──→ canonica_frictionDailyStats (per entity, per day)         │
│       ──→ platformSummary/frictionSnapshot_{tId}_{sId}              │
│                                                                      │
│  STEP 10 — Weekly Friction Insight (Sundays only)                   │
│  canonica_frictionDailyStats (14 days)                              │
│       ──→ Gemini summary                                            │
│       ──→ platformSummary/friction_{tId}_{sId}                      │
│                                                                      │
│  UI — GovernanceHub "Friction" tab                                  │
│  Reads platformSummary/friction_{tId}_{sId} (1 read)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## §2 — Data Model

### 2.1 — New Collection: `canonica_frictionDailyStats`

**Purpose:** Daily aggregated friction metrics per entity.

**Document ID format:** `{tId}_{sId}_{entityId}_{YYYY-MM-DD}`

```typescript
interface CanonicaFrictionDailyStat {
    tId: number;
    sId: number;
    entityId: string;
    entityName: string;        // Denormalized for read efficiency
    entityType: string;        // 'feature' | 'workflow' | 'integration' | 'error' | etc.
    date: string;              // YYYY-MM-DD

    // Signal counts
    queryCount: number;        // Total signals for this entity today
    ticketCount: number;
    chatNegativeCount: number;
    escalationCount: number;

    // Derived from search history (canonical misses for this entity)
    lowConfidenceCount: number;

    // Computed
    frictionScore: number;     // queryCount * (1 + escalationRate + lowConfidenceRate)

    createdOn: Timestamp;
}
```

**Retention:** 90 days (nightly cleanup in scheduler).

**Firestore indexes required:**
```
canonica_frictionDailyStats: tId ASC, sId ASC, date DESC
canonica_frictionDailyStats: tId ASC, sId ASC, entityId ASC, date DESC
```

### 2.2 — Existing Document: `platformSummary/frictionSnapshot_{tId}_{sId}`

**Purpose:** Latest nightly friction snapshot for quick dashboard reads.

```typescript
interface CanonicaFrictionSnapshot {
    lastUpdated: Timestamp;

    // Top entities by friction score (max 10)
    topFrictionEntities: Array<{
        entityId: string;
        entityName: string;
        entityType: string;
        last7d: {
            queryCount: number;
            escalationCount: number;
            lowConfidenceCount: number;
            frictionScore: number;
        };
        previous7d: {
            queryCount: number;
            frictionScore: number;
        };
        trendDirection: 'rising' | 'stable' | 'improving' | 'new';
        trendScore: number;    // last7d / previous7d ratio
    }>;

    // Emerging topics (new friction in last 7 days)
    emergingTopics: Array<{
        entityId: string;
        entityName: string;
        entityType: string;
        queryCount: number;
        escalationRate: number;
        firstSeenDate: string;
    }>;

    // Overall health
    overallHealth: 'HIGH' | 'MODERATE' | 'LOW';  // Based on total friction score
    totalSignals7d: number;
    totalEscalations7d: number;
}
```

### 2.3 — Existing Document: `platformSummary/friction_{tId}_{sId}`

**Purpose:** Weekly AI-generated friction insight.

```typescript
interface CanonicaFrictionInsight {
    lastUpdated: Timestamp;
    weekStart: string;         // YYYY-MM-DD (Monday)
    weekEnd: string;           // YYYY-MM-DD (Sunday)

    // AI-generated content
    summary: string;           // 2-3 paragraph narrative
    topFrictions: Array<{
        entityName: string;
        entityType: string;
        signalCount: number;
        escalationRate: number;
        trend: string;         // "rising", "stable", "improving"
        suggestedAction: string;
    }>;
    emergingTopics: string[];  // Human-readable emerging topic descriptions
    overallHealth: 'HIGH' | 'MODERATE' | 'LOW';

    // Metadata
    promptVersion: string;
    generatedAt: Timestamp;
}
```

---

## §3 — Processing Pipelines

### 3.1 — Nightly Friction Aggregation (Step 9 of canonicaNightly)

**Trigger:** Part of existing nightly scheduler (3:00 AM UTC).
**Runs:** Every night for every active Canonica tenant.

```
Input:
  - canonica_signalEvents (last 24h, per tenant)
  - aiSearchHistory (last 24h, canonical=false with matchedEntityIds)

Processing:
  1. Query today's signal events, group by entityId
  2. Query today's canonical misses from search history
  3. For each entity with signals:
     a. Count: ticket, chat_negative, escalation, total
     b. Count: low confidence (canonical misses for this entity)
     c. Calculate frictionScore
     d. Denormalize entityName + entityType from entity doc
     e. Write daily stat document
  4. Compute frictionSnapshot:
     a. Read last 14 days of frictionDailyStats
     b. Aggregate last 7d and previous 7d per entity
     c. Calculate trendDirection per entity
     d. Detect emerging topics
     e. Determine overallHealth
     f. Write to platformSummary/frictionSnapshot_{tId}_{sId}

Output:
  - N documents in canonica_frictionDailyStats (1 per active entity)
  - 1 platformSummary document (frictionSnapshot)
```

**Firestore operations per tenant per night:**
- Reads: ~1 (signal events query) + ~1 (search history query) + ~1 (entity names) + ~14 (daily stats for 14 days) = ~17 reads
- Writes: ~N daily stat docs (typically 5-30) + 1 snapshot = ~6-31 writes
- **Estimated cost:** ~$0.001/tenant/night

### 3.2 — Weekly Friction Insight (Step 10 of canonicaNightly, Sundays only)

**Trigger:** Sunday night in nightly scheduler (after Step 9).
**Runs:** Once per week for every active Canonica tenant.

```
Input:
  - platformSummary/frictionSnapshot_{tId}_{sId} (from Step 9)

Processing:
  1. Read frictionSnapshot
  2. If totalSignals7d < 5, skip (insufficient data)
  3. Build Gemini prompt with:
     - Top friction entities (name, type, counts, trends)
     - Emerging topics
     - Overall health
  4. Call Gemini 2.5 Flash for narrative generation
  5. Parse structured response
  6. Write to platformSummary/friction_{tId}_{sId}

Output:
  - 1 platformSummary document (friction insight)
```

**Cost per tenant per week:**
- 1 Firestore read (snapshot) + 1 Gemini call (~$0.001) + 1 Firestore write = ~$0.002/tenant/week

### 3.3 — Daily Stats Cleanup (extends Step 8)

**What:** Delete `canonica_frictionDailyStats` documents older than 90 days.
**Method:** Same pattern as existing signal TTL cleanup in canonicaNightly.
**Batch limit:** 100 docs per tenant per night.

---

## §4 — Friction Score Algorithm

### 4.1 — Per-Entity Daily Score

```typescript
function calculateFrictionScore(stat: {
    queryCount: number;
    escalationCount: number;
    lowConfidenceCount: number;
}): number {
    const escalationRate = stat.queryCount > 0
        ? stat.escalationCount / stat.queryCount
        : 0;
    const lowConfidenceRate = stat.queryCount > 0
        ? stat.lowConfidenceCount / stat.queryCount
        : 0;

    return Math.round(
        stat.queryCount * (1 + escalationRate + lowConfidenceRate) * 100
    ) / 100;
}
```

### 4.2 — Trend Detection

```typescript
function detectTrend(last7d: number, previous7d: number): {
    direction: 'rising' | 'stable' | 'improving' | 'new';
    score: number;
} {
    if (previous7d === 0 && last7d > 0) {
        return { direction: 'new', score: 0 };
    }
    if (previous7d === 0) {
        return { direction: 'stable', score: 1.0 };
    }

    const ratio = last7d / previous7d;

    if (ratio > 1.5) return { direction: 'rising', score: ratio };
    if (ratio < 0.7) return { direction: 'improving', score: ratio };
    return { direction: 'stable', score: ratio };
}
```

### 4.3 — Emerging Topic Detection

```typescript
function isEmergingTopic(last7d: number, previous7d: number): boolean {
    return last7d >= 10 && previous7d < 3;
}
```

### 4.4 — Overall Health Classification

```typescript
function classifyOverallHealth(totalFrictionScore7d: number): 'HIGH' | 'MODERATE' | 'LOW' {
    if (totalFrictionScore7d > 500) return 'HIGH';
    if (totalFrictionScore7d > 100) return 'MODERATE';
    return 'LOW';
}
```

---

## §5 — File Structure

### New Files (6)

```
functions-canonica/src/canonica/frictionAggregation.ts    — Nightly aggregation logic
functions-canonica/src/canonica/frictionInsight.ts         — Weekly Gemini insight generation

src/types/canonica/index.ts                                — Additive types (CanonicaFrictionDailyStat, etc.)
src/database/canonica/frictionStats.ts                     — Frontend DAL for reading friction data
src/hooks/canonica/useFrictionInsights.ts                  — SWR hook for GovernanceHub
src/components/templates/canonica/governance/FrictionTab.tsx — UI tab component
```

### Modified Files (5)

```
src/config/features.ts                                     — Add ENABLE_CANONICA_FRICTION_INTELLIGENCE flag
src/constants/database.ts                                  — Add CANONICA_FRICTION_DAILY_STATS constant
functions-canonica/src/constants/database.ts               — Mirror collection constant
functions-canonica/src/canonica/canonicaNightly.ts          — Add Step 9 + Step 10
firestore.indexes.json                                     — Add 2 composite indexes
```

---

## §6 — Feature Flag

```typescript
// src/config/features.ts

/**
 * Canonica Product Friction Intelligence
 *
 * true: Nightly friction aggregation + weekly AI insight generation active
 * false: No friction stats computed, GovernanceHub friction tab hidden
 *
 * Expansion Item #5 — Converts support signals into product friction insights.
 * Extends existing nightly scheduler (Step 9 + Step 10).
 * 1 new collection: canonica_frictionDailyStats.
 *
 * Requires: ENABLE_CANONICA_SIGNAL_MUTATION = true
 * @see __docs__/canonica/product-friction-intelligence/
 */
ENABLE_CANONICA_FRICTION_INTELLIGENCE: false,
```

---

## §7 — Gemini Prompt (Weekly Insight)

```
You are a product friction analyst for a SaaS company.

Given the following support friction data for the past week, generate a concise weekly friction report.

Data:
{JSON: topFrictionEntities with names, types, counts, trends}
{JSON: emergingTopics}

Generate:
1. A 2-3 paragraph executive summary explaining the top friction areas and what changed
2. For each top entity: a specific suggested action based on entity type
   - "feature" → "Consider improving documentation or UI for this feature"
   - "workflow" → "Evaluate the onboarding flow for this workflow"
   - "integration" → "Review the integration setup guide"
   - "error" → "Investigate error handling and user messaging"
3. List any emerging topics that need attention
4. Overall health assessment: HIGH / MODERATE / LOW

Constraints:
- Keep summaries concise (max 200 words total)
- Use plain language (SaaS founder audience)
- Focus on actionable insights, not statistics
- Do not suggest building analytics dashboards
```

**Prompt version:** `friction_insight_v1`

---

## §8 — UI Component: GovernanceHub Friction Tab

### Data Source
- Primary: `platformSummary/frictionSnapshot_{tId}_{sId}` (nightly snapshot)
- Secondary: `platformSummary/friction_{tId}_{sId}` (weekly AI insight)
- Total reads: 2 Firestore reads per page load

### Component Structure

```tsx
// FrictionTab.tsx

// 1. Health Badge
<FrictionHealthBadge health={snapshot.overallHealth} />

// 2. Top Friction Table
<TopFrictionTable entities={snapshot.topFrictionEntities} />
// Columns: Entity Name | Type | Signals (7d) | Escalation % | Trend | Score

// 3. Emerging Topics (conditional)
{snapshot.emergingTopics.length > 0 && (
    <EmergingTopicsCard topics={snapshot.emergingTopics} />
)}

// 4. Weekly AI Summary (conditional)
{insight && (
    <WeeklyFrictionSummary insight={insight} />
)}

// 5. Last Updated
<LastUpdated timestamp={snapshot.lastUpdated} />
```

### Design Principles
- **No charts** — table + cards only
- **No filters** — show current state only
- **No date pickers** — always last 7 days
- **Color coding:** HIGH = red badge, MODERATE = yellow, LOW = green
- **Trend arrows:** ↑ red, → gray, ↓ green, ★ blue (new)

---

## §9 — Implementation Phases

### Phase 1: Backend Foundation (Day 1-2)
1. Add feature flag + collection constant
2. Add types to `src/types/canonica/index.ts`
3. Implement `frictionAggregation.ts` (nightly Step 9)
4. Wire into `canonicaNightly.ts`
5. Add Firestore indexes
6. Test with existing signal data

### Phase 2: Weekly Insight (Day 3)
1. Implement `frictionInsight.ts` (weekly Step 10)
2. Add Gemini prompt
3. Wire Sunday-only logic into canonicaNightly
4. Test with mock friction data

### Phase 3: Frontend (Day 4-5)
1. Add DAL `src/database/canonica/frictionStats.ts`
2. Add hook `src/hooks/canonica/useFrictionInsights.ts`
3. Build `FrictionTab.tsx` component
4. Wire into GovernanceHub
5. Feature-flag gate the tab visibility

### Phase 4: Validation (Day 5)
1. Type check (`npx tsc --noEmit`)
2. Parity audit against this spec
3. Firebase cost simulation
4. Update expansion tracker

**Total: ~5 days**

---

## §10 — ADRs (Architecture Decision Records)

### ADR-1: Entity Graph as Topic Taxonomy
**Decision:** Use Canonica's entity graph as the topic taxonomy instead of embedding-based clustering.
**Rationale:** Canonica doctrine mandates deterministic over LLM. Entity graph already has 7 types with names, aliases, and relations. Adding separate ML-based topic clustering duplicates the ontology and introduces non-deterministic behavior.
**Trade-off:** Cannot discover topics outside the entity graph. Mitigated by entity candidate system (auto-extraction from KB articles).

### ADR-2: Single New Collection
**Decision:** Only `canonica_frictionDailyStats`. Insights go in existing `platformSummary`.
**Rationale:** Minimizes Firestore footprint. platformSummary is the established pattern for Canonica KPI docs (coverage, branding already use it). No need for separate `frictionInsights` collection when data is 1 doc per tenant.

### ADR-3: Nightly Batch (Not Real-Time)
**Decision:** Nightly aggregation, not real-time processing.
**Rationale:** Industry standard is weekly (Intercom). Nightly gives faster signal. Real-time adds complexity (Cloud Tasks, Pub/Sub) for marginal benefit. Support signals don't require sub-minute latency. Extends existing scheduler — zero new infrastructure.

### ADR-4: No Embedding-Based Clustering
**Decision:** Reject ChatGPT's proposal for vector DB + embedding similarity clustering.
**Rationale:** Canonica already has a deterministic entity search index with tokenized lookup, aliases, and synonyms. The entity graph IS the topic taxonomy. Adding vector similarity would introduce non-deterministic topic grouping that conflicts with Canonica's governance philosophy.

### ADR-5: Workflow Step Failure Deferred
**Decision:** Defer workflow step-level failure detection to v2.
**Rationale:** While procedure steps exist on canonical answers, detecting which step fails requires page context + user session sequencing. This needs `ENABLE_CANONICA_CONTEXT_AWARE` to be active with sufficient data. Insufficient ROI for v1.

### ADR-6: Per-Workspace Only (No Cross-Tenant)
**Decision:** Friction intelligence is scoped to individual tId/sId. No cross-tenant aggregation.
**Rationale:** Cross-tenant intelligence requires privacy review, data anonymization, and consent mechanisms. Adds significant complexity for a future moat feature. Start with per-workspace. Enable cross-tenant later (Option B from ChatGPT).

---

## §11 — Backwards Compatibility

This feature is **fully additive**:
- 1 new collection (empty until feature flag ON)
- 2 new platformSummary doc patterns (written only when flag ON)
- New nightly steps gated by feature flag (skip when OFF)
- New UI tab hidden when flag OFF
- No modifications to existing signal events, mutation proposals, or canonical answers
- No changes to existing nightly steps 1-8

**Safe to deploy with flag OFF.** Zero impact on existing Canonica behavior.

---

## §12 — Edge Cases & Protections

| Edge Case | Protection |
|-----------|------------|
| Tenant has zero signals | Skip aggregation (no docs written) |
| Entity deleted/deprecated | Filter out deprecated entities from friction stats |
| < 5 signals in a week | Skip weekly insight generation (insufficient data) |
| Gemini call fails | Snapshot still written (nightly). Weekly insight skipped with error log. |
| frictionDailyStats grows large | 90-day TTL cleanup (nightly Step 8 extension) |
| Duplicate daily stat doc | Doc ID includes date — idempotent write via set() with merge |
| Entity has 'unresolved' entityId | Filtered out (only resolved entities counted) |
| Nightly scheduler timeout | Friction aggregation runs after all existing steps — graceful skip if timeout |

---

## §13 — Observability

### Logs
- `[Canonica Friction] Aggregation complete for {tId}/{sId}: {entityCount} entities, {totalSignals} signals`
- `[Canonica Friction] Insight generated for {tId}/{sId}: health={health}`
- `[Canonica Friction] Skipped insight for {tId}/{sId}: insufficient data ({signalCount} < 5)`
- `[Canonica Friction] Stats cleanup: {deleted} docs older than 90 days`

### Nightly Result Extension
```typescript
interface CanonicaNightlyResult {
    // ... existing fields ...
    totalFrictionEntities: number;
    totalFrictionSignals: number;
    frictionInsightsGenerated: number;
    frictionStatsCleanedUp: number;
}
```

---

## §14 — Performance Constraints

| Metric | Target |
|--------|--------|
| Nightly aggregation per tenant | < 5 seconds |
| Weekly insight generation per tenant | < 10 seconds (Gemini call) |
| GovernanceHub friction tab load | < 500ms (2 Firestore reads) |
| Daily stats retention | 90 days |
| Max entities per snapshot | 10 (top friction only) |
| Max emerging topics | 5 |
