# Client Menu (Customer-Facing Digital Menu) — Firebase Cost Tracking

**Feature:** Client Menu — QR code digital menu for restaurant customers  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** HIGHEST — This is the most trafficked feature. Every customer scan = Firebase reads.

---

## Summary

- **Collections Used:** `stores`, `projects` (data + metadata), `decisionBlocks`, `analytics`
- **Storage Buckets:** None (reads only from customer side; images served via CDN URLs)
- **Cloud Functions:** `decisionBlocksScoring` (precomputes blocks on schedule)
- **Estimated Monthly Cost:** **Medium-High** — scales linearly with customer traffic

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Store lookup (subdomain) | `stores` | Page load (SSR) | Per unique visit (cached 60s) | 1 | Yes (`subdomain` + `active`) | `getDocs` with `where("subdomain", "==", ...)`, `limit(1)`. Cached via `unstable_cache` with 60s revalidate. File: `src/app/client/[[...slug]]/page.tsx:83-100` |
| Store lookup (custom domain) | `stores` | Page load (SSR) | Per unique visit (cached 60s) | 1 | Yes (`customDomain` + `domainVerified` + `active`) | Same pattern as subdomain. File: `src/app/client/[[...slug]]/page.tsx:104-122` |
| Project metadata listing | `projects/{tId}/{sId}/metadata` | Page load (SSR) | Per unique visit (cached 60s) | 1-50 | Yes (`deleted` + `active`) | `getDocs` with `where("deleted", "==", false)`, `where("active", "==", true)`. Returns all active projects for slug matching. File: `src/app/client/[[...slug]]/page.tsx:157-172` |
| Project data fetch | `projects/{tId}/{sId}/{projectId}` | Page load (SSR) | Per unique visit (cached 60s) | 1 | Direct doc read | `getDoc` by ID. Heavy document (~50KB with full menu data). File: `src/app/client/[[...slug]]/page.tsx:125-135` |
| Decision Blocks fetch | `decisionBlocks` | Page load (SSR) | Per unique visit (cached 60s) | 1 | Direct doc read | `getDoc` by composite ID `{tId}_{sId}_{projectId}`. Optional — fails silently. File: `src/app/client/[[...slug]]/page.tsx:138-154` |
| Store details (full) | `stores` | Page load (SSR) | Per unique visit (cached 60s) | 1 | Direct doc read via `getStoreById` | Parallel with decision blocks. File: `src/app/client/[[...slug]]/page.tsx:613-617` |
| Master project (multi-outlet) | `projects/{tId}/{sId}/{masterProjectId}` | Page load (SSR) | Only for outlet stores | 1 | Direct doc read | Only when `ENABLE_MULTI_OUTLET && projectData.masterProjectId`. File: `src/app/client/[[...slug]]/page.tsx:216-229` |
| SEO metadata (generateMetadata) | `stores` | Page load (SSR) | Per unique visit (cached 60s) | 1 | Same as store lookup | Duplicate read deduplicated by React `cache()`. File: `src/app/client/[[...slug]]/page.tsx:303-360` |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Analytics event tracking | `analytics` | Customer interactions | Per menu view, item click, search | 1 | Merge update | Daily aggregated doc `{tId}_{sId}_{projectId}_daily_{date}`. Uses increment operations. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| None | — | — | — | — | — | Customer-facing menu never deletes data |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Image reads (CDN) | Various — served via URL in project data | Customer viewing menu | 0 (CDN) | Images are URLs stored in Firestore, served by CDN. No direct Storage reads from client page. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `decisionBlocksScoring` | Scheduled (daily) | 1x/day per active project | 10-30s | 256MB | Precomputes popular/quickPick/bestValue blocks. Results cached in `decisionBlocks` collection. |

---

## Security Rules Impact

- Store documents: public read for active stores (no auth required for customer menu)
- Project documents: public read for active, non-deleted projects (filtered server-side)
- Decision blocks: public read (precomputed, no sensitive data)
- Analytics: write-only from client (no read access for customers)
- `sanitizeForClient()` strips internal metadata before sending to browser (line 237-300)

---

## Cost Optimization Notes

### Current Optimizations
- **Vercel Data Cache** (`unstable_cache`): 60s TTL on all reads — same store/project served from cache for 60s
- **React `cache()`**: Within-request deduplication — generateMetadata + page render share same store lookup
- **Parallel reads**: `Promise.all([storeDetails, decisionBlocks])` — concurrent, not sequential
- **`withTimeout(5s)`**: Prevents infinite SSR hangs on Firestore failures
- **`withRetry(1)`**: One retry with 1s delay handles transient failures
- **Per-store cache tags**: `menu-store-${sId}` enables precise invalidation on owner save

### Potential Optimizations
- **Increase cache TTL**: 60s → 300s for low-change menus (trade-off: stale data for 5 min)
- **Edge caching**: Vercel Edge Middleware could cache entire HTML for ultra-low latency
- **Summary document**: If project count per store is always <10, skip metadata query and use summary doc

### Warnings: Expensive Patterns
- **Multi-outlet resolution**: Adds +1 read per page load for outlet stores (reads master project)
- **Metadata listing**: Reads ALL active projects, even though only 1 is used. If a store has 50 projects, that's 50 doc reads per cache miss
- **Heavy project docs**: ~50KB per project doc. Firestore charges per document, not per byte, but large docs increase transfer time

---

## Cost Estimate (per 1000 active stores, 100 scans/store/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads (store lookup) | 100,000 ÷ cache factor (~10x) = 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (metadata) | 10,000 × avg 5 docs = 50,000 | $0.06/100K | $0.03 |
| Firestore Reads (project data) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (decision blocks) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (store details) | 10,000 | $0.06/100K | $0.01 |
| Firestore Writes (analytics) | 100,000 (1 per scan) | $0.18/100K | $0.18 |
| Cloud Functions (scoring) | 1,000 (1/day × 1000 stores) | $0.40/million | $0.00 |
| **Total** | | | **~$0.25/month** |

> **Note:** Cost scales linearly with traffic. At 10x traffic (1000 scans/store), cost ≈ $2.50/month. Cache factor significantly reduces actual Firestore reads.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getStoreBySubdomain` | `src/app/client/[[...slug]]/page.tsx:83` | Read (cached query) |
| `getStoreByCustomDomain` | `src/app/client/[[...slug]]/page.tsx:104` | Read (cached query) |
| `getProjectData` | `src/app/client/[[...slug]]/page.tsx:125` | Read (getDoc) |
| `getPrecomputedDecisionBlocks` | `src/app/client/[[...slug]]/page.tsx:138` | Read (getDoc) |
| `getProjectBySlugOrDefault` | `src/app/client/[[...slug]]/page.tsx:157` | Read (getDocs + getDoc) |
| `getStoreById` | `src/database/stores/index.ts` | Read (getDoc) |
| `resolveProjectForRender` | `src/lib/multiOutlet/index.ts` | Read (getDoc for master) |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| `/client/[[...slug]]` (SSR) | GET | 4-6R + 0-1W | No (public) | Server-rendered page. Reads cached. Analytics write on client. |
| `/client/sitemap.ts` | GET | 1-2R | No (public) | Reads store + projects for sitemap XML |
| `/client/robots.ts` | GET | 0R | No (public) | Static response, no Firestore |
