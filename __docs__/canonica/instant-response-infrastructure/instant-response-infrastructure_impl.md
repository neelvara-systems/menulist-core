# Instant Response Infrastructure — Implementation Blueprint

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_INSTANT_CACHE`
> **Dependencies:** Upstash Redis (already installed: `@upstash/redis`)

---

## §1 — Architecture

### 1.1 — Position in Canonica Pipeline

The instant cache sits as **Stage 2.5** in the existing `coreSearch()` pipeline — after SAFE_MODE check, before the existing Firestore cache lookup.

```
coreSearch() — src/lib/search/searchCore.ts
  Stage 1: SAFE_MODE check
  Stage 2: Image processing
  ★ Stage 2.5: INSTANT CACHE LOOKUP (NEW — Upstash Redis)
  Stage 3: Firestore cache lookup (aiSearchHistory — unchanged)
  Stage 4: Canonical retrieval (deterministic entity matching)
    → On canonical HIT: WRITE TO INSTANT CACHE (NEW)
  Stage 5: RAG fallback (embedding + vector search + Gemini)
  Stage 6: Entity-enriched RAG context
  Stage 7: Search history logging
```

### 1.2 — Data Flow

```
User Query
  ↓
coreSearch() receives query + tId + sId + context
  ↓
[NEW] instantCacheLookup(query, tId, sId, context)
  ↓
  ├── HIT → return cached CachedCanonicalAnswer → skip Stages 3-7
  │         (still write to aiSearchHistory for analytics)
  │
  └── MISS → continue existing pipeline unchanged
              ↓
              Canonical retrieval succeeds?
              ├── YES → instantCacheWrite(entityId, answer, context) → return
              └── NO  → RAG fallback → return (no cache write)
```

---

## §2 — File Structure

### 2.1 — New Files (2 files)

| File                                     | Purpose                         | Lines (est.) |
| ---------------------------------------- | ------------------------------- | ------------ |
| `src/lib/canonica/instantCache.ts`       | Cache read/write/key generation | ~120         |
| `src/lib/canonica/instantCache.types.ts` | Cache payload types             | ~30          |

### 2.2 — Modified Files (2 files)

| File                           | Change                                                       | Impact          |
| ------------------------------ | ------------------------------------------------------------ | --------------- |
| `src/lib/search/searchCore.ts` | Add Stage 2.5 cache lookup + cache write after canonical hit | ~30 lines added |
| `src/config/features.ts`       | Add `ENABLE_CANONICA_INSTANT_CACHE` flag                     | ~15 lines       |

### 2.3 — Unchanged Files (for clarity)

| File                                     | Why Unchanged                                                |
| ---------------------------------------- | ------------------------------------------------------------ |
| `src/lib/canonica/canonicalRetrieval.ts` | Retrieval logic untouched. Cache wraps around it.            |
| `src/lib/canonica/tokenizer.ts`          | Tokenization unchanged. Used indirectly for entity matching. |
| `src/database/aiSearchHistory/index.ts`  | Analytics cache unchanged. Serves different purpose.         |
| `src/database/queryEmbeddings/index.ts`  | Embedding cache unchanged. Only for RAG path.                |
| `src/lib/rateLimit.ts`                   | Rate limiting unchanged. Different Upstash usage.            |
| `src/types/canonica/index.ts`            | No type changes needed. Cache types in own file.             |

---

## §3 — Data Model

### 3.1 — Cache Key Format

```
canon:{tId}:{sId}:e:{topEntityId}:v{answerVersion}:p:{planId|_}:r:{roleId|_}
```

**Examples:**

```
canon:14:15:e:auth_reset_password:v3:p:pro:r:admin
canon:14:15:e:billing_invoice:v1:p:_:r:_
canon:14:15:e:team_invite:v2:p:enterprise:r:_
```

**Key components:**

- `canon:` — Namespace prefix (avoids collision with rate limit keys)
- `{tId}:{sId}` — Tenant + store isolation (MANDATORY)
- `e:{topEntityId}` — Primary matched entity from canonical retrieval
- `v{answerVersion}` — From `answer.productBinding.lastValidatedInVersion`
- `p:{planId|_}` — Plan context (underscore if none)
- `r:{roleId|_}` — Role context (underscore if none)

### 3.2 — Cached Payload (Redis Value)

```typescript
interface CachedCanonicalAnswer {
  // Answer content (identical to what coreSearch returns)
  craftedAnswer: string;
  canonicalAnswerId: string;
  confidence: "high" | "medium";
  answerType: string; // 'explanation' | 'procedure' | 'navigation'
  matchedEntityIds: string[];

