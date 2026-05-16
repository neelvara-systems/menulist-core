# Instant Response Infrastructure — Firebase & Cost Analysis

> **Version:** 1.1.0
> **Created:** 2026-03-09
> **Audience:** DevOps, Finance, Developers

---

## §1 — Firestore Operations

This feature uses one tiny Canonica-owned metadata collection, `canonica_cacheVersions`, to validate cached answers without reading every source article or canonical answer document on fresh hits. It reduces Firestore reads by inserting an Upstash Redis cache before the Firestore path and by validating cached rows against a per-store source-version manifest.

### 1.1 — Operations Per Query (Cache HIT)

| Operation | Collection | Type | Count | Cost |
| --------- | ---------- | ---- | ----- | ---- |
| Entity search index read | `canonica_entitySearchIndex` | READ | 1 | $0.00006 |
| Redis cache lookup | N/A (Upstash) | REST | 1 | Free tier |
| Source-version manifest read | `canonica_cacheVersions` | READ | 1 | $0.00006 |
| aiSearchHistory write | `aiSearchHistory` | WRITE | 1 | $0.00018 |
| Performance log write | Log file | WRITE | 1 | $0 (file log) |
| **TOTAL** | | | **4 ops** | **~$0.00030** |

**Compared to current (no cache):**

| Operation | Collection | Type | Count | Cost |
| --------- | ---------- | ---- | ----- | ---- |
| Entity search index read | `canonica_entitySearchIndex` | READ | 1 | $0.00006 |
| Canonical answers read | `canonica_canonicalAnswers` | READ | 1-3 | $0.00006-0.00018 |
| Release version read | `canonica_releases` | READ | 0-1 | $0-0.00006 |
| aiSearchHistory write | `aiSearchHistory` | WRITE | 1 | $0.00018 |
| Performance log write | Log file | WRITE | 1 | $0 |
| **TOTAL** | | | **4-6 ops** | **~$0.00030-0.00048** |

**Savings per cache hit: 1-4 source/retrieval Firestore reads saved.** Older cache rows without `sourceVersions` fall back to direct source-document freshness validation.

### 1.2 — Operations Per Query (Cache MISS)

Same as current pipeline — no additional cost. The entity search index read in Stage 2.5 is reused by Stage 4 (passed via local variable).

| Operation | Collection | Type | Count | Notes |
| --------- | ---------- | ---- | ----- | ----- |
| Entity search index read | `canonica_entitySearchIndex` | READ | 1 | Shared with Stage 4 |
| Redis cache lookup | N/A (Upstash) | REST | 1 | Free tier |
| Redis cache MISS | N/A | - | 0 | No read cost |
| *Then continues existing pipeline unchanged* | | | | |
| Redis cache write (after canonical hit) | N/A (Upstash) | REST | 1 | Fire-and-forget |

**Additional cost on miss: 1 Redis REST call (free tier)**

---

## §2 — Upstash Redis Cost

### 2.1 — Free Tier Coverage

| Metric | Free Tier Limit | Our Usage (est.) | Status |
| ------ | --------------- | ---------------- | ------ |
| Commands/day | 10,000 | ~3,000 (1K cache reads + 1K cache writes + 1K rate limit) | ✅ Within free tier |
| Data size | 256MB | ~5MB (2,500 cached answers × ~2KB each) | ✅ Within free tier |
| Requests/sec | 1,000 | ~1-10 | ✅ Within free tier |

### 2.2 — Scale Projections

| Scale | Queries/day | Cache commands/day | Upstash Cost | Firestore Savings |
| ----- | ----------- | ------------------ | ------------ | ----------------- |
| Current (1 tenant) | ~500 | ~1,500 | **$0** (free tier) | ~$0.003/month |
| 10 tenants | ~5,000 | ~15,000 | **$0.03/month** | ~$0.03/month |
| 100 tenants | ~50,000 | ~150,000 | **$0.30/month** | ~$0.30/month |
| 1,000 tenants | ~500,000 | ~1,500,000 | **$3.00/month** | ~$3.00/month |

**Break-even:** Instant at all scales. Upstash cost ≈ Firestore savings. The real value is **latency reduction**, not cost savings.

---

## §3 — Collections Referenced

