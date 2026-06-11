# Client Menu (Customer-Facing Digital Menu) — Firebase Cost Tracking

**Feature:** Client Menu — QR code digital menu for restaurant customers  
**Status:** ✅ Production Ready  
**Last Updated:** June 11, 2026
**Priority:** HIGHEST — This is the most trafficked feature. Every customer scan = Firebase reads.

---

## Summary

- **Collections Used:** `stores`, `platformSummary`, `projects`, `analytics`
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
| Project summary lookup | `platformSummary/projects_{sId}` | Page load (SSR) | Per unique menu cache miss (cached 60s) | 1 | Direct doc read | `getProjectBySlugOrDefault()` reads the store summary packet for slug/default/previousSlug routing. File: `src/app/client/[[...slug]]/page.tsx:202-244` |
| Project data fetch | `projects/{tId}/{sId}/{projectId}` | Page load (SSR) | Per unique menu cache miss (cached 60s) | 1 | Direct doc read | `getProjectData()` reads the resolved project by immutable ID. File: `src/app/client/[[...slug]]/page.tsx:138-149` |
| Embedded Decision Blocks | `projects/{tId}/{sId}/{projectId}` | Page load (SSR) | 0 extra reads | N/A | N/A | Public decision blocks are read from `projectData.publicDecisionBlocks` after the project doc is loaded. File: `src/app/client/[[...slug]]/page.tsx:185-193` |
| Store details (full) | `stores` | Page load (SSR) | 0 extra reads after host lookup | N/A | N/A | Menu rendering reuses the store object returned by the subdomain/custom-domain lookup instead of calling `getStoreById()`. File: `src/app/client/[[...slug]]/page.tsx:1684-1686` |
| Outlet lookup | `stores` | Multi-outlet project or outlet path | Only when first slug may be an outlet | 0-1 | Yes (`tenantId` + `outletSlug` / `previousOutletSlugs` + `active`) | `getStoreByOutletSlug()` is cached and only runs for master stores when `ENABLE_MULTI_OUTLET` is on. File: `src/app/client/[[...slug]]/page.tsx:1614-1644` |
| Master project (multi-outlet) | `projects/{tId}/{sId}/{masterProjectId}` | Page load (SSR) | Only for outlet projects linked to a master project | 1 | Direct doc read | Required to merge master truth with outlet overrides before public render. File: `src/app/client/[[...slug]]/page.tsx:312-333` |
| Active special menu project | `projects/{tId}/{sId}/{activeSpecialMenuId}` | Store has active special menu | Only when `activeSpecialMenuId` exists | 1 | Direct doc read | Zero extra reads for normal menus; active special menus replace or overlay the base project. File: `src/app/client/[[...slug]]/page.tsx:356-420` |
| SEO metadata / viewport store lookup | `stores` | Metadata and viewport generation | Per unique cache miss | 0-1 | Same cached helper as page render | Uses shared `getStoreBySubdomain()` / `getStoreByCustomDomain()` helpers with `unstable_cache` and `client-stores` tag. File: `src/lib/firestore/clientStoreLookup.ts:45-116` |

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
- Decision blocks: embedded in the public project payload (`publicDecisionBlocks`), no separate public read
- Analytics: write-only from client (no read access for customers)
- `sanitizeForClient()` strips internal metadata before sending to browser (line 237-300)

---

## Cost Optimization Notes