  // Procedure data (for guided workflows)
  procedure?: CanonicaProcedure | null;

  // Cache metadata
  cachedAt: number; // Date.now() when cached
  answerVersion: number; // For debugging/monitoring
  topEntityId: string; // The entity this was cached for
  sourceVersions?: { canonical?: number; kb?: number }; // Source-version manifest captured at write time
}
```

### 3.3 — TTL Strategy

| Config      | Value                    | Rationale                                                              |
| ----------- | ------------------------ | ---------------------------------------------------------------------- |
| Default TTL | 86400 seconds (24 hours) | Canonical answers change infrequently. Daily refresh is sufficient.    |
| Max payload | 10KB                     | Canonical answers are structured text. Well within Redis free tier.    |
| Timeout     | 50ms                     | If Redis doesn't respond in 50ms, skip cache and proceed to Firestore. |

### 3.4 — Invalidation

**Primary:** Version-based + source-manifest validation. Cache key includes `answerVersion`, and cache payloads capture `sourceVersions.canonical`. When answer is updated:

1. Answer document gets new version
2. `canonica_cacheVersions/canonical_{tId}_{sId}` increments
3. Next cache hit compares cached source version to current manifest
4. Stale cache entries are bypassed and removed best-effort
5. Old cache key expires naturally via TTL (24h)

**No active purge needed.** The source-version manifest keeps cache reads cheap while avoiding stale support truth.

---

## §4 — Implementation Details

### 4.1 — `src/lib/canonica/instantCache.types.ts`

```typescript
import { CanonicaProcedure } from "@type/canonica";

export interface CachedCanonicalAnswer {
  craftedAnswer: string;
  canonicalAnswerId: string;
  confidence: "high" | "medium";
  answerType: string;
  matchedEntityIds: string[];
  procedure?: CanonicaProcedure | null;
  cachedAt: number;
  answerVersion: number;
  topEntityId: string;
}

export interface InstantCacheConfig {
  ttlSeconds: number;
  timeoutMs: number;
  maxPayloadBytes: number;
}

export const INSTANT_CACHE_DEFAULTS: InstantCacheConfig = {
  ttlSeconds: 86400, // 24 hours
  timeoutMs: 50, // 50ms timeout for Redis calls
  maxPayloadBytes: 10240, // 10KB max payload
};
```

### 4.2 — `src/lib/canonica/instantCache.ts`

```typescript
import { Redis } from "@upstash/redis";
import { FEATURE_FLAGS } from "@config/features";
import { CanonicaCanonicalAnswer } from "@type/canonica";
import {
  CachedCanonicalAnswer,
  INSTANT_CACHE_DEFAULTS,
} from "./instantCache.types";

// Reuse existing Upstash connection pattern from rateLimit.ts
const redis = FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// ═══════════════════════════════════════════════════════════
// CACHE KEY GENERATION
// ═══════════════════════════════════════════════════════════

export function buildCacheKey(
  tId: number,
  sId: number,
  topEntityId: string,
  answerVersion: number,
  planId?: string,
  roleId?: string,
): string {
  const plan = planId || "_";
  const role = roleId || "_";
  return `canon:${tId}:${sId}:e:${topEntityId}:v${answerVersion}:p:${plan}:r:${role}`;
}

// ═══════════════════════════════════════════════════════════
// CACHE READ
// ═══════════════════════════════════════════════════════════

