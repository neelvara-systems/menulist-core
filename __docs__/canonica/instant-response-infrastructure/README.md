# Canonica — Instant Response Infrastructure

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_INSTANT_CACHE`
> **Expansion Tracker:** Item #3
> **Doctrine Compliance:** ✅ Freeze §2 — Performance optimization (additive, no schema changes)

---

## Purpose

Reduce Canonica search latency and Firebase costs by caching resolved canonical answers in Upstash Redis. Canonical answers are deterministic, versioned, and entity-bound — making them ideal cache objects. This system ensures that repeated questions hit Redis (~5ms) instead of Firestore (~50-100ms) or the RAG pipeline (~2-5s).

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
  → Upstash Redis lookup (entity-based cache key, ~5ms)
    → [HIT] Return cached answer immediately
  → Firestore cache lookup (aiSearchHistory — existing, unchanged)
  → Canonical Retrieval (2 Firestore reads)
    → [HIT] Cache result to Redis, return
  → [miss] RAG Fallback (embedding + vector search + Gemini)
  → Save to aiSearchHistory
```

Redis sits as **Layer 0** — before any Firestore read. Only cache misses reach the existing pipeline.

---

## Key Decisions (Cascade — NOT ChatGPT)

### 1. Entity-Based Cache Keys (NOT Intent-Based)

**ChatGPT proposed:** "Intent Engine" with NLP normalization, stopword removal, intent classification.

**Cascade decision:** Use Canonica's existing entity resolution as the cache key foundation. Canonica already resolves queries to `entityId` via deterministic tokenization + search index. An "Intent Engine" is redundant — entities ARE intents in Canonica.

**Cache key format:**
```
canon:{tId}:{sId}:entity:{entityId}:v{answerVersion}:plan:{plan}:role:{role}
```

This leverages existing infrastructure instead of building a parallel system.

### 2. Upstash Redis (Already In Project)

**ChatGPT proposed:** "Redis / Upstash / Cloudflare KV"

**Cascade decision:** Use Upstash — it's already imported, configured, and battle-tested for rate limiting (`src/lib/rateLimit.ts`). Zero new dependencies. Same REST API pattern.

### 3. Cache Canonical Answers Only (NOT RAG Responses)

**ChatGPT proposed:** Cache all final answer payloads.

**Cascade decision:** Only cache canonical answer hits. RAG responses are non-deterministic (LLM output varies), context-dependent, and harder to invalidate. Canonical answers are versioned, deterministic, and entity-bound — perfect cache objects. RAG caching already exists via `aiSearchHistory` in Firestore.

### 4. Version-Based Invalidation (NOT Manual Purge)

Cache keys include `answerVersion`. When an answer is updated, its version increments → new cache key → old entries auto-expire via TTL. No manual invalidation needed.

### 5. No Semantic Caching

**Web research finding:** Semantic caching (returning cached answers for "similar" queries) introduces correctness risks. For authoritative knowledge systems like Canonica, wrong cache hits are worse than cache misses. We use exact entity-match caching only.

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
| Need "Intent Engine" with NLP                | ❌ DISAGREE | Canonica's entity resolution IS the intent layer. Redundant.             |
| Need pre-cache workers from day one          | ❌ DISAGREE | Premature. Cache warms naturally. Adds CF complexity for marginal gain.  |
| Cache RAG responses too                      | ❌ DISAGREE | Non-deterministic. Already cached in aiSearchHistory (Firestore).        |
| Global Intent Library across tenants         | ❌ DISAGREE | Violates tenant isolation. Security risk.                                |
| Semantic caching for similar queries         | ❌ DISAGREE | Correctness risk. Authoritative systems need exact matching.             |
| 8M queries/day scale assumptions             | ⚠️ PARTIAL  | Valid architecture, but premature for v1. Design for it, don't build it. |
| Widget prefetch top 5 answers               | ⚠️ PARTIAL  | Good idea, but adds widget SDK complexity. Defer to post-v1.             |

---

## Scope Boundaries

### IN Scope (v1)
- Upstash Redis cache for canonical answer hits
- Entity-based cache keys with version, plan, role
- TTL-based expiration (24 hours default)
- Version-based automatic invalidation
- Cache hit/miss performance logging
- Feature flag: `ENABLE_CANONICA_INSTANT_CACHE` (default OFF)

### OUT of Scope (Permanently or Deferred)
- ❌ Semantic caching (correctness risk)
- ❌ Pre-cache workers (premature complexity)
- ❌ Global intent library (tenant isolation violation)
- ❌ Widget prefetch (widget SDK complexity)
- ❌ Multi-region Redis (premature scale)
- ❌ RAG response caching in Redis (non-deterministic)
- ❌ Edge compute / CDN (premature)

---

## Firebase Cost Impact

**Before (per canonical hit):** 2 Firestore reads (search index + answer doc)
**After (cache hit):** 0 Firestore reads, 1 Upstash REST call

**Estimated savings at 1,000 queries/day:**
- Cache hit rate ~60-70% (conservative, grows over time)
- Saves ~600-700 Firestore reads/day = ~18,000-21,000 reads/month
- Firestore cost: $0.036/100K reads → saves ~$0.007/month at this scale
- Upstash cost: Free tier (10K commands/day) covers this entirely

**At scale (100K queries/day):**
- Saves ~60,000-70,000 reads/day = ~2M reads/month
- Saves ~$0.72/month Firestore + reduces latency by 50-100ms per cached hit
- Upstash cost: ~$0.60/month (100K commands/day at $0.20/100K)
- **Net savings: ~$0.12/month + massive latency improvement**

The primary value is **latency reduction**, not cost savings. Sub-10ms cache hits vs 50-100ms Firestore reads.

---

## Version History

| Date       | Change                                                     |
| ---------- | ---------------------------------------------------------- |
| 2026-03-09 | Initial documentation — full doc set created from synthesis |