### Current Optimizations
- **Vercel Data Cache** (`unstable_cache`): 60s TTL on all reads — same store/project served from cache for 60s
- **React `cache()`**: Within-request deduplication — generateMetadata + page render share same store lookup
- **`withTimeout(5s)`**: Prevents infinite SSR hangs on Firestore failures
- **`withRetry(1)`**: One retry with 1s delay handles transient failures
- **Per-store cache tags**: `menu-store-${sId}` enables precise invalidation on owner save
- **Shared store lookup helpers**: OBP/menu/compliance share cached `getStoreBySubdomain()` and `getStoreByCustomDomain()` under the `client-stores` tag.
- **Summary-first slug routing**: `platformSummary/projects_{storeId}` replaces the old metadata subcollection scan for project slug/default resolution.
- **Embedded decision blocks**: Public menu recommendation blocks come from the loaded project doc; the menu path no longer performs a separate decision-block document read.
- **Validated cache revalidation**: `/api/revalidate/menu` accepts only primitive `storeId` values or bounded valid tag arrays before calling `revalidateTag()`, and authenticated app callers can revalidate only stores present in their session unless they are platform admins.
- **Special note rendering is payload-only**: Public menus resolve special notes from the already-fetched project/store payload (`menuSettings.specialNote`, legacy project note fields, then `publicPresence.specialNote`). This adds no Firestore reads or writes.
- **PDP item sharing is no-write**: Public item sharing uses the Web Share API or clipboard fallback from the already-open PDP URL. Its generic `share` analytics event is GA4-only and does not add Firestore analytics writes.

### Potential Optimizations
- **Increase cache TTL**: 60s → 300s for low-change menus (trade-off: stale data for 5 min)
- **Edge caching**: Vercel Edge Middleware could cache entire HTML for ultra-low latency
- **Tenant block denormalization**: Store lookup currently verifies inherited tenant block state. If tenant block state is fully denormalized onto store docs, public store-cache misses can avoid the extra tenant check without weakening safety.

### Warnings: Expensive Patterns
- **Multi-outlet resolution**: Adds +1 read per page load for outlet stores (reads master project)
- **Heavy project docs**: ~50KB per project doc. Firestore charges per document, not per byte, but large docs increase transfer time
- **Tenant block enforcement**: Inherited tenant-block checks protect public truth but can add a tenant-doc read on store-cache misses.

---

## Cost Estimate (per 1000 active stores, 100 scans/store/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads (store lookup) | 100,000 ÷ cache factor (~10x) = 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (project summary) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (project data) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (decision blocks) | 0 extra reads | $0.06/100K | $0.00 |
| Firestore Reads (store details) | 0 extra reads after host lookup | $0.06/100K | $0.00 |
| Firestore Writes (analytics) | Up to 100,000 sessions before queue coalescing | $0.18/100K | <= $0.18 |
| Cloud Functions (scoring) | 1,000 (1/day × 1000 stores) | $0.40/million | $0.00 |
| **Total** | | | **~$0.25/month** |

> **Note:** Cost scales linearly with traffic. At 10x traffic (1000 scans/store), cost ≈ $2.50/month. Cache factor significantly reduces actual Firestore reads.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getStoreBySubdomain` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached query) |
| `getStoreByCustomDomain` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached query) |
| `getStoreByOutletSlug` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached query, multi-outlet only) |
| `getProjectData` | `src/app/client/[[...slug]]/page.tsx` | Read (direct project doc by immutable ID) |
| `getProjectBySlugOrDefault` | `src/app/client/[[...slug]]/page.tsx` | Read (`platformSummary/projects_{storeId}` + resolved project doc) |
| `resolveProjectForRender` | `src/lib/multiOutlet/index.ts` | Read (getDoc for master) |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| `/client/[[...slug]]` (SSR) | GET | 3-5 cached reads on menu path; fewer on OBP root; +1 when outlet/master/special-menu branches apply | No (public) | Server-rendered page. Reads are cached and invalidated by store/project tags. Analytics writes happen from client tracking only. |
| `/client/sitemap.ts` | GET | 2+ cached reads depending on outlet/project count | No (public) | Reads store seed, project summaries, and outlet summaries. Weak, blocked, starter, or incomplete records stay out of sitemap. |
| `/client/robots.ts` | GET | 0R | No (public) | Static response, no Firestore |
| `/api/revalidate/menu` | POST | 0 Firestore reads/writes | Yes for app callers; secret for server callers | Validates `storeId`/tags, checks authenticated store access for app callers, revalidates `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and `screen-data`, and clears owner-business-assistant packet cache. |