export async function instantCacheLookup(
  tId: number,
  sId: number,
  topEntityId: string,
  answerVersion: number,
  planId?: string,
  roleId?: string,
): Promise<CachedCanonicalAnswer | null> {
  if (!redis || !FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE) return null;

  try {
    const key = buildCacheKey(
      tId,
      sId,
      topEntityId,
      answerVersion,
      planId,
      roleId,
    );

    // Race against timeout
    const result = await Promise.race([
      redis.get<CachedCanonicalAnswer>(key),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), INSTANT_CACHE_DEFAULTS.timeoutMs),
      ),
    ]);

    return result || null;
  } catch {
    // Graceful degradation — cache failure never blocks user
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// CACHE WRITE
// ═══════════════════════════════════════════════════════════

export async function instantCacheWrite(
  tId: number,
  sId: number,
  topEntityId: string,
  answer: CanonicaCanonicalAnswer,
  matchedEntityIds: string[],
  planId?: string,
  roleId?: string,
): Promise<void> {
  if (!redis || !FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE) return;

  // INV-1: Never cache drifted answers
  if (answer.governance.driftFlag) return;

  try {
    const answerVersion = answer.productBinding.lastValidatedInVersion;
    const key = buildCacheKey(
      tId,
      sId,
      topEntityId,
      answerVersion,
      planId,
      roleId,
    );

    const payload: CachedCanonicalAnswer = {
      craftedAnswer:
        answer.content.detailedExplanation || answer.content.structuredSummary,
      canonicalAnswerId: answer.id,
      confidence: "high",
      answerType: answer.answerType || "explanation",
      matchedEntityIds,
      procedure:
        answer.answerType === "procedure"
          ? answer.content.procedure || null
          : null,
      cachedAt: Date.now(),
      answerVersion,
      topEntityId,
    };

    // Check payload size before writing
    const payloadStr = JSON.stringify(payload);
    if (payloadStr.length > INSTANT_CACHE_DEFAULTS.maxPayloadBytes) return;

    // Fire-and-forget — don't await in hot path
    redis
      .set(key, payload, { ex: INSTANT_CACHE_DEFAULTS.ttlSeconds })
      .catch(() => {
        // Silent failure — cache write is best-effort
      });
  } catch {
    // Silent failure
  }
}
```

### 4.3 — Changes to `src/lib/search/searchCore.ts`

**Location:** After Stage 2 (image processing), before Stage 3 (Firestore cache).

```typescript
// ===== STAGE 2.5: INSTANT CACHE (Upstash Redis) =====
// Only for canonical answers — deterministic, versioned, perfect cache objects.
// Feature-flagged: ENABLE_CANONICA_INSTANT_CACHE
if (
  FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE &&
  FEATURE_FLAGS.ENABLE_CANONICA_CANONICAL_ANSWERS
) {
  try {
    const { attemptCanonicalRetrieval } =
      await import("@lib/canonica/canonicalRetrieval");
    const { instantCacheLookup } = await import("@lib/canonica/instantCache");

    // Run lightweight entity resolution to get top entity ID for cache key
    // This reuses existing tokenization + entity matching (no LLM, ~5ms)
    const searchIndex = await (
      await import("@database/canonica/entities")
    ).getEntitySearchIndex(tId, sId);
    if (searchIndex && searchIndex.length > 0) {
      const { canonicaTokenize } = await import("@lib/canonica/tokenizer");
      const queryTokens = canonicaTokenize(searchQuery);

      // Quick entity match (same logic as canonicalRetrieval Layer 1)
      let topEntityId: string | null = null;
      let topScore = 0;
      for (const entry of searchIndex) {
        let score = 0;
        for (const token of queryTokens) {
          if (entry.canonicalName.toLowerCase().includes(token))
            score += entry.weight * 2;
          for (const syn of entry.synonyms) {
            if (syn.toLowerCase().includes(token)) score += entry.weight;
          }
          for (const indexToken of entry.normalizedTokens) {
            if (indexToken === token) score += entry.weight * 1.5;
          }
        }
        if (score > topScore) {
          topScore = score;
          topEntityId = entry.entityId;
        }
      }

      if (topEntityId && topScore >= 2.0) {
        // Attempt cache lookup with current answer version
        const { getLatestRelease } =
          await import("@database/canonica/releases");
        const release = await getLatestRelease(tId, sId);
        const version = release?.versionNormalized || 0;

        const effectivePlan = productContext?.plan;
        const effectiveRole = productContext?.userRole;

        const cached = await instantCacheLookup(
          tId,
          sId,
          topEntityId,
          version,
          effectivePlan,
          effectiveRole,
        );

        if (cached) {
          perfMetrics.total = Date.now() - perfStart;

          // Still save to aiSearchHistory for analytics
          const savedHistory = await addAiSearchHistory({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            craftedAnswer: cached.craftedAnswer,
            references: [],
            canonical: true,
            canonicalAnswerId: cached.canonicalAnswerId,
            matchedEntityIds: cached.matchedEntityIds,
            confidence: cached.confidence,
          });

          await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: "INSTANT_CACHE_HIT",
            data: {
              query: searchQuery,
              totalMs: perfMetrics.total,
              entityId: topEntityId,
              answerId: cached.canonicalAnswerId,
              mountContext,
            },
          });

          return {
            craftedAnswer: cached.craftedAnswer,
            references: [],
            suggestedQuestions: [],
            searchHistoryId: savedHistory?.id,
            canonical: true,
            canonicalAnswerId: cached.canonicalAnswerId,
            confidence: cached.confidence,
            answerType: cached.answerType,
            procedure: cached.procedure || undefined,
            imageProcessed,
          };
        }

        // Log cache miss for monitoring
        await writeLogEntry({
          logFileName: PERF_LOG,
          userId: uId,
          logType: "INSTANT_CACHE_MISS",
          data: { query: searchQuery, entityId: topEntityId, mountContext },
        });
      }
    }
  } catch {
    // Graceful degradation — cache failure never blocks pipeline
  }
}
```

**After canonical retrieval succeeds (Stage 4), add cache write:**

```typescript
// After existing canonical HIT return block (around line 292):
// Write to instant cache for next time
if (
  FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE &&
  canonicalResult.matchedEntityIds.length > 0
) {
  const { instantCacheWrite } = await import("@lib/canonica/instantCache");
  instantCacheWrite(
    tId,
    sId,
    canonicalResult.matchedEntityIds[0],
    answer,
    canonicalResult.matchedEntityIds,
    productContext?.plan,
    productContext?.userRole,
  );
  // Fire-and-forget — no await needed
}
```

### 4.4 — Feature Flag in `src/config/features.ts`

```typescript
/**
 * Canonica Instant Response Cache (Upstash Redis)
 *
 * true: Canonical answer hits cached in Upstash Redis for sub-10ms responses.
 *       Only deterministic canonical answers are cached (not RAG responses).
 *       Cache keys include entity ID + answer version + plan + role.
 *       TTL: 24 hours. Invalidation: automatic via version in key.
 * false: All queries go through full pipeline (existing behavior).
 *
 * Expansion Item #3 — Performance optimization layer.
 * Zero new Firestore collections. Uses existing Upstash Redis (same as rate limiting).
 *
 * Requires: ENABLE_CANONICA_CANONICAL_ANSWERS = true
 * @see __docs__/canonica/instant-response-infrastructure/
 */