| Collection | Read? | Write? | Purpose |
| ---------- | ----- | ------ | ------- |
| `canonica_entitySearchIndex` | ✅ | ❌ | Entity matching for cache key generation |
| `canonica_cacheVersions` | ✅ | ✅ | Per-store KB/canonical source-version manifest for cache freshness |
| `canonica_canonicalAnswers` | ✅ (miss or legacy cache fallback) | ✅ | Answer retrieval on cache miss; writes bump canonical manifest |
| `canonica_releases` | ✅ | ❌ | Version lookup for cache key |
| `aiSearchHistory` | ❌ | ✅ | Analytics write (unchanged from current) |

**No new indexes. No Firestore rules change is required for the server-side search path.**

---

## §4 — DAL Functions Used

| Function | File | Operation | New? |
| -------- | ---- | --------- | ---- |
| `getEntitySearchIndex()` | `src/database/canonica/entities.ts` | Read entity index | Existing |
| `getLatestRelease()` | `src/database/canonica/releases.ts` | Read latest version | Existing |
| `getActiveAnswersForEntity()` | `src/database/canonica/canonicalAnswers.ts` | Read answers (miss only) | Existing |
| `addAiSearchHistory()` | `src/database/aiSearchHistory/index.ts` | Write analytics | Existing |
| `instantCacheLookup()` | `src/lib/canonica/instantCache.ts` | Redis read | **NEW** |
| `instantCacheWrite()` | `src/lib/canonica/instantCache.ts` | Redis write | **NEW** |
| `getCanonicaCacheVersionServer()` | `src/lib/canonica/cacheVersionServer.ts` | Read source-version manifest | **NEW** |
| `bumpCanonicaCacheVersion*()` | `src/lib/canonica/cacheVersionClient.ts`, `src/lib/canonica/cacheVersionAdmin.ts`, `functions-canonica/src/canonica/cacheVersionManifest.ts` | Write source-version manifest | **NEW** |

---

## §5 — Cost Simulation

### Scenario: 1,000 queries/day, 60% cache hit rate

**Without instant cache:**
- 1,000 × 3 reads (avg) = 3,000 Firestore reads/day
- 1,000 × 1 write (aiSearchHistory) = 1,000 writes/day
- Monthly: 90,000 reads + 30,000 writes
- Cost: ~$0.03 reads + ~$0.05 writes = **~$0.08/month**

**With instant cache:**
- 400 misses × 3 reads = 1,200 Firestore reads/day (entity index shared)
- 600 hits × 2 reads = 1,200 Firestore reads/day (entity index + source-version manifest)
- 1,000 × 1 write (aiSearchHistory) = 1,000 writes/day
- Monthly: 72,000 reads + 30,000 writes
- Cost: ~$0.03 reads + ~$0.05 writes = **~$0.08/month**
- Upstash: ~2,000 commands/day = **$0/month** (free tier)

**Net savings: small Firestore reduction + larger provider/retrieval avoidance + latency improvement per cached hit**

### Scenario: 100,000 queries/day, 70% cache hit rate

**Without instant cache:**
- 100,000 × 3 reads = 300,000 reads/day → 9M reads/month
- Cost: ~$3.24/month reads

**With instant cache:**
- 30,000 misses × 3 reads = 90,000 reads/day
- 70,000 hits × 2 reads = 140,000 reads/day
- Monthly: 6.9M reads/month
- Cost: ~$2.48/month reads
- Upstash: ~200,000 commands/day = **~$1.20/month**

**Net impact:** Firestore reads still drop by ~2.1M/month. Upstash can outweigh raw Firestore read savings at high volume, so the business value is provider-call avoidance and latency, not pure Firestore-read arbitrage.

---

## §6 — Environment Variables

No new environment variables required. Uses existing:
- `UPSTASH_REDIS_REST_URL` — Already configured for rate limiting
- `UPSTASH_REDIS_REST_TOKEN` — Already configured for rate limiting

---

## §7 — Firestore Indexes

No new indexes required. Existing indexes for `canonica_entitySearchIndex` (tId + sId) are sufficient.

---

## §8 — Firestore Rules

Server-side search uses Firebase Admin for source-version validation. If direct client access to `canonica_cacheVersions` is needed later, add explicit read/write rules at that time instead of exposing the collection broadly.
