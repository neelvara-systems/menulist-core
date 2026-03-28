# Instant Response Infrastructure — Spec

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Audience:** CEO, PM, Clients
> **Feature Flag:** `ENABLE_CANONICA_INSTANT_CACHE`

---

## §1 — Problem Statement

Canonica's canonical retrieval path currently requires 2 Firestore reads per query (entity search index + answer document). While fast (~50-100ms), this creates:

1. **Unnecessary Firestore costs** — Repeated identical questions re-read the same documents
2. **Latency floor** — Even cached Firestore reads have network overhead on Vercel serverless
3. **Scale concern** — At 100K+ queries/day, Firestore reads become a measurable cost line

Industry data shows 60-80% of support queries are repeated questions. Caching resolved canonical answers eliminates redundant computation for the majority of traffic.

---

## §2 — Solution

Add an Upstash Redis cache layer that stores fully-resolved canonical answers. When a user asks a question that matches a previously-answered canonical entity, the cached answer is returned in ~5ms — bypassing Firestore entirely.

**Key principle:** Cache the final answer, not intermediate computation. The cached payload is the exact same response the user would get from a fresh canonical retrieval.

---

## §3 — User Stories

### US-1: End User Gets Instant Answer
**As** an end user asking a common question via the help widget,
**I want** to receive the answer instantly,
**So that** I can resolve my issue without waiting.

**Acceptance:** Answer appears in <100ms for cached questions (vs ~200-500ms today for canonical path, ~3-5s for RAG path).

### US-2: Founder Sees Reduced Costs
**As** a SaaS founder using Canonica,
**I want** repeated queries to not consume additional Firestore reads,
**So that** my support infrastructure costs stay predictable.

**Acceptance:** Cache hit rate ≥60% after 1 week of traffic.

### US-3: System Handles Traffic Spikes
**As** a platform operator,
**I want** the cache to absorb traffic spikes,
**So that** Firestore is not overwhelmed during peak hours.

**Acceptance:** Cache serves answers independently of Firestore availability.

---

## §4 — Behavior Specification

### 4.1 — Cache Lifecycle

1. **First query for an entity:** Cache MISS → Canonical retrieval runs normally → Answer cached in Redis with entity-based key
2. **Subsequent identical queries:** Cache HIT → Redis returns answer in ~5ms → Firestore untouched
3. **Answer updated by founder:** Answer version increments → New cache key → Old entry expires via TTL
4. **Entity deprecated:** Cached answers for deprecated entities not actively purged — TTL handles natural expiry (24h max staleness)

### 4.2 — Cache Key Design

Cache key encodes all factors that affect answer selection:

```
canon:{tId}:{sId}:entity:{topEntityId}:v{answerVersion}:p:{planId}:r:{roleId}
```

**Why these components:**
- `tId` + `sId` — Tenant isolation (MANDATORY)
- `topEntityId` — The primary matched entity (deterministic from tokenization)
- `answerVersion` — Ensures stale answers auto-invalidate
- `planId` + `roleId` — Same entity may have different answers per plan/role (specificity scoring)

### 4.3 — What Gets Cached

Only **canonical answer hits** are cached. Specifically:

| Cached | Not Cached |
| ------ | ---------- |
| Canonical retrieval hits (deterministic, versioned) | RAG fallback responses (non-deterministic, LLM-generated) |
| High + Medium confidence matches | Low confidence matches |
| Active answers | Drifted answers (`governance.driftFlag === true`) |

**Cached payload:**
```typescript
{
  craftedAnswer: string;      // The answer text
  canonicalAnswerId: string;  // For analytics linkage
  confidence: string;         // 'high' | 'medium'
  answerType: string;         // 'explanation' | 'procedure' | 'navigation'
  procedure?: object;         // Guided workflow steps (if procedure type)
  matchedEntityIds: string[]; // For debugging
  cachedAt: number;           // Timestamp for TTL verification
  answerVersion: number;      // For invalidation tracking
}
```

### 4.4 — Cache Configuration

| Parameter | Value | Rationale |
| --------- | ----- | --------- |
| TTL | 24 hours | Balance between freshness and hit rate. Answers change infrequently. |
| Max payload size | 10KB | Canonical answers are structured text, typically 1-3KB |
| Cache scope | Per-tenant, per-store | Matches all Canonica data isolation |
| Invalidation | Automatic via version in key | No manual purge needed |

### 4.5 — Graceful Degradation

- **Redis unavailable:** Fall through to existing pipeline silently. No error to user.
- **Redis timeout (>50ms):** Abandon cache lookup, proceed to Firestore path.
- **Corrupted cache entry:** Discard, proceed to Firestore path, log warning.
- **Feature flag OFF:** Cache layer completely bypassed. Zero behavior change.

---

## §5 — What This Feature Does NOT Do

1. **Does NOT cache RAG responses** — Non-deterministic LLM output should not be cached in Redis
2. **Does NOT replace aiSearchHistory** — That Firestore collection serves analytics/feedback, not performance
3. **Does NOT add new Cloud Functions** — All caching happens in the existing `coreSearch()` pipeline
4. **Does NOT require new Firestore collections** — Zero new documents
5. **Does NOT change the canonical retrieval algorithm** — Same entity matching, same specificity scoring
6. **Does NOT do semantic/fuzzy caching** — Only exact entity-match cache keys

---

## §6 — Success Metrics

| Metric | Target | Measurement |
| ------ | ------ | ----------- |
| Cache hit rate (after 1 week) | ≥60% | Performance logs: `INSTANT_CACHE_HIT` vs `INSTANT_CACHE_MISS` |
| Canonical answer latency (p50) | <20ms (cache hit) | Performance logs: `totalMs` field |
| Canonical answer latency (p50, miss) | <150ms (unchanged) | Performance logs: existing `CANONICAL_HIT` |
| RAG latency | Unchanged | Not affected by this feature |
| Firestore reads saved | ≥40% reduction for canonical path | Before/after comparison |
| Error rate from cache | <0.1% | Warning logs: `INSTANT_CACHE_ERROR` |

---

## §7 — Rollout Plan

1. **Flag OFF** (default) — Zero behavior change, zero risk
2. **Enable for MenuList tenant only** — Monitor cache hit rate, latency, correctness
3. **Enable for all tenants** — After 1 week of clean MenuList data
4. **Monitor for 30 days** — Track hit rate, cost, latency before considering feature stable

---

## §8 — Invariants

- **INV-1:** Cache NEVER returns a drifted answer (`governance.driftFlag === true`)
- **INV-2:** Cache NEVER crosses tenant boundaries (tId + sId always in key)
- **INV-3:** Cache failure NEVER blocks the user — always falls through to existing pipeline
- **INV-4:** Cache does NOT affect analytics — `aiSearchHistory` still written for all queries
- **INV-5:** Answers served from cache are byte-identical to fresh canonical retrieval results
