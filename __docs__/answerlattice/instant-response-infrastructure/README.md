# Answerlattice — Instant Response Infrastructure

> **Status:** IMPLEMENTED — Source-Validated Cache
> **Version:** 1.1.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-07-11
> **Feature Flag:** `ENABLE_ANSWERLATTICE_INSTANT_CACHE`
> **Expansion Tracker:** Item #3
> **Doctrine Compliance:** ✅ Freeze §2 — Performance optimization (additive, no schema changes)

---

## Purpose

Reduce Answerlattice search latency and Firebase costs by caching resolved canonical answers in Upstash Redis. Canonical answers are deterministic, versioned, and entity-bound, making them ideal cache objects. Cached answers are treated as performance hints, not source-of-truth records: new cache entries capture the current Answerlattice source-version manifest, and cache hits validate that manifest before returning. Older cache entries without source versions still fall back to direct source-document validation.

---

## Navigation

| Audience           | Document                                           | Purpose                                        |
| ------------------ | -------------------------------------------------- | ---------------------------------------------- |
| **Everyone**       | This README                                        | Architecture overview, key decisions            |
| **CEO/PM**         | `instant-response-infrastructure_spec.md`          | Business requirements, user impact              |
| **Developers**     | `instant-response-infrastructure_impl.md`          | Technical blueprint, file paths, data model     |
| **DevOps/Finance** | `instant-response-infrastructure_firebase.md`      | Every read/write, cost estimates, savings       |
| **Sales/Marketing**| `instant-response-infrastructure_marketing.md`     | Internal pitch, competitive positioning         |
| **Website**        | `instant-response-infrastructure_website.md`       | Public-facing feature description               |
| **Customers**      | `instant-response-infrastructure_helpdoc.md`       | Customer help article                           |
| **Mobile**         | `instant-response-infrastructure_mobile-support.md`| Mobile admission test (4 gates)                 |

---

## Architecture Overview

### Current Pipeline (Without Cache)

```
User Query
  → SAFE_MODE check
  → Cache lookup (aiSearchHistory — Firestore)
  → Canonical Retrieval (2 Firestore reads: search index + answer doc)
  → [miss] RAG Fallback (embedding + vector search + Gemini LLM)
  → Save to aiSearchHistory
```

### New Pipeline (With Instant Cache)

```
User Query
  → SAFE_MODE check
  → Upstash Redis lookup (entity-based cache key)
    → [HIT] Validate canonical source-version manifest
    → [FRESH] Return cached answer
    → [STALE] Delete cache key and continue
  → Firestore cache lookup (aiSearchHistory)
    → [HIT] Validate KB/canonical source-version manifest
    → [STALE] Bypass cache and continue
  → Canonical Retrieval (2 Firestore reads)
    → [HIT] Cache result to Redis, return
  → [miss] RAG Fallback (embedding + vector search + Gemini)
  → Save to aiSearchHistory
```

Redis sits as **Layer 0**. A Redis hit still performs a small freshness check before returning the answer. For new cache entries, this is one tiny `answerlattice_cacheVersions` manifest read instead of a full canonical answer document read. This protects Answerlattice's correctness guarantee when a canonical answer is edited, drifted, archived, or deleted after cache write.

---

## Key Decisions (Cascade — NOT ChatGPT)

### 1. Entity-Based Cache Keys (NOT Intent-Based)

**ChatGPT proposed:** "Intent Engine" with NLP normalization, stopword removal, intent classification.

**Cascade decision:** Use Answerlattice's existing entity resolution as the cache key foundation. Answerlattice already resolves queries to `entityId` via deterministic tokenization + search index. An "Intent Engine" is redundant — entities ARE intents in Answerlattice.

**Cache key format:**
```
canon:v2:{tId}:{sId}:e:{entityId}:v{answerVersion}:p:{plan}:r:{role}:s:{state}
```

This leverages existing infrastructure instead of building a parallel system.

### 2. Upstash Redis (Already In Project)

**ChatGPT proposed:** "Redis / Upstash / Cloudflare KV"

**Cascade decision:** Use Upstash — it's already imported, configured, and battle-tested for rate limiting (`src/lib/rateLimit.ts`). Zero new dependencies. Same REST API pattern.

### 3. Cache Canonical Answers Only (NOT RAG Responses)

**ChatGPT proposed:** Cache all final answer payloads.

**Cascade decision:** Only cache canonical answer hits. RAG responses are non-deterministic (LLM output varies), context-dependent, and harder to invalidate. Canonical answers are versioned, deterministic, and entity-bound — perfect cache objects. RAG caching already exists via `aiSearchHistory` in Firestore.

### 4. Version-Based + Source-Manifest Invalidation