ENABLE_CANONICA_INSTANT_CACHE: true,
```

---

## §5 — Performance Expectations

### 5.1 — Latency Targets

| Scenario                        | Current    | With Cache                                |
| ------------------------------- | ---------- | ----------------------------------------- |
| Canonical hit (first time)      | ~100-200ms | ~100-200ms (unchanged, cache populated)   |
| Canonical hit (cached)          | ~100-200ms | ~10-20ms (Redis hit)                      |
| RAG fallback                    | ~3-5s      | ~3-5s (unchanged, not cached)             |
| Cache miss (entity not matched) | N/A        | ~5ms overhead (entity check + Redis miss) |

### 5.2 — Cache Hit Rate Projections

| Week    | Expected Hit Rate | Reason                               |
| ------- | ----------------- | ------------------------------------ |
| Week 1  | 30-40%            | Cache warming, limited coverage      |
| Week 2  | 50-60%            | Common questions cached              |
| Week 4+ | 60-75%            | Steady state, power-law distribution |

### 5.3 — Overhead Analysis

The cache lookup adds a small overhead for cache misses:

- Entity search index read: ~30-50ms (already happens in Stage 4, now pulled earlier)
- Redis lookup: ~5ms
- Total overhead on miss: ~5ms (entity index read is shared with Stage 4)

**Critical optimization:** The entity search index read in Stage 2.5 is the SAME read that Stage 4 would do. If Stage 2.5 runs, Stage 4 can reuse the index. This means cache misses add only ~5ms (Redis call), not 35-55ms.

**Implementation note:** Pass the searchIndex from Stage 2.5 to Stage 4 via a local variable to avoid re-reading.

---

## §6 — Edge Cases

### 6.1 — Entity Matched But No Cached Answer

Normal behavior. Entity match succeeds but Redis has no entry. Falls through to canonical retrieval (Stage 4), which populates the cache for next time.

### 6.2 — Answer Updated Between Cache Write and Read

Cache key includes `answerVersion`, and cache reads validate the canonical source-version manifest before returning. If the answer was edited, archived, marked drifted/review-required, deleted, or no longer belongs to the same tenant/store, the manifest changes and the cache entry is bypassed. Legacy cache entries without `sourceVersions` fall back to direct canonical-answer validation.

### 6.3 — Plan/Role Change Mid-Session

Cache key includes plan and role. Different plan/role → different key → potentially different answer. Correct behavior.

### 6.4 — Redis Down

`instantCacheLookup` catches all errors and returns `null`. Pipeline continues to Stage 3 (Firestore cache) and Stage 4 (canonical retrieval) unchanged.

### 6.5 — High Cardinality Cache Keys

With plan × role × entity × version combinations, key count could grow. At 100 entities × 3 plans × 3 roles × 5 versions = 4,500 keys per tenant. With 100 tenants = 450K keys. At ~2KB average payload = ~900MB. Well within Upstash limits.

### 6.6 — Context-Aware Queries

Context (page, feature, workflow) affects entity matching scores but NOT the cache key. The cache key uses the final resolved `topEntityId`, which already incorporates context boosts. This means context-aware queries naturally benefit from caching as long as they resolve to the same entity.

---

## §7 — Monitoring & Observability

### 7.1 — Performance Log Events

| Log Type              | When                              | Data                                             |
| --------------------- | --------------------------------- | ------------------------------------------------ |
| `INSTANT_CACHE_HIT`   | Redis returns valid cached answer | query, entityId, answerId, totalMs, mountContext |
| `INSTANT_CACHE_MISS`  | Entity matched but no Redis entry | query, entityId, mountContext                    |
| `CACHE_STALE_BYPASS`  | Firestore answer cache exists but source validation fails | query, canonical flag, answerId/reference count |
| `INSTANT_CACHE_WRITE` | New canonical answer cached       | entityId, answerId, answerVersion, key           |
| `INSTANT_CACHE_ERROR` | Redis operation failed            | error message (no PII)                           |

### 7.2 — Upstash Dashboard

Monitor via existing Upstash dashboard (same account as rate limiting):

- Commands/day (should show cache read + write volume)
- Latency p50/p99 (should be <10ms)
- Memory usage (should be <50MB for early stage)

---

## §8 — Build Order

1. Create `src/lib/canonica/instantCache.types.ts` — types
2. Create `src/lib/canonica/instantCache.ts` — cache read/write/key
3. Add feature flag to `src/config/features.ts`
4. Modify `src/lib/search/searchCore.ts` — Stage 2.5 + cache write
5. Run `npx tsc --noEmit` — zero errors
6. Test with flag OFF → verify zero behavior change
7. Test with flag ON → verify cache hit/miss logging

---

## §9 — ADRs (Architecture Decision Records)

### ADR-1: Entity-Based Keys Over Intent-Based Keys

**Decision:** Use resolved `entityId` as primary cache key component.
**Rationale:** Canonica already resolves queries to entities via deterministic tokenization. Building a separate "Intent Engine" would duplicate this logic and introduce divergence risk. Entity resolution IS intent classification in Canonica.

### ADR-2: Cache Canonical Only, Not RAG

**Decision:** Only cache canonical answer hits in Redis.
**Rationale:** Canonical answers are deterministic (same input → same output). RAG responses are non-deterministic (LLM may generate different text). Caching non-deterministic output risks serving stale/inconsistent answers. RAG results already cached in `aiSearchHistory` (Firestore) for analytics purposes.

### ADR-3: No Active Invalidation

**Decision:** Rely on version-in-key + TTL for invalidation. No active purge mechanism.
**Rationale:** Active invalidation requires knowing which cache keys exist for an answer, maintaining entity→key mappings, and coordinating purge across serverless instances. Version-in-key makes old entries automatically irrelevant. TTL ensures eventual cleanup. Max staleness (24h) is acceptable for support content.

### ADR-4: Shared Upstash Instance

**Decision:** Reuse the same Upstash Redis instance as rate limiting.
**Rationale:** Upstash free tier provides 10K commands/day. Cache adds ~2K commands/day at current scale (1K reads + 1K writes). Total ~7K commands/day including rate limiting. Well within free tier. Separate instance would double configuration complexity for zero benefit.

### ADR-5: No Pre-Cache Workers

**Decision:** No background workers to pre-populate cache.
**Rationale:** Pre-cache workers require new Cloud Functions, new scheduling, and tenant enumeration. At current scale (<10 tenants, <1K queries/day), the cache warms naturally within hours. The marginal benefit of pre-caching doesn't justify the infrastructure complexity. Revisit when tenant count exceeds 100.
