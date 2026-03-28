# System Strengthening — Firebase Cost Tracking

**Feature:** Infrastructure Hardening & Performance Optimization  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** LOW — Infrastructure improvements that reduce Firebase costs, not increase them.

---

## Summary

System Strengthening is primarily about reducing costs and improving reliability, not adding Firebase operations. Most improvements reduce Firestore reads through caching, deduplication, and parallel execution.

- **Collections Used:** Existing collections (no new ones)
- **Storage Buckets:** None
- **Cloud Functions:** None new
- **Estimated Monthly Cost:** **Negative** — These optimizations save money

---

## Optimizations & Their Firebase Cost Impact

### Vercel Data Cache (`unstable_cache`)
- **Impact:** Reduces Firestore reads by ~10x for customer menu
- **Savings:** At 100K scans/month, saves ~90,000 reads = ~$0.05/month

### React `cache()` (Request Deduplication)
- **Impact:** Within-request dedup. generateMetadata + page render share store lookup
- **Savings:** Eliminates ~50% of duplicate reads per request

### Parallel Reads (`Promise.all`)
- **Impact:** No cost reduction, but latency improvement
- **Savings:** $0 (same number of reads, just faster)

### `withTimeout(5s)`
- **Impact:** Prevents SSR hangs. No cost reduction.
- **Savings:** Prevents wasted server time on stuck requests

### `withRetry(1)`
- **Impact:** Adds 1 retry on transient failures. Slight cost increase on failures.
- **Cost:** ~1% extra reads (only on failures)

### Per-Store Cache Tags
- **Impact:** `revalidateTag(menu-store-${sId})` enables precise cache invalidation
- **Savings:** Only the changed store's cache is cleared, not all stores

### Summary Document Pattern
- **Impact:** `platformSummary/projects_{sId}` — 1 read for all projects listing instead of N reads
- **Savings:** At 10 projects/store, saves 9 reads per listing

### Soft Delete Pattern
- **Impact:** `deleted: true` instead of doc deletion. No cost difference.
- **Cost:** $0 difference

---

## Net Cost Impact

**Net savings: ~$0.10-1.00/month** per 1000 active stores, depending on traffic. System strengthening is a cost reducer, not a cost adder.