Cache keys include `answerVersion`, and new cache payloads include `sourceVersions.canonical`. Every canonical answer write, governance drift update, and related scheduler mutation increments `answerlattice_cacheVersions/canonical_{tId}_{sId}`. Cache hits compare the cached version to the current manifest before returning. If the manifest changed, the cache entry is bypassed and removed best-effort. This keeps cache correctness independent from manual purge timing while avoiding one full answer-document read per fresh hit.

### 5. No Semantic Caching

**Web research finding:** Semantic caching (returning cached answers for "similar" queries) introduces correctness risks. For authoritative knowledge systems like Answerlattice, wrong cache hits are worse than cache misses. We use exact entity-match caching only.

### 6. No Pre-Cache Workers (v1)

**ChatGPT proposed:** Background workers for activation pre-cache, usage learning, continuous refresh.

**Cascade decision:** Defer. Cache warms naturally from real traffic. Pre-cache adds complexity (new Cloud Functions, new scheduling) with marginal benefit at current scale. The cache fills itself as queries arrive. Revisit when tenant count exceeds 100.

### 7. No Global Intent Library

**ChatGPT proposed:** Cross-tenant shared intent templates.

**Cascade decision:** REJECTED. Violates tenant isolation doctrine. Each tenant's entities, answers, and versions are independent. Cross-tenant data sharing is a security and correctness risk.

---

## What ChatGPT Got Right vs Wrong

| ChatGPT Claim                                | Verdict     | Reasoning                                                                |
| -------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| Support questions are 60-80% repetitive       | ✅ AGREE    | Industry data confirms. Caching addresses this directly.                 |
| Canonical answers are ideal cache objects     | ✅ AGREE    | Versioned, deterministic, entity-bound = perfect for caching.            |
| Firestore in hot path is expensive at scale  | ✅ AGREE    | Valid concern for 8M+ queries/day scenario.                              |
| Version-based invalidation beats purge        | ✅ AGREE    | Clean, automatic, no coordination needed.                                |
| Need Redis/Upstash for hot cache             | ✅ AGREE    | Already have Upstash. Sub-millisecond reads.                             |
| Need "Intent Engine" with NLP                | ❌ DISAGREE | Answerlattice's entity resolution IS the intent layer. Redundant.             |
| Need pre-cache workers from day one          | ❌ DISAGREE | Premature. Cache warms naturally. Adds CF complexity for marginal gain.  |
| Cache RAG responses too                      | ❌ DISAGREE | Non-deterministic. Already cached in aiSearchHistory (Firestore).        |
| Global Intent Library across tenants         | ❌ DISAGREE | Violates tenant isolation. Security risk.                                |
| Semantic caching for similar queries         | ❌ DISAGREE | Correctness risk. Authoritative systems need exact matching.             |
| 8M queries/day scale assumptions             | ⚠️ PARTIAL  | Valid architecture, but premature for v1. Design for it, don't build it. |
| Widget prefetch top 5 answers               | ⚠️ PARTIAL  | Good idea, but adds widget runtime complexity. Defer to post-v1.         |

---

## Scope Boundaries

### IN Scope (v1)
- Upstash Redis cache for canonical answer hits
- Entity-based cache keys with version, plan, role
- TTL-based expiration (24 hours default)
- Version-based automatic invalidation
- Source freshness validation before serving cached canonical/RAG answers
- Cache hit/miss performance logging
- Feature flag: `ENABLE_ANSWERLATTICE_INSTANT_CACHE` (ready-to-use default ON; no-op when Upstash env is missing)

### OUT of Scope (Permanently or Deferred)
- ❌ Semantic caching (correctness risk)
- ❌ Pre-cache workers (premature complexity)
- ❌ Global intent library (tenant isolation violation)
- ❌ Widget prefetch (widget runtime complexity)
- ❌ Multi-region Redis (premature scale)
- ❌ RAG response caching in Redis (non-deterministic)
- ❌ Edge compute / CDN (premature)

---

## Firebase Cost Impact

**Before (per canonical hit):** 2 Firestore reads (search index + answer doc)
**After (fresh Redis cache hit):** 1 tiny source-version manifest read, 1 Upstash REST call

**Estimated savings at 1,000 queries/day:**
- Cache hit rate ~60-70% (conservative, grows over time)
- Saves the full retrieval/RAG pipeline on safe repeats while keeping one manifest freshness read
- Firestore cost benefit is better than direct source-document validation because fresh hits do not read full canonical answer documents
- Upstash cost: Free tier (10K commands/day) covers this entirely

The primary value is **avoiding provider calls and multi-stage retrieval work** while reducing freshness validation to a small manifest read. Answerlattice should still prefer a cheap validation read over the risk of serving stale support truth.

---

## Version History

| Date       | Change                                                     |
| ---------- | ---------------------------------------------------------- |
| 2026-03-09 | Initial documentation — full doc set created from synthesis |
| 2026-05-16 | Added source freshness validation for Redis and Firestore answer caches |
| 2026-05-16 | Switched fresh cache validation to Answerlattice source-version manifests |
